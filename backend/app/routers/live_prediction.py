"""
FastAPI Router for Live Environmental Landslide Prediction.
Endpoint: POST /api/v1/predict/live
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.services.ai.live_environmental_service import (
    get_live_environmental_service,
    EnvironmentalDataUnavailableError,
)

logger = logging.getLogger("apda_mitra.routers.live_prediction")

router = APIRouter(prefix="/predict", tags=["Live Environmental Prediction"])


class LivePredictionRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="WGS84 Latitude")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="WGS84 Longitude")
    date: Optional[str] = Field(None, description="Target evaluation date YYYY-MM-DD (defaults to current date)")


class LiveFactorItem(BaseModel):
    factor: str
    contribution: str
    shap_value: float
    feature_value: Optional[float] = None
    unit: Optional[str] = None
    direction: Optional[str] = None
    summary: Optional[str] = None


class LivePredictionResponse(BaseModel):
    latitude: float
    longitude: float
    date: str
    risk_probability: float
    risk_level: str
    top_factors: List[LiveFactorItem]
    explanation: str
    full_report: str
    features: Dict[str, float]
    data_freshness: Dict[str, str]
    data_sources: Dict[str, str]
    pipeline_version: str
    feature_schema_version: str


@router.post(
    "/live",
    response_model=LivePredictionResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate Live Landslide Hazard from Location Coordinates",
    description=(
        "Retrieves recent real-time Earth Observation telemetry (Copernicus DEM 30m, "
        "NASA POWER / GPM rainfall windows, NASA MERRA-2 soil moisture), computes identical "
        "training features, and executes the XGBoost model with SHAP explainability. "
        "Never returns fake values; raises HTTP 503 if required upstream data are unavailable."
    ),
)
async def predict_live_environmental_hazard(
    request: LivePredictionRequest,
) -> LivePredictionResponse:
    try:
        service = get_live_environmental_service()
        result = await service.predict_live(
            latitude=request.latitude,
            longitude=request.longitude,
            target_date=request.date,
        )
        return LivePredictionResponse(**result)
    except EnvironmentalDataUnavailableError as err:
        logger.error("Environmental telemetry unavailable: %s", err)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Required environmental data unavailable: {err.message}",
        )
    except ValueError as ve:
        logger.warning("Invalid request parameters: %s", ve)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve),
        )
    except Exception as exc:
        logger.error("Internal error during live hazard evaluation: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Environmental prediction pipeline error: {str(exc)}",
        )


@router.get(
    "/live",
    response_model=LivePredictionResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate Live Landslide Hazard via Query Parameters",
)
async def predict_live_environmental_hazard_get(
    latitude: float = Query(..., ge=-90.0, le=90.0),
    longitude: float = Query(..., ge=-180.0, le=180.0),
    date: Optional[str] = Query(None),
) -> LivePredictionResponse:
    req = LivePredictionRequest(latitude=latitude, longitude=longitude, date=date)
    return await predict_live_environmental_hazard(req)
