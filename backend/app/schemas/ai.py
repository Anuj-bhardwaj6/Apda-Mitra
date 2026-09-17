from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class RiskAssessmentRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    district: Optional[str] = None
    state: Optional[str] = None
    active_hazard_type: Optional[str] = Field(default=None, description="CYCLONE, FLOOD, LANDSLIDE, etc.")


class HazardRiskBreakdown(BaseModel):
    cyclone_wind_risk: float
    flood_inundation_risk: float
    landslide_slope_risk: float
    urban_waterlogging_risk: float


class RiskFactorContribution(BaseModel):
    feature_name: str
    impact_weight_percent: float
    description: str
    direction: str = Field(..., description="INCREASING or MITIGATING")


class RiskAssessmentResponse(BaseModel):
    composite_risk_score: float = Field(..., ge=0.0, le=1.0, description="Normalized risk index")
    severity_level: str = Field(..., description="CRITICAL, HIGH, MODERATE, LOW")
    confidence_score: float
    hazard_breakdown: HazardRiskBreakdown
    primary_threat: str
    top_contributing_factors: List[RiskFactorContribution]


class TrajectoryPredictionItem(BaseModel):
    hours_ahead: int
    projected_latitude: float
    projected_longitude: float
    estimated_intensity_kmh: float
    surge_height_meters: float


class PredictionResponse(BaseModel):
    hazard_id: str
    hazard_type: str
    forecast_window_hours: int
    projected_inundation_sqkm: float
    estimated_landfall_time: Optional[str] = None
    trajectory: List[TrajectoryPredictionItem] = Field(default_factory=list)


class RecommendationResponse(BaseModel):
    evacuation_mandated: bool
    priority_level: str
    immediate_actions: List[str]
    nearest_safe_shelter_id: Optional[str] = None
    recommended_corridor_name: Optional[str] = None
    emergency_contacts: Dict[str, str]


class ExplainabilityResponse(BaseModel):
    model_name: str
    composite_score: float
    base_value: float
    shap_contributions: List[RiskFactorContribution]
    summary: str
