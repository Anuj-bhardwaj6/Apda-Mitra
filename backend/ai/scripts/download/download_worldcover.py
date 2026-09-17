"""
ESA WorldCover 2021 Land Cover Downloader
==========================================
Downloads ESA WorldCover 10m classification tiles for NER India from the
public AWS S3 bucket (no authentication required).

Each tile is a GeoTIFF with pixel values 0–95 representing land cover classes:
  10 = Tree cover          20 = Shrubland         30 = Grassland
  40 = Cropland            50 = Built-up           60 = Bare/sparse vegetation
  70 = Snow/Ice            80 = Permanent water    90 = Herbaceous wetland
  95 = Mangroves           100 = Moss/lichen

NDVI proxy is derived from tree cover (class 10) density per tile.

Tile naming convention (3°×3° tiles):
  ESA_WorldCover_10m_2021_v200_N21E087_Map.tif

Output:
    datasets/raw/worldcover_ner/        — individual GeoTIFF tiles
    datasets/metadata/worldcover_schema.json
"""

from __future__ import annotations

import json
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
import requests
from tqdm import tqdm

import sys
sys.path.insert(0, str(Path(__file__).parents[3]))

from ai.config import ESA_WORLDCOVER_BASE_URL, METADATA_DIR, NER_BBOX, RAW_DIR
from ai.logger import PipelineLogger

log = PipelineLogger("download.worldcover")

WC_DIR = RAW_DIR / "worldcover_ner"
MAX_RETRIES = 3

# WorldCover tiles are 3°×3°. For NER bbox [87.5, 20.0, 97.5, 29.5]
# Tile origins (SW corner) at 3° intervals:
def _get_ner_tile_names() -> list[str]:
    """Generates ESA WorldCover tile names covering NER bounding box."""
    min_lon, min_lat, max_lon, max_lat = NER_BBOX
    tiles = []
    for lat in range(int(min_lat) - (int(min_lat) % 3), int(max_lat) + 3, 3):
        for lon in range(int(min_lon) - (int(min_lon) % 3), int(max_lon) + 3, 3):
            lat_str = f"N{lat:02d}" if lat >= 0 else f"S{abs(lat):02d}"
            lon_str = f"E{lon:03d}" if lon >= 0 else f"W{abs(lon):03d}"
            tiles.append(f"{lat_str}{lon_str}")
    return tiles


WORLDCOVER_CLASSES = {
    10: "Tree cover",
    20: "Shrubland",
    30: "Grassland",
    40: "Cropland",
    50: "Built-up",
    60: "Bare/sparse vegetation",
    70: "Snow/Ice",
    80: "Permanent water bodies",
    90: "Herbaceous wetland",
    95: "Mangroves",
    100: "Moss and lichen",
}


def _download_tile(tile_name: str, dest_path: Path) -> bool:
    """Downloads a single ESA WorldCover tile from AWS S3."""
    filename = f"ESA_WorldCover_10m_2021_v200_{tile_name}_Map.tif"
    url = f"{ESA_WORLDCOVER_BASE_URL}/{filename}"

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.get(url, timeout=180, stream=True)
            if resp.status_code == 404:
                return False  # Tile doesn't exist (ocean, etc.)
            resp.raise_for_status()

            total = int(resp.headers.get("content-length", 0))
            with open(dest_path, "wb") as f:
                for chunk in resp.iter_content(chunk_size=65536):
                    f.write(chunk)
            return True

        except requests.RequestException as exc:
            log.warning("WorldCover tile download failed", tile=tile_name, attempt=attempt, error=str(exc))
            if attempt == MAX_RETRIES:
                return False
            time.sleep(2 * attempt)
    return False


def extract_land_cover_at_points(
    points_df: pd.DataFrame,
    lat_col: str = "latitude",
    lon_col: str = "longitude",
) -> pd.DataFrame:
    """
    Extracts ESA WorldCover land cover class and NDVI proxy for each lat/lon.

    Args:
        points_df: DataFrame with lat/lon columns
        lat_col, lon_col: Column names

    Returns:
        DataFrame with added columns: land_cover_class, ndvi_proxy
    """
    try:
        import rasterio
    except ImportError:
        log.error("rasterio not installed — cannot extract land cover")
        points_df["land_cover_class"] = 40  # Default: cropland
        points_df["ndvi_proxy"] = 0.3
        return points_df

    results: list[dict] = []

    tile_cache: dict[str, Optional[object]] = {}

    for _, row in points_df.iterrows():
        lat = float(row[lat_col])
        lon = float(row[lon_col])

        # Determine which 3°×3° tile this point falls in
        tile_lat = (int(lat) // 3) * 3
        tile_lon = (int(lon) // 3) * 3
        lat_str = f"N{tile_lat:02d}" if tile_lat >= 0 else f"S{abs(tile_lat):02d}"
        lon_str = f"E{tile_lon:03d}" if tile_lon >= 0 else f"W{abs(tile_lon):03d}"
        tile_key = f"{lat_str}{lon_str}"

        tile_path = WC_DIR / f"ESA_WorldCover_10m_2021_v200_{tile_key}_Map.tif"
        lc_class = 40  # Default: cropland
        ndvi_proxy = 0.3  # Default NDVI proxy

        if tile_path.exists():
            try:
                if tile_key not in tile_cache:
                    tile_cache[tile_key] = rasterio.open(str(tile_path))
                src = tile_cache[tile_key]
                r, c = src.index(lon, lat)
                h, w = src.height, src.width
                r = max(0, min(r, h - 1))
                c = max(0, min(c, w - 1))
                data = src.read(1, window=rasterio.windows.Window(c, r, 1, 1))
                lc_class = int(data[0, 0]) if data.size > 0 else 40

                # NDVI proxy: tree cover = high NDVI, urban/bare = low NDVI
                ndvi_map = {10: 0.75, 20: 0.45, 30: 0.40, 40: 0.35, 50: 0.05,
                            60: 0.10, 70: 0.05, 80: 0.10, 90: 0.55, 95: 0.65, 100: 0.20}
                ndvi_proxy = ndvi_map.get(lc_class, 0.30)
            except Exception as exc:
                log.warning("Land cover extraction failed", lat=lat, lon=lon, error=str(exc))

        results.append({"land_cover_class": lc_class, "ndvi_proxy": ndvi_proxy})

    # Close cached rasters
    for src in tile_cache.values():
        if src:
            src.close()

    lc_df = pd.DataFrame(results, index=points_df.index)
    return pd.concat([points_df, lc_df], axis=1)


def download(force_refresh: bool = False) -> Path:
    """Main entry point: downloads all NER WorldCover tiles."""
    WC_DIR.mkdir(parents=True, exist_ok=True)

    tile_names = _get_ner_tile_names()
    log.info("Downloading ESA WorldCover tiles", n_tiles=len(tile_names))

    successful: list[str] = []
    for tile_name in tqdm(tile_names, desc="WorldCover tiles"):
        dest = WC_DIR / f"ESA_WorldCover_10m_2021_v200_{tile_name}_Map.tif"
        if dest.exists() and not force_refresh:
            successful.append(tile_name)
            continue
        if _download_tile(tile_name, dest):
            successful.append(tile_name)

    schema = {
        "source": "ESA WorldCover 2021 v2.0",
        "resolution_m": 10,
        "url": ESA_WORLDCOVER_BASE_URL,
        "downloaded_at": datetime.utcnow().isoformat(),
        "tiles_downloaded": len(successful),
        "classes": WORLDCOVER_CLASSES,
    }
    with open(METADATA_DIR / "worldcover_schema.json", "w") as f:
        json.dump(schema, f, indent=2)

    log.info("WorldCover download complete", tiles=len(successful))
    return WC_DIR


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Download ESA WorldCover for NER India")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    download(force_refresh=args.force)
