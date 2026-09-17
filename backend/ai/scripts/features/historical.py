"""
Feature Engineering — Historical Landslide Density
====================================================
Computes historical landslide event density at a point using
Gaussian Kernel Density Estimation (KDE) on the NASA GLC catalog.

Also provides a hook for citizen_report_density (populated from
the Apda Mitra PostgreSQL database at inference time).
"""

from __future__ import annotations

import numpy as np
from pathlib import Path
from typing import Optional

import sys
sys.path.insert(0, str(Path(__file__).parents[3]))

from ai.logger import PipelineLogger

log = PipelineLogger("features.historical")

_KDE_MODEL = None
_KDE_MAX_DENSITY: float = 1.0


def _load_or_build_kde():
    """Loads the pre-fitted KDE model from the training dataset."""
    global _KDE_MODEL, _KDE_MAX_DENSITY

    if _KDE_MODEL is not None:
        return _KDE_MODEL

    try:
        from ai.config import PROCESSED_DIR
        import pandas as pd
        from scipy.stats import gaussian_kde

        glc_path = PROCESSED_DIR / "nasa_glc_clean.parquet"
        if not glc_path.exists():
            log.warning("GLC data not found — historical density will be 0")
            return None

        df = pd.read_parquet(glc_path)
        lats = df["latitude"].values
        lons = df["longitude"].values

        if len(lats) < 5:
            return None

        _KDE_MODEL = gaussian_kde(np.vstack([lats, lons]), bw_method=0.1)
        # Compute max density for normalization
        sample = np.vstack([lats[:200], lons[:200]])
        _KDE_MAX_DENSITY = float(_KDE_MODEL(sample).max())
        log.info("Historical KDE model built", n_events=len(lats))
    except Exception as exc:
        log.warning("KDE model build failed", error=str(exc))

    return _KDE_MODEL


def get_historical_density(lat: float, lon: float) -> float:
    """
    Returns normalized historical landslide event density at a point.
    Range: [0, 1] where 1 = highest observed density.
    """
    kde = _load_or_build_kde()
    if kde is None:
        return 0.0
    try:
        density = float(kde(np.array([[lat], [lon]]))[0])
        return min(1.0, density / max(_KDE_MAX_DENSITY, 1e-10))
    except Exception:
        return 0.0


def get_citizen_report_density(lat: float, lon: float, db_session=None) -> float:
    """
    Returns citizen report density near a point.
    If db_session is provided, queries verified citizen reports from PostgreSQL.
    Falls back to 0.0 if no database connection.

    This is the integration hook for Apda Mitra citizen reports.
    """
    if db_session is None:
        return 0.0

    try:
        # SQL: count verified landslide citizen reports within 25km
        # Using PostGIS ST_DWithin for spatial filtering
        query = """
            SELECT COUNT(*) as report_count
            FROM incident_reports
            WHERE
                verified = true
                AND disaster_type = 'LANDSLIDE'
                AND ST_DWithin(
                    ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
                    location::geography,
                    25000
                )
                AND created_at >= NOW() - INTERVAL '30 days'
        """
        result = db_session.execute(query, {"lat": lat, "lon": lon}).scalar()
        count = int(result or 0)
        # Normalize: 10+ reports = density 1.0
        return min(1.0, count / 10.0)
    except Exception as exc:
        log.warning("Citizen report density query failed", error=str(exc))
        return 0.0


def get_historical_features(lat: float, lon: float, db_session=None) -> dict[str, float]:
    """Returns both historical density features for a coordinate."""
    return {
        "historical_landslide_density": get_historical_density(lat, lon),
        "citizen_report_density": get_citizen_report_density(lat, lon, db_session),
    }
