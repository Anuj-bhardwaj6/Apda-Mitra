"""
OpenStreetMap Road & River Network Downloader
==============================================
Downloads OSM road network and river/stream network for NER India via the
Overpass API. Computes distance from each event/grid point to the nearest
river and nearest road using spatial KNN queries.

Output:
    datasets/raw/osm_roads_ner.gpkg    — Road network (GeoPackage)
    datasets/raw/osm_rivers_ner.gpkg   — River/stream network (GeoPackage)
    datasets/metadata/osm_schema.json  — Feature counts and schema

API: https://overpass-api.de/api/interpreter
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

import sys
sys.path.insert(0, str(Path(__file__).parents[3]))

from ai.config import METADATA_DIR, NER_BBOX, OVERPASS_API_URL, RAW_DIR
from ai.logger import PipelineLogger

log = PipelineLogger("download.osm")

ROADS_PATH = RAW_DIR / "osm_roads_ner.gpkg"
RIVERS_PATH = RAW_DIR / "osm_rivers_ner.gpkg"
MAX_RETRIES = 3
TIMEOUT_SEC = 300  # Overpass can be slow for large queries


def _overpass_query(query: str) -> Optional[dict]:
    """Executes an Overpass QL query and returns parsed JSON response."""
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.post(
                OVERPASS_API_URL,
                data={"data": query},
                timeout=TIMEOUT_SEC,
            )
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as exc:
            log.warning("Overpass query failed", attempt=attempt, error=str(exc))
            if attempt == MAX_RETRIES:
                return None
            time.sleep(10 * attempt)
    return None


def _build_road_query(bbox: list[float]) -> str:
    """Builds Overpass QL query for major roads in bbox."""
    min_lon, min_lat, max_lon, max_lat = bbox
    # [out:json] roads: primary, secondary, tertiary (most relevant to landslide proximity)
    return f"""
[out:json][timeout:300];
(
  way["highway"~"motorway|trunk|primary|secondary|tertiary"]
    ({min_lat},{min_lon},{max_lat},{max_lon});
);
out geom;
"""


def _build_river_query(bbox: list[float]) -> str:
    """Builds Overpass QL query for rivers and streams in bbox."""
    min_lon, min_lat, max_lon, max_lat = bbox
    return f"""
[out:json][timeout:300];
(
  way["waterway"~"river|stream|canal"]
    ({min_lat},{min_lon},{max_lat},{max_lon});
  relation["waterway"="river"]
    ({min_lat},{min_lon},{max_lat},{max_lon});
);
out geom;
"""


def _parse_osm_to_geodataframe(data: dict, geometry_type: str):
    """
    Converts Overpass JSON response to a GeoDataFrame of LineStrings.
    Requires geopandas + shapely.
    """
    try:
        import geopandas as gpd
        from shapely.geometry import LineString

        lines: list = []
        props: list = []

        for element in data.get("elements", []):
            if element.get("type") != "way":
                continue
            geom_data = element.get("geometry", [])
            if len(geom_data) < 2:
                continue

            coords = [(pt["lon"], pt["lat"]) for pt in geom_data]
            line = LineString(coords)
            tags = element.get("tags", {})
            lines.append(line)
            props.append({
                "osm_id": element.get("id"),
                "name": tags.get("name", ""),
                "type": tags.get("highway", tags.get("waterway", "")),
            })

        if not lines:
            return gpd.GeoDataFrame()

        gdf = gpd.GeoDataFrame(props, geometry=lines, crs="EPSG:4326")
        return gdf

    except ImportError:
        log.error("geopandas not installed — cannot parse OSM geometry")
        return None


def download_roads(force_refresh: bool = False):
    """Downloads OSM road network for NER."""
    if ROADS_PATH.exists() and not force_refresh:
        log.info("Roads already cached", path=str(ROADS_PATH))
        return ROADS_PATH

    log.info("Querying Overpass API for NER roads")
    query = _build_road_query(NER_BBOX)
    data = _overpass_query(query)

    if data is None:
        log.error("Road query failed")
        return None

    try:
        import geopandas as gpd
        gdf = _parse_osm_to_geodataframe(data, "road")
        if gdf is not None and len(gdf) > 0:
            gdf.to_file(str(ROADS_PATH), driver="GPKG")
            log.info("Roads saved", path=str(ROADS_PATH), features=len(gdf))
        return ROADS_PATH
    except Exception as exc:
        log.error("Road GDF save failed", error=str(exc))
        return None


def download_rivers(force_refresh: bool = False):
    """Downloads OSM river/stream network for NER."""
    if RIVERS_PATH.exists() and not force_refresh:
        log.info("Rivers already cached", path=str(RIVERS_PATH))
        return RIVERS_PATH

    log.info("Querying Overpass API for NER rivers")
    query = _build_river_query(NER_BBOX)
    data = _overpass_query(query)

    if data is None:
        log.error("River query failed")
        return None

    try:
        import geopandas as gpd
        gdf = _parse_osm_to_geodataframe(data, "river")
        if gdf is not None and len(gdf) > 0:
            gdf.to_file(str(RIVERS_PATH), driver="GPKG")
            log.info("Rivers saved", path=str(RIVERS_PATH), features=len(gdf))
        return RIVERS_PATH
    except Exception as exc:
        log.error("River GDF save failed", error=str(exc))
        return None


def compute_distances_to_network(
    points_df: pd.DataFrame,
    network_path: Path,
    output_col: str,
    lat_col: str = "latitude",
    lon_col: str = "longitude",
) -> pd.DataFrame:
    """
    For each lat/lon in points_df, computes the nearest distance (meters) to
    the road or river network using spatial indexing.

    Args:
        points_df: DataFrame with lat/lon columns
        network_path: Path to GeoPackage (.gpkg) with network lines
        output_col: Column name for the computed distance
        lat_col, lon_col: Coordinate column names

    Returns:
        points_df with output_col added (meters).
    """
    if not network_path.exists():
        log.warning("Network file not found, using large default distance", path=str(network_path))
        points_df[output_col] = 50000.0  # 50km default
        return points_df

    try:
        import geopandas as gpd
        from shapely.geometry import Point
        from pyproj import Transformer

        log.info("Computing distances", output_col=output_col, n_points=len(points_df))

        network_gdf = gpd.read_file(str(network_path))
        # Project to UTM zone 45N (covers most of NER) for metric distances
        network_proj = network_gdf.to_crs("EPSG:32645")
        network_union = network_proj.unary_union

        transformer = Transformer.from_crs("EPSG:4326", "EPSG:32645", always_xy=True)

        distances: list[float] = []
        for _, row in points_df.iterrows():
            x, y = transformer.transform(float(row[lon_col]), float(row[lat_col]))
            pt = Point(x, y)
            dist = network_union.distance(pt)
            distances.append(float(dist))

        points_df[output_col] = distances
        log.info("Distance computation complete", output_col=output_col)

    except Exception as exc:
        log.error("Distance computation failed", error=str(exc))
        points_df[output_col] = 25000.0  # 25km fallback

    return points_df


def download(force_refresh: bool = False) -> dict:
    """Main entry point: downloads roads and rivers."""
    roads_path = download_roads(force_refresh=force_refresh)
    rivers_path = download_rivers(force_refresh=force_refresh)

    schema = {
        "source": "OpenStreetMap via Overpass API",
        "url": OVERPASS_API_URL,
        "downloaded_at": datetime.utcnow().isoformat(),
        "roads_path": str(roads_path),
        "rivers_path": str(rivers_path),
        "road_types": ["motorway", "trunk", "primary", "secondary", "tertiary"],
        "waterway_types": ["river", "stream", "canal"],
    }
    with open(METADATA_DIR / "osm_schema.json", "w") as f:
        json.dump(schema, f, indent=2)

    return {"roads": roads_path, "rivers": rivers_path}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Download OSM road/river network for NER India")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    result = download(force_refresh=args.force)
    print(f"\n✅ Roads: {result['roads']}")
    print(f"✅ Rivers: {result['rivers']}")
