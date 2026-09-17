"""
Pydantic schemas for the Landslide Risk Prediction Endpoint.
Strict validation: All 14 input features are required. Missing features or
out-of-range values are rejected immediately.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class LandslideRiskPredictionRequest(BaseModel):
    """
    Strict input contract for XGBoost Landslide Risk Prediction.
    Never silently substitutes fake environmental values.
    """
    model_config = ConfigDict(extra="forbid")

    latitude: float = Field(
        ...,
        ge=-90.0,
        le=90.0,
        description="WGS84 Latitude (-90.0 to 90.0)",
    )
    longitude: float = Field(
        ...,
        ge=-180.0,
        le=180.0,
        description="WGS84 Longitude (-180.0 to 180.0)",
    )
    date: str = Field(
        ...,
        min_length=4,
        description="Observation or forecast date (e.g., 'YYYY-MM-DD')",
    )

    # Mandatory precipitation accumulation features (mm)
    rainfall_1d: float = Field(
        ...,
        ge=0.0,
        description="1-day cumulative rainfall in mm",
    )
    rainfall_3d: float = Field(
        ...,
        ge=0.0,
        description="3-day cumulative rainfall in mm",
    )
    rainfall_7d: float = Field(
        ...,
        ge=0.0,
        description="7-day cumulative rainfall in mm",
    )
    rainfall_15d: float = Field(
        ...,
        ge=0.0,
        description="15-day cumulative rainfall in mm",
    )
    rainfall_30d: float = Field(
        ...,
        ge=0.0,
        description="30-day cumulative rainfall in mm",
    )

    # Mandatory soil moisture features
    soil_moisture: float = Field(
        ...,
        ge=0.0,
        description="Volumetric topsoil moisture (m³/m³)",
    )
    soil_moisture_anomaly: float = Field(
        ...,
        description="Climatological standardized anomaly for soil moisture (σ)",
    )

    # Mandatory geomorphological features
    elevation: float = Field(
        ...,
        ge=-500.0,
        le=9000.0,
        description="Terrain elevation in meters",
    )
    slope: float = Field(
        ...,
        ge=0.0,
        le=90.0,
        description="Slope gradient in degrees (0.0 to 90.0)",
    )
    aspect: float = Field(
        ...,
        ge=0.0,
        le=360.0,
        description="Slope aspect in degrees (0.0 to 360.0)",
    )
    curvature: float = Field(
        ...,
        description="Surface profile curvature (m⁻¹)",
    )


class TopFactor(BaseModel):
    """Structured contributing factor with genuine SHAP attribution."""
    factor: str = Field(..., description="Human-readable factor name, e.g., '7-day rainfall'")
    contribution: str = Field(..., description="Contribution tier, e.g., 'high contribution'")
    shap_value: float = Field(..., description="Exact additive SHAP log-odds attribution")
    feature_value: Optional[float] = Field(None, description="Reported feature value")
    summary: Optional[str] = Field(None, description="Summary formatted string")


class LandslideRiskPredictionResponse(BaseModel):
    """Response contract for POST /api/v1/predict/landslide-risk."""
    risk_probability: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Predicted statistical landslide failure probability",
    )
    risk_level: str = Field(
        ...,
        description="Experimental risk tier ('Low', 'Moderate', 'High', 'Critical')",
    )
    top_factors: List[TopFactor] = Field(
        default_factory=list,
        description="List of top contributing environmental and topographical factors",
    )
