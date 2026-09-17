"""
SRTM 30m Digital Elevation Model (DEM) Downloader
==================================================
Downloads SRTM 30m DEM tiles for the North Eastern Region of India via:
  1. NASA Earthdata HTTPS (preferred, requires free credentials)
  2. CGIAR-CSI SRTM via `elevation` Python library (fallback, no auth needed)
  3. Open-Elevation API (second fallback, for point queries only)

NER tiles cover lat 20–29°N, lon 88–97°E.

Output:
    datasets/raw/srtm_dem_ner/            — GeoTIFF tiles
    datasets/raw/srtm_dem_ner_merged.tif  — Merged NER mosaic
    datasets/metadata/srtm_schema.json    — Tile inventory and stats
"""

from __future__ import annotations

import json
import os
import shutil
import time
from pathlib import Path
from typing import Optional

import numpy as np
import requests
from tqdm import tqdm

import sys
sys.path.insert(0, str(Path(__file__).parents[3]))

from ai.config import METADATA_DIR, NER_BBOX, RAW_DIR, SRTM_TILES
from ai.logger import PipelineLogger

log = PipelineLogger("download.srtm")

SRTM_DIR = RAW_DIR / "srtm_dem_ner"
MERGED_TIFF = RAW_DIR / "srtm_dem_ner_merged.tif"

# NASA Earthdata SRTM endpoint
NASA_EARTHDATA_URL = "https://e4ftl01.cr.usgs.gov/MEASURES/SRTMGL1.003/2000.02.11"
# CGIAR alternative
CGIAR_URL = "https://srtm.csi.cgiar.org/wp-content/uploads/files/srtm_5x5/TIFF"

MAX_RETRIES = 3


def _get_nasa_credentials() -> tuple[str, str]:
    """Read NASA Earthdata credentials from environment."""
    user = os.getenv("NASA_EARTHDATA_USER", "")
    pwd = os.getenv("NASA_EARTHDATA_PASSWORD", "")
    return user, pwd


def _download_tile_nasa(tile_name: str, dest_path: Path, user: str, pwd: str) -> bool:
    """
    Download a single SRTM tile from NASA Earthdata HTTPS endpoint.
    Tile name format: N20E088 → file: N20E088.SRTMGL1.hgt.zip
    """
    filename = f"{tile_name}.SRTMGL1.hgt.zip"
    url = f"{NASA_EARTHDATA_URL}/{filename}"

    try:
        with requests.Session() as session:
            session.auth = (user, pwd)
            resp = session.get(url, timeout=120, stream=True)
            if resp.status_code == 404:
                log.warning("Tile not found on NASA", tile=tile_name)
                return False
            resp.raise_for_status()

            zip_path = dest_path.with_suffix(".zip")
            with open(zip_path, "wb") as f:
                for chunk in resp.iter_content(chunk_size=65536):
                    f.write(chunk)

            # Extract HGT file
            import zipfile
            with zipfile.ZipFile(zip_path, "r") as z:
                z.extractall(dest_path.parent)
            zip_path.unlink(missing_ok=True)
            return True

    except requests.RequestException as exc:
        log.warning("NASA tile download failed", tile=tile_name, error=str(exc))
        return False


def _download_tile_elevation_library(tile_name: str, dest_path: Path) -> bool:
    """
    Fallback: uses the `elevation` Python library (CGIAR SRTM via GDAL).
    Returns True on success.
    """
    try:
        import elevation  # type: ignore

        # Parse tile name to get bbox
        lat_part = tile_name[1:3]
        lon_part = tile_name[4:]
        lat = int(lat_part) * (1 if tile_name[0] == "N" else -1)
        lon = int(lon_part) * (1 if tile_name[3] == "E" else -1)

        bounds = (lon, lat, lon + 1, lat + 1)
        tif_path = str(dest_path)
        elevation.clip(bounds=bounds, output=tif_path, product="SRTM1")
        elevation.clean()
        return dest_path.exists()
    except Exception as exc:
        log.warning("elevation library failed", tile=tile_name, error=str(exc))
        return False


def _query_open_elevation_api(lat: float, lon: float) -> Optional[float]:
    """
    Last-resort: queries Open-Elevation API for a single point elevation.
    Only used for point prediction (not bulk tile download).
    """
    try:
        resp = requests.get(
            "https://api.open-elevation.com/api/v1/lookup",
            params={"locations": f"{lat},{lon}"},
            timeout=10,
        )
        resp.raise_for_status()
        results = resp.json().get("results", [])
        if results:
            return float(results[0]["elevation"])
    except Exception:
        pass
    return None


def download_tiles(force_refresh: bool = False) -> Path:
    """
    Downloads all NER SRTM tiles and merges them into a single mosaic GeoTIFF.
    Returns path to the merged GeoTIFF.
    """
    SRTM_DIR.mkdir(parents=True, exist_ok=True)

    if MERGED_TIFF.exists() and not force_refresh:
        log.info("SRTM mosaic already exists", path=str(MERGED_TIFF))
        return MERGED_TIFF

    user, pwd = _get_nasa_credentials()
    has_nasa_creds = bool(user and pwd)

    if not has_nasa_creds:
        log.warning(
            "NASA Earthdata credentials not set. "
            "Set NASA_EARTHDATA_USER and NASA_EARTHDATA_PASSWORD in .env. "
            "Falling back to elevation library (CGIAR SRTM)."
        )

    successful_tiles: list[Path] = []

    for tile_name in tqdm(SRTM_TILES, desc="SRTM tiles"):
        tif_path = SRTM_DIR / f"{tile_name}.tif"

        if tif_path.exists() and not force_refresh:
            successful_tiles.append(tif_path)
            continue

        success = False
        if has_nasa_creds:
            for _ in range(MAX_RETRIES):
                if _download_tile_nasa(tile_name, tif_path, user, pwd):
                    # Convert HGT to GeoTIFF using GDAL if needed
                    hgt_path = SRTM_DIR / f"{tile_name}.hgt"
                    if hgt_path.exists():
                        _convert_hgt_to_tif(hgt_path, tif_path)
                    success = tif_path.exists()
                    if success:
                        break
                    time.sleep(2)

        if not success:
            success = _download_tile_elevation_library(tile_name, tif_path)

        if success:
            successful_tiles.append(tif_path)
        else:
            log.warning("Could not download tile", tile=tile_name)

    if successful_tiles:
        _merge_tiles(successful_tiles, MERGED_TIFF)

    _save_metadata(successful_tiles)
    return MERGED_TIFF


def _convert_hgt_to_tif(hgt_path: Path, tif_path: Path) -> None:
    """Convert HGT to GeoTIFF using GDAL Python bindings or rasterio."""
    try:
        import rasterio
        from rasterio.enums import Resampling
        with rasterio.open(str(hgt_path)) as src:
            data = src.read(1)
            profile = src.profile.copy()
            profile.update(driver="GTiff", compress="deflate")
            with rasterio.open(str(tif_path), "w", **profile) as dst:
                dst.write(data, 1)
        hgt_path.unlink(missing_ok=True)
    except Exception as exc:
        log.warning("HGT to TIF conversion failed", error=str(exc))
        shutil.copy(str(hgt_path), str(tif_path))


def _merge_tiles(tile_paths: list[Path], output_path: Path) -> None:
    """Merges individual GeoTIFF tiles into a single mosaic using rasterio."""
    try:
        import rasterio
        from rasterio.merge import merge as rasterio_merge

        log.info("Merging SRTM tiles", n_tiles=len(tile_paths))
        datasets = [rasterio.open(str(p)) for p in tile_paths]

        mosaic, transform = rasterio_merge(datasets)
        profile = datasets[0].profile.copy()
        profile.update(
            driver="GTiff",
            height=mosaic.shape[1],
            width=mosaic.shape[2],
            transform=transform,
            compress="deflate",
            tiled=True,
            blockxsize=256,
            blockysize=256,
        )

        with rasterio.open(str(output_path), "w", **profile) as dst:
            dst.write(mosaic)

        for ds in datasets:
            ds.close()

        log.info("SRTM mosaic created", path=str(output_path))
    except ImportError:
        log.error("rasterio not installed — cannot merge SRTM tiles")


def _save_metadata(tiles: list[Path]) -> None:
    schema = {
        "source": "SRTM 30m DEM",
        "provider": "NASA / USGS / CGIAR",
        "resolution_m": 30,
        "crs": "EPSG:4326",
        "ner_bbox": NER_BBOX,
        "tiles_downloaded": len(tiles),
        "tile_names": [t.stem for t in tiles],
        "merged_mosaic": str(MERGED_TIFF),
    }
    path = METADATA_DIR / "srtm_schema.json"
    with open(path, "w") as f:
        json.dump(schema, f, indent=2)
    log.info("SRTM metadata saved", path=str(path))


def get_elevation_at_point(lat: float, lon: float) -> float:
    """
    Returns elevation (meters) at a single point using the merged SRTM mosaic.
    Falls back to Open-Elevation API if the mosaic is unavailable.
    """
    if MERGED_TIFF.exists():
        try:
            import rasterio
            with rasterio.open(str(MERGED_TIFF)) as src:
                row, col = src.index(lon, lat)
                data = src.read(1)
                h, w = data.shape
                row = max(0, min(row, h - 1))
                col = max(0, min(col, w - 1))
                val = float(data[row, col])
                if val != src.nodata:
                    return val
        except Exception as exc:
            log.warning("SRTM raster read failed", error=str(exc))

    elev = _query_open_elevation_api(lat, lon)
    return elev if elev is not None else 0.0


def download(force_refresh: bool = False) -> Path:
    """Main entry point."""
    return download_tiles(force_refresh=force_refresh)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Download SRTM DEM for NER India")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--test-point", nargs=2, type=float, metavar=("LAT", "LON"), help="Test elevation at a point")
    args = parser.parse_args()

    if args.test_point:
        lat, lon = args.test_point
        elev = get_elevation_at_point(lat, lon)
        print(f"Elevation at ({lat}, {lon}): {elev:.1f}m")
    else:
        mosaic = download(force_refresh=args.force)
        print(f"\n✅ SRTM mosaic ready: {mosaic}")
