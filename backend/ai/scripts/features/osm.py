"""
Feature Engineering — OSM Proximity Features
=============================================
Computes distance to nearest road and river for a single point at inference time.
Uses cached GeoPackage files downloaded by download_osm.py.
Falls back to reasonable defaults when OSM data unavailable.
"""

from __future__ import annotations

import numpy as np
from pathlib import Path
from typing import Optional

import sys
sys.path.insert(0, str(Path(__file__).parents[3]))

from ai.logger import PipelineLogger

log = PipelineLogger("features.osm")

_ROAD_UNION = None
_RIVER_UNION = None
_TRANSFORMER = None


def _load_networks():
    """Lazy-loads and caches the road and river network spatial unions."""
    global _ROAD_UNION, _RIVER_UNION, _TRANSFORMER

    if _ROAD_UNION is not None:
        return _ROAD_UNION, _RIVER_UNION, _TRANSFORMER

    try:
        import geopandas as gpd
        from pyproj import Transformer
        from ai.config import RAW_DIR

        roads_path = RAW_DIR / "osm_roads_ner.gpkg"
        rivers_path = RAW_DIR / "osm_rivers_ner.gpkg"

        if roads_path.exists():
            roads_gdf = gpd.read_file(str(roads_path)).to_crs("EPSG:32645")
            _ROAD_UNION = roads_gdf.unary_union
            log.info("OSM roads network loaded")

        if rivers_path.exists():
            rivers_gdf = gpd.read_file(str(rivers_path)).to_crs("EPSG:32645")
            _RIVER_UNION = rivers_gdf.unary_union
            log.info("OSM rivers network loaded")

        _TRANSFORMER = Transformer.from_crs("EPSG:4326", "EPSG:32645", always_xy=True)

    except Exception as exc:
        log.warning("OSM network load failed", error=str(exc))

    return _ROAD_UNION, _RIVER_UNION, _TRANSFORMER


def get_osm_features(lat: float, lon: float) -> dict[str, float]:
    """
    Returns distance to nearest road and river in meters.

    Args:
        lat: Latitude
        lon: Longitude

    Returns:
        Dict with distance_to_river_m and distance_to_road_m
    """
    defaults = {"distance_to_river_m": 5000.0, "distance_to_road_m": 2000.0}

    road_union, river_union, transformer = _load_networks()

    if transformer is None:
        return defaults

    try:
        from shapely.geometry import Point
        x, y = transformer.transform(lon, lat)
        pt = Point(x, y)

        dist_river = float(river_union.distance(pt)) if river_union else 5000.0
        dist_road = float(road_union.distance(pt)) if road_union else 2000.0

        return {
            "distance_to_river_m": max(0.0, dist_river),
            "distance_to_road_m": max(0.0, dist_road),
        }
    except Exception as exc:
        log.warning("OSM distance computation failed", lat=lat, lon=lon, error=str(exc))
        return defaults
