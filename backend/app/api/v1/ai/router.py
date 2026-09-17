from fastapi import APIRouter, Query
from app.schemas.ai import (
    ExplainabilityResponse,
    PredictionResponse,
    RecommendationResponse,
    RiskAssessmentRequest,
    RiskAssessmentResponse,
)
from app.schemas.base import ApiResponse
from app.services.ai.prediction_engine import PredictionEngine
from app.services.ai.recommendation_engine import RecommendationEngine
from app.services.ai.risk_engine import RiskEngine
from app.services.ai.shap_engine import ShapExplainabilityEngine

from app.api.v1.ai.landslide_router import router as landslide_router

router = APIRouter(prefix="/ai", tags=["AI Disaster Intelligence Engines"])
router.include_router(landslide_router)


@router.post(
    "/risk-assessment",
    response_model=ApiResponse[RiskAssessmentResponse],
    summary="Compute Multi-Hazard Composite Risk Index",
)
async def assess_risk(payload: RiskAssessmentRequest) -> ApiResponse[RiskAssessmentResponse]:
    result = await RiskEngine.assess_risk(
        latitude=payload.latitude,
        longitude=payload.longitude,
        district=payload.district,
        active_hazard_type=payload.active_hazard_type,
    )
    return ApiResponse.ok(data=result, message="AI Risk Assessment synthesized.")


@router.get(
    "/prediction",
    response_model=ApiResponse[PredictionResponse],
    summary="Predict Hazard Trajectory and Footprint",
)
async def predict_hazard(
    hazard_type: str = Query(default="CYCLONE"),
    lat: float = Query(default=20.82),
    lon: float = Query(default=87.21),
    hours: int = Query(default=24, ge=3, le=72),
) -> ApiResponse[PredictionResponse]:
    prediction = await PredictionEngine.predict_hazard_trajectory(
        hazard_type=hazard_type, origin_lat=lat, origin_lon=lon, forecast_hours=hours
    )
    return ApiResponse.ok(data=prediction, message="Hazard progression projected.")


@router.get(
    "/recommendations",
    response_model=ApiResponse[RecommendationResponse],
    summary="Generate Automated Mitigation SOPs",
)
async def get_recommendations(
    risk_score: float = Query(..., ge=0.0, le=1.0),
    hazard_type: str = Query(default="CYCLONE"),
    district: str = Query(default="Balasore"),
) -> ApiResponse[RecommendationResponse]:
    recs = await RecommendationEngine.generate_recommendations(
        composite_risk=risk_score, hazard_type=hazard_type, district=district
    )
    return ApiResponse.ok(data=recs, message="Operational advisories generated.")


@router.get(
    "/explain",
    response_model=ApiResponse[ExplainabilityResponse],
    summary="SHAP Model Explainability Analysis",
)
async def explain_risk_model(
    lat: float = Query(...),
    lon: float = Query(...),
    district: str = Query(default=None),
) -> ApiResponse[ExplainabilityResponse]:
    explanation = await ShapExplainabilityEngine.explain_risk_assessment(lat, lon, district)
    return ApiResponse.ok(data=explanation, message="SHAP feature attributions generated.")
