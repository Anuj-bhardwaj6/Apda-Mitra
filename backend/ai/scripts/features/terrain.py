"""
Feature Engineering — Terrain Features
========================================
Extracts terrain-derived features from the SRTM 30m DEM:
  - Elevation (meters)
  - Slope (degrees)
  - Aspect (degrees from North)
  - Curvature (planform curvature, negative = concave)
  - Topographic Wetness Index (TWI = ln(As / tan(β)))

Uses rasterio for raster I/O and numpy for derivative computation.
Falls back to the Open-Elevation API for point queries when SRTM unavailable.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

import sys
sys.path.insert(0, str(Path(__file__).parents[3]))

from ai.logger import PipelineLogger

log = PipelineLogger("features.terrain")

_SRTM_MERGED_PATH: Optional[Path] = None
_SRTM_DATASET = None   # Cached rasterio dataset


def _get_srtm_dataset():
    """Lazy-loads and caches the SRTM merged raster."""
    global _SRTM_DATASET, _SRTM_MERGED_PATH

    if _SRTM_DATASET is not None:
        return _SRTM_DATASET

    from ai.config import RAW_DIR
    candidate = RAW_DIR / "srtm_dem_ner_merged.tif"
    if candidate.exists():
        try:
            import rasterio
            _SRTM_MERGED_PATH = candidate
            _SRTM_DATASET = rasterio.open(str(candidate))
            log.info("SRTM raster loaded", path=str(candidate))
            return _SRTM_DATASET
        except Exception as exc:
            log.warning("Failed to open SRTM raster", error=str(exc))
    return None


def _compute_slope_aspect_curvature(
    window: np.ndarray,
    cell_size_m: float = 30.0,
) -> tuple[float, float, float]:
    """
    Computes slope, aspect, and planform curvature from a 3×3 elevation window.
    Uses the Horn (1981) method implemented in standard GIS conventions.

    Args:
        window: 3×3 numpy array of elevation values (meters)
        cell_size_m: DEM cell size in meters (30m for SRTM)

    Returns:
        (slope_deg, aspect_deg, curvature)
    """
    if window.shape != (3, 3):
        return 15.0, 180.0, 0.0

    z = window.astype(float)
    # Finite difference gradients
    dz_dx = ((z[0, 2] + 2 * z[1, 2] + z[2, 2]) - (z[0, 0] + 2 * z[1, 0] + z[2, 0])) / (8 * cell_size_m)
    dz_dy = ((z[2, 0] + 2 * z[2, 1] + z[2, 2]) - (z[0, 0] + 2 * z[0, 1] + z[0, 2])) / (8 * cell_size_m)

    slope_rad = np.arctan(np.sqrt(dz_dx ** 2 + dz_dy ** 2))
    slope_deg = float(np.degrees(slope_rad))

    # Aspect: 0=North, clockwise
    aspect_rad = np.arctan2(-dz_dy, dz_dx)
    aspect_deg = float(np.degrees(aspect_rad))
    if aspect_deg < 0:
        aspect_deg += 360.0

    # Planform curvature (simplified)
    d2z_dx2 = (z[1, 0] - 2 * z[1, 1] + z[1, 2]) / (cell_size_m ** 2)
    d2z_dy2 = (z[0, 1] - 2 * z[1, 1] + z[2, 1]) / (cell_size_m ** 2)
    curvature = float(-(d2z_dx2 + d2z_dy2))

    return slope_deg, aspect_deg, curvature


def _compute_twi(slope_deg: float, flow_accum: float = 100.0) -> float:
    """
    Computes Topographic Wetness Index: TWI = ln(As / tan(β))
    where As = specific catchment area (proxy: flow_accum * cell_size²)
    and β = slope angle.

    Uses a default flow accumulation since we don't have a full flow model.
    """
    slope_rad = np.radians(max(slope_deg, 0.001))
    tan_slope = np.tan(slope_rad)
    specific_area = flow_accum * 900  # cell_size² = 30² = 900 m²
    twi = float(np.log(specific_area / max(tan_slope, 1e-6)))
    return twi


def get_terrain_features_at_point(lat: float, lon: float) -> dict[str, float]:
    """
    Returns terrain features for a single coordinate.

    Args:
        lat: Latitude (decimal degrees)
        lon: Longitude (decimal degrees)

    Returns:
        Dict with elevation, slope, aspect, curvature, topographic_wetness_index
    """
    defaults = {
        "elevation": 500.0,
        "slope": 15.0,
        "aspect": 180.0,
        "curvature": 0.0,
        "topographic_wetness_index": 8.0,
    }

    ds = _get_srtm_dataset()
    if ds is None:
        # Fallback to Open-Elevation API
        try:
            from scripts.download.download_srtm import get_elevation_at_point
            elev = get_elevation_at_point(lat, lon)
            defaults["elevation"] = elev
            return defaults
        except Exception:
            return defaults

    try:
        import rasterio
        from rasterio.windows import Window

        row, col = ds.index(lon, lat)
        h, w = ds.height, ds.width

        # Clamp to raster bounds
        row = max(1, min(row, h - 2))
        col = max(1, min(col, w - 2))

        # Read 3x3 window for derivative computation
        win = Window(col - 1, row - 1, 3, 3)
        data = ds.read(1, window=win).astype(float)
        nodata = ds.nodata if ds.nodata else -32768.0
        data[data == nodata] = np.nan

        if data.shape != (3, 3) or np.isnan(data).all():
            return defaults

        # Fill NaN with center value for border handling
        center = data[1, 1] if not np.isnan(data[1, 1]) else 500.0
        data = np.where(np.isnan(data), center, data)

        elevation = float(data[1, 1])
        slope, aspect, curvature = _compute_slope_aspect_curvature(data)
        twi = _compute_twi(slope)

        return {
            "elevation": max(0.0, elevation),
            "slope": max(0.0, min(slope, 90.0)),
            "aspect": aspect,
            "curvature": curvature,
            "topographic_wetness_index": twi,
        }
    except Exception as exc:
        log.warning("Terrain extraction failed", lat=lat, lon=lon, error=str(exc))
        return defaults


def extract_terrain_features_batch(df: pd.DataFrame) -> pd.DataFrame:
    """
    Extracts terrain features for all rows in a DataFrame.
    Adds columns: elevation, slope, aspect, curvature, topographic_wetness_index.
    """
    log.info("Extracting terrain features", n_rows=len(df))

    terrain_records = []
    for _, row in df.iterrows():
        features = get_terrain_features_at_point(float(row["latitude"]), float(row["longitude"]))
        terrain_records.append(features)

    terrain_df = pd.DataFrame(terrain_records, index=df.index)

    for col in terrain_df.columns:
        df[col] = terrain_df[col]

    log.info("Terrain features extracted", n_rows=len(df))
    return df
