"""
APDA MITRA — Unified Telemetry Endpoints
=======================================
Exposes real Earth Observation and nowcast telemetry for dashboard components.
"""

from fastapi import APIRouter, Query
from typing import Optional

from app.services.risk_engine import risk_engine

router = APIRouter(tags=["telemetry"])


@router.get("/telemetry/unified")
@router.get("/telemetry")
async def get_unified_telemetry(
    latitude: float = Query(25.532, description="Latitude (e.g. 25.532 for East Khasi Hills)"),
    longitude: float = Query(91.865, description="Longitude (e.g. 91.865 for East Khasi Hills)")
):
    """
    Returns unified telemetry containing:
    - NASA GPM IMERG rainfall (observation time, latency, status)
    - NASA SMAP soil moisture (real value or DATA UNAVAILABLE)
    - Copernicus DEM terrain (elevation, slope)
    - NASA LHASA hazard nowcast (separate from AI prediction)
    - Apda Mitra XGBoost AI prediction (real inference or MODEL NOT AVAILABLE)
    """
    return await risk_engine.get_unified_telemetry(latitude, longitude)
