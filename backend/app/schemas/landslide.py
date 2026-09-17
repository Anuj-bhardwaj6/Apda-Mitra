from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class LandslideRiskRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="WGS84 Latitude")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="WGS84 Longitude")
    # Optional weather overrides for simulation / manual forecast input
    rainfall_24h: Optional[float] = Field(None, ge=0.0, description="24h cumulative rainfall in mm")
    rainfall_72h: Optional[float] = Field(None, ge=0.0, description="72h cumulative rainfall in mm")
    rainfall_7d: Optional[float] = Field(None, ge=0.0, description="7-day cumulative rainfall in mm")
    slope: Optional[float] = Field(None, ge=0.0, le=90.0, description="Slope gradient in degrees")
    elevation: Optional[float] = Field(None, description="Terrain elevation in meters")
    soil_moisture_surface: Optional[float] = Field(None, ge=0.0, le=1.0, description="Topsoil volumetric moisture")
    # Inference options
    include_shap: bool = Field(default=True, description="Compute SHAP feature attribution breakdown")
    generate_plot: bool = Field(default=False, description="Generate base64 waterfall plot")


class LandslideBatchRequest(BaseModel):
    points: List[LandslideRiskRequest] = Field(..., description="List of coordinate points to evaluate")
    include_shap: bool = Field(default=False, description="Compute SHAP for each point (slower for large batches)")


class LandslideFeatureContribution(BaseModel):
    feature: str
    value: float
    shap_value: float
    reason: Optional[str] = None


class LandslideShapExplanation(BaseModel):
    base_value: float
    method: str
    contributions: Optional[List[Dict[str, Any]]] = None
    top_risk_drivers: List[Dict[str, Any]] = Field(default_factory=list)
    top_mitigating_factors: List[Dict[str, Any]] = Field(default_factory=list)
    waterfall_plot_path: Optional[str] = None
    waterfall_plot_base64: Optional[str] = None


class LandslideRecommendation(BaseModel):
    alert_level: str = Field(..., description="RED, ORANGE, YELLOW, YELLOW_LOW, or GREEN")
    action_title: str
    civil_defence_action: str
    citizen_instructions: List[str]
    shelter_activation: bool


class LandslideRiskResponse(BaseModel):
    latitude: float
    longitude: float
    probability: float = Field(..., ge=0.0, le=1.0, description="Predicted landslide probability")
    risk_level: str = Field(..., description="LOW, MODERATE, HIGH, VERY_HIGH, or CRITICAL")
    confidence: float = Field(..., ge=0.0, le=1.0)
    source: str = Field(..., description="Inference engine source (model or heuristic)")
    model_version: str
    timestamp: str
    recommendation: LandslideRecommendation
    features: Dict[str, float]
    explanation: Optional[LandslideShapExplanation] = None


class ModelMetadataResponse(BaseModel):
    version: str
    is_loaded: bool
    model_path: str
    features_count: int
    metrics: Dict[str, Any] = Field(default_factory=dict)
    training_config: Dict[str, Any] = Field(default_factory=dict)
    manifest: Dict[str, Any] = Field(default_factory=dict)


class FeatureImportanceResponse(BaseModel):
    features: Dict[str, float]
    total_features: int
    version: str


class RetrainRequest(BaseModel):
    min_samples: Optional[int] = Field(50, description="Minimum new verified citizen reports to trigger retraining")
    force: bool = Field(False, description="Force retraining even if sample count threshold is not met")
    comment: Optional[str] = Field(None, description="Optional audit log remark")


class RetrainStatusResponse(BaseModel):
    job_id: str
    status: str = Field(..., description="PENDING, RUNNING, COMPLETED, FAILED, or ROLLED_BACK")
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    current_version: str
    previous_version: Optional[str] = None
    metrics_comparison: Optional[Dict[str, Any]] = None
    message: str


class RoadmapLivePredictionRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="WGS84 Latitude")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="WGS84 Longitude")
    rain_1h: Optional[float] = None
    rain_6h: Optional[float] = None
    rain_24h: Optional[float] = None
    rain_3d: Optional[float] = None
    rain_7d: Optional[float] = None
    soil_moisture: Optional[float] = None
    soil_moisture_anomaly: Optional[float] = None
    elevation: Optional[float] = None
    slope: Optional[float] = None
    aspect: Optional[float] = None


class RoadmapLivePredictionResponse(BaseModel):
    latitude: float
    longitude: float
    probability: float
    percentage: float
    risk_level: str
    color: str
    features: Dict[str, float]
    model_version: str
    explanation: Dict[str, Any]
    geofence_5km: Dict[str, Any]


class GeofenceAlertRequest(BaseModel):
    user_id: Optional[str] = Field("user-anonymous", description="Device / Client ID")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="User current latitude")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="User current longitude")
    has_opted_in: bool = Field(True, description="User location permission and alert opt-in")


class GeofenceAlertResponse(BaseModel):
    is_alert_triggered: bool
    threat_tier: str
    distance_to_critical_hazard_km: float
    hazard_location_name: str
    push_notification_payload: Optional[Dict[str, Any]] = None
    safe_evacuation_zone: Optional[Dict[str, Any]] = None

