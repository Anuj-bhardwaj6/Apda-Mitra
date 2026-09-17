"""
APDA MITRA — AI Landslide Risk Prediction API
=============================================
Interface for evaluating the canonical Apda Mitra XGBoost model.
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional

from app.services.xgboost_service import xgboost_service

router = APIRouter(tags=["risk"])


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


@router.get("/model/status")
@router.get("/risk/model/status")
async def get_model_status():
    """
    Returns actual backend health, loaded status, and metadata for the XGBoost model.
    Separates MODEL STATUS from PREDICTION STATUS.
    """
    info = xgboost_service.get_model_status()
    return {
        "model": info,
        "model_status": "MODEL READY" if info["loaded"] else "MODEL UNAVAILABLE",
        "prediction_status": "INPUTS PARTIAL",
        "prediction_requirement": "Genuine 7-day and 30-day precipitation integration required for live inference.",
        "synthetic_substitution_prohibited": True
    }


@router.post("/risk/predict")
async def predict_risk(payload: RiskPredictionRequest):
    """
    Evaluates real trained XGBoost model.
    If model is unavailable, returns status: "model_unavailable".
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
