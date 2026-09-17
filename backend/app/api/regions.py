"""
APDA MITRA — Regional & State-Level Disaster Monitoring API
===========================================================
Implements the full 10-state regional architecture:
- GET  /api/region/overview
- GET  /api/states
- GET  /api/states/{state}
- GET  /api/states/{state}/districts
- GET  /api/telemetry/region
- GET  /api/telemetry/state/{state}
- GET  /api/landslides/region
- GET  /api/landslides/state/{state}
- GET  /api/risk/region
- GET  /api/risk/state/{state}
- POST /api/risk/predict
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional

from app.core.region_config import (
    TARGET_REGION_NAME,
    TARGET_REGION_BBOX,
    TARGET_STATES,
    get_state
)
from app.services.region_service import region_service
from app.services.nasa_coolr import nasa_coolr_service
from app.services.xgboost_service import xgboost_service

router = APIRouter(tags=["regional_monitoring"])


class RiskPredictionRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude")
    rainfall_1h: Optional[float] = Field(None, ge=0.0, description="1-hour rainfall in mm")
    rainfall_3h: Optional[float] = Field(None, ge=0.0, description="3-hour rainfall in mm")
    rainfall_24h: Optional[float] = Field(None, ge=0.0, description="24-hour rainfall in mm")
    rainfall_7d: Optional[float] = Field(None, ge=0.0, description="7-day rainfall in mm")
    rainfall_30d: Optional[float] = Field(None, ge=0.0, description="30-day rainfall in mm")
    soil_moisture: Optional[float] = Field(None, ge=0.0, le=1.0, description="Volumetric soil moisture fraction [0.0, 1.0]")
    soil_moisture_anomaly: Optional[float] = Field(None, description="Standardized anomaly (sigma)")
    elevation: Optional[float] = Field(None, ge=-500.0, le=9000.0, description="Elevation in meters")
    slope: Optional[float] = Field(None, ge=0.0, le=90.0, description="Slope in degrees")
    aspect: Optional[float] = Field(None, ge=0.0, le=360.0, description="Aspect in degrees")
    curvature: Optional[float] = Field(None, description="Curvature in m^-1")


# 1. Regional Overview
@router.get("/region/overview")
async def get_region_overview():
    """
    Returns REGIONAL RISK OVERVIEW across all 10 states:
    States monitored: 10
    High risk count, Moderate risk count, Low risk count, Data unavailable count.
    State Risk Overview table data with live data status and NASA hazard status.
    """
    return await region_service.get_regional_overview()


# 2. States Listing
@router.get("/states")
async def get_all_states():
    """Returns metadata for all 10 monitored states."""
    return {
        "region": TARGET_REGION_NAME,
        "count": len(TARGET_STATES),
        "states": TARGET_STATES
    }


# 3. State Details
@router.get("/states/{state}")
async def get_state_details(state: str):
    """Returns details for a specific state in the target region."""
    st = get_state(state)
    if not st:
        raise HTTPException(status_code=404, detail=f"State '{state}' not found in 10-state target region.")
    return st


# 4. State Districts
@router.get("/states/{state}/districts")
async def get_state_districts(state: str):
    """Returns the administrative districts and hazard corridors for a state."""
    st = get_state(state)
    if not st:
        raise HTTPException(status_code=404, detail=f"State '{state}' not found in 10-state target region.")
    return {
        "state": st["name"],
        "state_id": st["id"],
        "count": len(st.get("districts", [])),
        "districts": st.get("districts", [])
    }


# 5. Regional Telemetry
@router.get("/telemetry/region")
async def get_regional_telemetry():
    """Returns aggregated Earth Observation telemetry across the 10 target states."""
    overview = await region_service.get_regional_overview()
    return {
        "region": TARGET_REGION_NAME,
        "bbox": TARGET_REGION_BBOX,
        "states_monitored": len(TARGET_STATES),
        "overview": overview
    }


# 6. State Telemetry
@router.get("/telemetry/state/{state}")
async def get_state_telemetry(state: str):
    """Returns real Earth Observation telemetry for the specified state."""
    st = get_state(state)
    if not st:
        raise HTTPException(status_code=404, detail=f"State '{state}' not found in 10-state target region.")
    return await region_service.get_state_telemetry(state)


# 7. Regional Landslides (NASA COOLR)
@router.get("/landslides/region")
async def get_regional_landslides(limit: int = Query(100, ge=1, le=500)):
    """
    Returns actual NASA COOLR landslide events spatially filtered to the 10 target states.
    Markers include: Event title, Date, Coordinates, Trigger, Source, Event ID.
    Never generates fake events.
    """
    return await nasa_coolr_service.fetch_region_events(limit=limit)


# 8. State Landslides (NASA COOLR)
@router.get("/landslides/state/{state}")
async def get_state_landslides(state: str, limit: int = Query(50, ge=1, le=200)):
    """Returns NASA COOLR landslide events for the specified state."""
    st = get_state(state)
    if not st:
        raise HTTPException(status_code=404, detail=f"State '{state}' not found in 10-state target region.")
    return await nasa_coolr_service.fetch_state_events(st["name"], limit=limit)


# 9. Regional Risk (Apda Mitra XGBoost)
@router.get("/risk/region")
async def get_regional_risk():
    """
    Returns AI risk across the region.
    If the XGBoost model is not available, returns status: 'model_unavailable'
    and AI RISK: MODEL NOT AVAILABLE. Never displays fake percentages.
    """
    return await region_service.get_regional_risk()


# 10. State Risk
@router.get("/risk/state/{state}")
async def get_state_risk(state: str):
    """Returns AI risk prediction status for the specified state."""
    st = get_state(state)
    if not st:
        raise HTTPException(status_code=404, detail=f"State '{state}' not found in 10-state target region.")
    lat, lon = st["centroid"]
    return xgboost_service.predict(latitude=lat, longitude=lon)


# 11. Predict Risk (POST)
@router.post("/risk/predict")
async def predict_risk(payload: RiskPredictionRequest):
    """
    Evaluates real trained XGBoost model.
    If model is unavailable, returns status: 'model_unavailable'.
    Never generates a fake percentage.
    """
    return xgboost_service.predict(
        latitude=payload.latitude,
        longitude=payload.longitude,
        rainfall_1h=payload.rainfall_1h,
        rainfall_3h=payload.rainfall_3h,
        rainfall_24h=payload.rainfall_24h,
        rainfall_7d=payload.rainfall_7d,
        rainfall_30d=payload.rainfall_30d,
        soil_moisture=payload.soil_moisture,
        soil_moisture_anomaly=payload.soil_moisture_anomaly,
        elevation=payload.elevation,
        slope=payload.slope,
        aspect=payload.aspect,
        curvature=payload.curvature
    )
