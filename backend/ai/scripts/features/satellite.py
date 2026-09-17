"""
Feature Engineering — Satellite / Land Cover Features
=======================================================
Extracts ESA WorldCover land cover class and NDVI proxy for inference.
Wraps the download_worldcover module's extraction logic with caching.
"""

from __future__ import annotations

from typing import Optional

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parents[3]))

from ai.logger import PipelineLogger

log = PipelineLogger("features.satellite")

# NDVI proxy mapping: WorldCover class → approximate NDVI
NDVI_PROXY_MAP = {
    10: 0.75,   # Tree cover
    20: 0.45,   # Shrubland
    30: 0.40,   # Grassland
    40: 0.35,   # Cropland
    50: 0.05,   # Built-up
    60: 0.10,   # Bare/sparse vegetation
    70: 0.05,   # Snow/Ice
    80: 0.10,   # Permanent water
    90: 0.55,   # Herbaceous wetland
    95: 0.65,   # Mangroves
    100: 0.20,  # Moss and lichen
}


def get_satellite_features(lat: float, lon: float) -> dict[str, float]:
    """
    Returns land cover class and NDVI proxy for a given coordinate.

    Attempts to read from the cached ESA WorldCover GeoTIFF.
    Falls back to cropland (class 40) if tiles unavailable.

    Args:
        lat: Latitude
        lon: Longitude

    Returns:
        Dict with land_cover_class (int) and ndvi_proxy (float)
    """
    defaults = {"land_cover_class": 40, "ndvi_proxy": 0.35}

    try:
        from ai.config import RAW_DIR
        import rasterio
        from rasterio.windows import Window

        tile_lat = (int(lat) // 3) * 3
        tile_lon = (int(lon) // 3) * 3
        lat_str = f"N{tile_lat:02d}" if tile_lat >= 0 else f"S{abs(tile_lat):02d}"
        lon_str = f"E{tile_lon:03d}" if tile_lon >= 0 else f"W{abs(tile_lon):03d}"
        tile_key = f"{lat_str}{lon_str}"

        tile_path = RAW_DIR / "worldcover_ner" / f"ESA_WorldCover_10m_2021_v200_{tile_key}_Map.tif"

        if not tile_path.exists():
            return defaults

        with rasterio.open(str(tile_path)) as src:
            row, col = src.index(lon, lat)
            h, w = src.height, src.width
            row = max(0, min(row, h - 1))
            col = max(0, min(col, w - 1))
            data = src.read(1, window=Window(col, row, 1, 1))
            lc_class = int(data[0, 0]) if data.size > 0 else 40

        ndvi = NDVI_PROXY_MAP.get(lc_class, 0.35)
        return {"land_cover_class": lc_class, "ndvi_proxy": ndvi}

    except Exception as exc:
        log.warning("Satellite feature extraction failed", lat=lat, lon=lon, error=str(exc))
        return defaults
