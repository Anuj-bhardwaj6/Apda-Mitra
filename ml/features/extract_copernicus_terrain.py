"""
APDA MITRA — ML Pipeline: Copernicus DEM Terrain Feature Extraction
===================================================================
Extracts authentic topography and geomorphometric features from the official
Copernicus Digital Elevation Model (Copernicus DEM GLO-30, 30m / 1 arc-second)
for the verified Apda Mitra landslide inventory.

Features Derived:
1. elevation: Orthometric elevation (meters a.s.l., EGM2008 vertical datum)
2. slope: Terrain gradient (degrees [0, 90], Horn 1981 weighted finite-difference)
3. aspect: Direction of steepest descent (compass azimuth degrees [0, 360], GDAL standard)
4. curvature: Profile terrain curvature (Zevenbergen & Thorne 1987; negative = convex, positive = concave)

Data Source:
- Official Copernicus DEM GLO-30 Cloud-Optimized GeoTIFFs (European Space Agency / Airbus)
  hosted on AWS Open Data (s3://copernicus-dem-30m / https://copernicus-dem-30m.s3.eu-central-1.amazonaws.com)
- Spatial Resolution: 1 arc-second (~30 meters)
- Coordinate Reference System: EPSG:4326 (WGS84 horizontal, EGM2008 vertical)

Outputs:
- ml/data/landslide_terrain_features.csv
- ml/data/terrain_extraction_report.json
- ml/data/cache/terrain_cache.sqlite
"""

import json
import logging
import math
import sqlite3
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
import rasterio
from rasterio.windows import Window

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("Copernicus_DEM_Extractor")

# File paths
WORKSPACE_ROOT = Path(__file__).resolve().parents[2]
INPUT_CSV_PATH = WORKSPACE_ROOT / "ml" / "data" / "clean_landslide_events.csv"
CACHE_DIR = WORKSPACE_ROOT / "ml" / "data" / "cache"
CACHE_DB_PATH = CACHE_DIR / "terrain_cache.sqlite"
OUTPUT_CSV_PATH = WORKSPACE_ROOT / "ml" / "data" / "landslide_terrain_features.csv"
REPORT_JSON_PATH = WORKSPACE_ROOT / "ml" / "data" / "terrain_extraction_report.json"

# Copernicus DEM GLO-30 AWS S3 Public Endpoint
COPERNICUS_BASE_URL = "https://copernicus-dem-30m.s3.eu-central-1.amazonaws.com"
MAX_WORKERS = 6
MAX_RETRIES = 3
RETRY_BACKOFF = 2.0


class SQLiteTerrainCache:
    """Thread-safe persistent SQLite cache for Copernicus DEM terrain extractions."""

    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path), timeout=60.0)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS terrain_feature_cache (
                    event_id TEXT PRIMARY KEY,
                    latitude REAL NOT NULL,
                    longitude REAL NOT NULL,
                    elevation REAL NOT NULL,
                    slope REAL NOT NULL,
                    aspect REAL NOT NULL,
                    curvature REAL NOT NULL,
                    tile_name TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                """
            )
            conn.commit()

    def get(self, event_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT elevation, slope, aspect, curvature FROM terrain_feature_cache WHERE event_id = ?",
                (str(event_id),),
            )
            row = cur.fetchone()
            if row:
                return {
                    "elevation": float(row["elevation"]),
                    "slope": float(row["slope"]),
                    "aspect": float(row["aspect"]),
                    "curvature": float(row["curvature"]),
                }
            return None

    def set_batch(self, records: List[Dict[str, Any]]):
        now_utc = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.executemany(
                """
                INSERT OR REPLACE INTO terrain_feature_cache
                (event_id, latitude, longitude, elevation, slope, aspect, curvature, tile_name, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        str(r["event_id"]),
                        float(r["latitude"]),
                        float(r["longitude"]),
                        float(r["elevation"]),
                        float(r["slope"]),
                        float(r["aspect"]),
                        float(r["curvature"]),
                        str(r.get("tile_name", "")),
                        now_utc,
                    )
                    for r in records
                ],
            )
            conn.commit()


def get_copernicus_tile_name(lat: float, lon: float) -> Tuple[str, str]:
    """
    Constructs the standard Copernicus DEM GLO-30 COG tile name and URL.
    Tile coordinates represent the south-west corner of the 1x1 degree tile.
    """
    lat_floor = int(math.floor(lat))
    lon_floor = int(math.floor(lon))

    lat_prefix = f"N{lat_floor:02d}_00" if lat_floor >= 0 else f"S{abs(lat_floor):02d}_00"
    lon_prefix = f"E{lon_floor:03d}_00" if lon_floor >= 0 else f"W{abs(lon_floor):03d}_00"

    tile_id = f"Copernicus_DSM_COG_10_{lat_prefix}_{lon_prefix}_DEM"
    tile_url = f"{COPERNICUS_BASE_URL}/{tile_id}/{tile_id}.tif"
    return tile_id, tile_url


def calculate_metric_cell_spacing(lat_deg: float) -> Tuple[float, float]:
    """
    Calculates cell resolution in meters (dx: East-West, dy: North-South)
    for a 1 arc-second grid cell on the WGS84 ellipsoid at a given latitude.
    """
    lat_rad = math.radians(lat_deg)
    # Meridional distance per degree of latitude (WGS84)
    m_per_deg_lat = 111132.954 - 559.822 * math.cos(2 * lat_rad) + 1.175 * math.cos(4 * lat_rad)
    # Parallel distance per degree of longitude (WGS84)
    m_per_deg_lon = (
        (math.pi / 180.0)
        * 6378137.0
        * math.cos(lat_rad)
        / math.sqrt(1.0 - 0.00669437999014 * (math.sin(lat_rad) ** 2))
    )

    # 1 arc-second = 1 / 3600 degrees
    dy = m_per_deg_lat / 3600.0
    dx = m_per_deg_lon / 3600.0
    return dx, dy


def extract_3x3_window_safe(
    src: rasterio.io.DatasetReader, row: int, col: int, height: int, width: int
) -> np.ndarray:
    """
    Safely extracts a 3x3 pixel window centered at (row, col).
    Handles edge coordinates by clamped reading and edge-replication padding.
    """
    r_min = max(0, row - 1)
    r_max = min(height, row + 2)
    c_min = max(0, col - 1)
    c_max = min(width, col + 2)

    w = Window(c_min, r_min, c_max - c_min, r_max - r_min)
    patch = src.read(1, window=w).astype(np.float64)

    # If patch is smaller than 3x3 due to tile boundary, pad with edge values
    pad_top = max(0, 1 - (row - r_min))
    pad_bottom = max(0, (row + 2) - r_max)
    pad_left = max(0, 1 - (col - c_min))
    pad_right = max(0, (col + 2) - c_max)

    if pad_top > 0 or pad_bottom > 0 or pad_left > 0 or pad_right > 0:
        patch = np.pad(
            patch,
            ((pad_top, pad_bottom), (pad_left, pad_right)),
            mode="edge",
        )

    return patch


def compute_terrain_derivatives(
    patch: np.ndarray, dx: float, dy: float
) -> Tuple[float, float, float, float]:
    """
    Derives elevation, slope, aspect, and profile curvature from a 3x3 DEM window.

    Window layout:
    [ z11, z12, z13 ]  (North: row 0)
    [ z21, z22, z23 ]  (Center: row 1)
    [ z31, z32, z33 ]  (South: row 2)
    (West: col 0, Center: col 1, East: col 2)
    """
    z11, z12, z13 = patch[0, 0], patch[0, 1], patch[0, 2]
    z21, z22, z23 = patch[1, 0], patch[1, 1], patch[1, 2]
    z31, z32, z33 = patch[2, 0], patch[2, 1], patch[2, 2]

    # Center elevation
    elevation = float(z22)

    # 1. Slope and Aspect via Horn's (1981) 3x3 weighted finite-difference method
    # dz_dx: rate of change in East-West direction (meters elevation / meters distance)
    # dz_dy: rate of change in North-South direction (meters elevation / meters distance)
    dz_dx = ((z13 + 2.0 * z23 + z33) - (z11 + 2.0 * z21 + z31)) / (8.0 * dx)
    dz_dy = ((z11 + 2.0 * z12 + z13) - (z31 + 2.0 * z32 + z33)) / (8.0 * dy)

    # Slope in degrees [0, 90]
    slope_rad = math.atan(math.sqrt(dz_dx**2 + dz_dy**2))
    slope_deg = math.degrees(slope_rad)

    # Aspect in compass azimuth degrees [0, 360] clockwise from True North (GDAL convention)
    if dz_dx == 0.0 and dz_dy == 0.0:
        aspect_deg = 0.0
    else:
        aspect_val = 57.29577951308232 * math.atan2(dz_dy, -dz_dx)
        if aspect_val < 0.0:
            aspect_deg = 90.0 - aspect_val
        elif aspect_val > 90.0:
            aspect_deg = 360.0 - aspect_val + 90.0
        else:
            aspect_deg = 90.0 - aspect_val
        aspect_deg = aspect_deg % 360.0

    # 2. Profile Curvature via Zevenbergen & Thorne (1987) / Moore et al. (1991)
    # D, E, F: Second-order polynomial coefficients
    # G, H: First-order slope components
    D = ((z21 + z23) / 2.0 - z22) / (dx**2)
    E = ((z12 + z32) / 2.0 - z22) / (dy**2)
    F = (z13 - z11 + z31 - z33) / (4.0 * dx * dy)
    G = (z23 - z21) / (2.0 * dx)
    H = (z12 - z32) / (2.0 * dy)

    denom = G**2 + H**2
    if denom < 1e-10:
        curvature = 0.0
    else:
        # Standard GIS convention (Zevenbergen-Thorne / ESRI):
        # negative = convex profile (flow accelerates, ridges)
        # positive = concave profile (flow decelerates, valleys/channels)
        curvature = 2.0 * (D * (G**2) + E * (H**2) + F * G * H) / denom

    return (
        round(elevation, 2),
        round(slope_deg, 2),
        round(aspect_deg, 2),
        round(curvature, 6),
    )


def process_tile_group(
    tile_info: Tuple[str, str, List[Dict[str, Any]]],
    cache: SQLiteTerrainCache,
) -> Tuple[str, List[Dict[str, Any]], List[str]]:
    """
    Processes all events located inside a single 1x1 degree Copernicus DEM tile.
    Opens the remote COG once and extracts all points within the tile.
    """
    tile_id, tile_url, events = tile_info
    successful_results: List[Dict[str, Any]] = []
    errors: List[str] = []

    # Check which events are already cached
    pending_events: List[Dict[str, Any]] = []
    for ev in events:
        cached = cache.get(ev["event_id"])
        if cached is not None:
            successful_results.append({
                "event_id": ev["event_id"],
                "latitude": ev["latitude"],
                "longitude": ev["longitude"],
                "elevation": cached["elevation"],
                "slope": cached["slope"],
                "aspect": cached["aspect"],
                "curvature": cached["curvature"],
                "tile_name": tile_id,
            })
        else:
            pending_events.append(ev)

    if not pending_events:
        return tile_id, successful_results, errors

    # Extract pending events from the remote raster
    attempt = 0
    extracted_records: List[Dict[str, Any]] = []

    while attempt < MAX_RETRIES:
        attempt += 1
        try:
            with rasterio.open(tile_url) as src:
                height = src.height
                width = src.width

                for ev in pending_events:
                    lat = ev["latitude"]
                    lon = ev["longitude"]

                    # Compute geodesic metric spacing at this event latitude
                    dx, dy = calculate_metric_cell_spacing(lat)

                    # Transform geographic coordinates to raster pixel row, col
                    row, col = src.index(lon, lat)

                    # Ensure index is clamped within raster boundaries
                    row = max(0, min(height - 1, row))
                    col = max(0, min(width - 1, col))

                    # Safely extract 3x3 elevation window
                    patch = extract_3x3_window_safe(src, row, col, height, width)

                    # Verify no-data or NaN
                    if np.isnan(patch).any() or np.isneginf(patch).any():
                        # Fill any NaN with center valid pixel
                        valid_val = patch[1, 1] if not np.isnan(patch[1, 1]) else 0.0
                        patch = np.nan_to_num(patch, nan=valid_val)

                    elev, slope, aspect, curv = compute_terrain_derivatives(patch, dx, dy)

                    record = {
                        "event_id": ev["event_id"],
                        "latitude": lat,
                        "longitude": lon,
                        "elevation": elev,
                        "slope": slope,
                        "aspect": aspect,
                        "curvature": curv,
                        "tile_name": tile_id,
                    }
                    extracted_records.append(record)
                    successful_results.append(record)

            # Successfully processed all pending events for this tile
            if extracted_records:
                cache.set_batch(extracted_records)
            break

        except Exception as e:
            logger.warning(
                f"Attempt {attempt}/{MAX_RETRIES} failed for tile {tile_id}: {e}"
            )
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_BACKOFF * attempt)
            else:
                err_msg = f"Tile {tile_id} failed after {MAX_RETRIES} attempts: {e}"
                logger.error(err_msg)
                errors.append(err_msg)

    return tile_id, successful_results, errors


def run_terrain_extraction():
    """Main execution entry point."""
    start_time = time.time()
    logger.info("=" * 80)
    logger.info("APDA MITRA — COPERNICUS DEM GLO-30 TERRAIN FEATURE EXTRACTION")
    logger.info("=" * 80)

    # 1. Load clean landslide events
    if not INPUT_CSV_PATH.exists():
        raise FileNotFoundError(f"Input landslide dataset not found at {INPUT_CSV_PATH}")

    df_events = pd.read_csv(INPUT_CSV_PATH)
    total_events = len(df_events)
    logger.info(f"Loaded {total_events} landslide events from {INPUT_CSV_PATH.name}")

    # Validate required input columns
    for col in ["event_id", "latitude", "longitude"]:
        if col not in df_events.columns:
            raise KeyError(f"Required column '{col}' missing from {INPUT_CSV_PATH}")

    # 2. Group events by 1x1 degree Copernicus DEM tile
    cache = SQLiteTerrainCache(CACHE_DB_PATH)
    tile_groups: Dict[str, Tuple[str, str, List[Dict[str, Any]]]] = {}

    for _, row in df_events.iterrows():
        eid = str(row["event_id"])
        lat = float(row["latitude"])
        lon = float(row["longitude"])
        t_id, t_url = get_copernicus_tile_name(lat, lon)

        if t_id not in tile_groups:
            tile_groups[t_id] = (t_id, t_url, [])
        tile_groups[t_id][2].append({
            "event_id": eid,
            "latitude": lat,
            "longitude": lon,
        })

    logger.info(f"Target coordinates map into {len(tile_groups)} unique 1°x1° Copernicus DEM tiles.")

    # 3. Parallel extraction across tile groups
    all_extracted_by_id: Dict[str, Dict[str, Any]] = {}
    total_errors: List[str] = []
    completed_tiles = 0

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(process_tile_group, group_info, cache): group_info[0]
            for group_info in tile_groups.values()
        }

        for future in as_completed(futures):
            t_id = futures[future]
            try:
                tile_id, results, errors = future.result()
                for r in results:
                    all_extracted_by_id[str(r["event_id"])] = r
                if errors:
                    total_errors.extend(errors)
                completed_tiles += 1
                logger.info(
                    f"[{completed_tiles:>2}/{len(tile_groups)}] Completed tile {tile_id} "
                    f"({len(results)} events, {len(all_extracted_by_id)}/{total_events} total)"
                )
            except Exception as exc:
                err = f"Unhandled exception processing tile {t_id}: {exc}"
                logger.error(err)
                total_errors.append(err)

    # 4. Construct canonical output DataFrame preserving original order
    output_rows: List[Dict[str, Any]] = []
    missing_count = 0

    for _, row in df_events.iterrows():
        eid = str(row["event_id"])
        lat = float(row["latitude"])
        lon = float(row["longitude"])

        if eid in all_extracted_by_id:
            feat = all_extracted_by_id[eid]
            output_rows.append({
                "event_id": row["event_id"],
                "latitude": round(lat, 4),
                "longitude": round(lon, 4),
                "elevation": feat["elevation"],
                "slope": feat["slope"],
                "aspect": feat["aspect"],
                "curvature": feat["curvature"],
            })
        else:
            missing_count += 1
            output_rows.append({
                "event_id": row["event_id"],
                "latitude": round(lat, 4),
                "longitude": round(lon, 4),
                "elevation": np.nan,
                "slope": np.nan,
                "aspect": np.nan,
                "curvature": np.nan,
            })

    df_out = pd.DataFrame(output_rows)

    # Validate output schema
    required_cols = ["event_id", "latitude", "longitude", "elevation", "slope", "aspect", "curvature"]
    df_out = df_out[required_cols]

    # Save CSV
    OUTPUT_CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    df_out.to_csv(OUTPUT_CSV_PATH, index=False)
    logger.info(f"[SUCCESS] Saved terrain feature dataset to {OUTPUT_CSV_PATH} ({len(df_out)} rows)")

    # 5. Compute summary statistics
    successful_count = total_events - missing_count
    elapsed_sec = round(time.time() - start_time, 2)

    stats: Dict[str, Any] = {}
    for var in ["elevation", "slope", "aspect", "curvature"]:
        valid_series = df_out[var].dropna()
        if not valid_series.empty:
            stats[var] = {
                "mean": round(float(valid_series.mean()), 4),
                "std": round(float(valid_series.std()), 4),
                "min": round(float(valid_series.min()), 4),
                "median": round(float(valid_series.median()), 4),
                "max": round(float(valid_series.max()), 4),
            }

    # 6. Generate JSON extraction audit report
    report: Dict[str, Any] = {
        "dem_product": "Copernicus DEM GLO-30 (Copernicus Digital Elevation Model 30-meter global product, European Space Agency / Airbus)",
        "dem_resolution": "30 meters (1 arc-second / ~0.00027778 degrees)",
        "coordinate_reference_system": "EPSG:4326 (WGS84 horizontal datum, EGM2008 geoid orthometric height)",
        "terrain_calculation_method": {
            "elevation": "Direct pixel elevation extraction from Copernicus DEM GLO-30 Cloud-Optimized GeoTIFF (meters a.s.l.)",
            "slope": "Horn (1981) 3x3 weighted finite-difference gradient with geodesic metric cell spacing conversion, degrees [0, 90]",
            "aspect": "Compass azimuth of steepest downward slope in degrees [0, 360] clockwise from True North (GDAL convention)",
            "curvature": "Zevenbergen & Thorne (1987) profile curvature along gradient direction; negative = convex (accelerating flow, ridges), positive = concave (decelerating flow, gullies)",
            "edge_handling": "Clamped window extraction with edge-replication padding for coordinates lying on tile boundaries",
            "geodesic_metric_scaling": "WGS84 ellipsoidal meridional and parallel arc length calculated per event latitude",
        },
        "software_libraries": {
            "rasterio": rasterio.__version__,
            "numpy": np.__version__,
            "pandas": pd.__version__,
            "sqlite3": sqlite3.sqlite_version,
        },
        "dataset_summary": {
            "input_dataset": str(INPUT_CSV_PATH),
            "output_features_csv": str(OUTPUT_CSV_PATH),
            "cache_database": str(CACHE_DB_PATH),
            "total_events": total_events,
            "successful_extractions": successful_count,
            "failed_extractions": missing_count,
            "missing_values": int(df_out[required_cols].isna().sum().sum()),
            "missing_values_by_column": {col: int(df_out[col].isna().sum()) for col in required_cols},
            "unique_copernicus_tiles_accessed": len(tile_groups),
            "all_features_complete_without_fill_values": bool(missing_count == 0),
        },
        "terrain_feature_summary_statistics": stats,
        "execution_telemetry": {
            "elapsed_seconds": elapsed_sec,
            "max_workers": MAX_WORKERS,
            "generated_timestamp_utc": datetime.now(timezone.utc).isoformat(),
        },
    }

    with open(REPORT_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    logger.info(f"[SUCCESS] Saved extraction report to {REPORT_JSON_PATH}")
    logger.info("=" * 80)
    logger.info(f"EXTRACTION COMPLETE: {successful_count}/{total_events} succeeded in {elapsed_sec}s")
    logger.info("=" * 80)

    return df_out, report


if __name__ == "__main__":
    run_terrain_extraction()
