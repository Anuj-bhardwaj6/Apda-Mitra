from fastapi import APIRouter, Query
from datetime import datetime, timezone
from app.schemas.schemas import EnsembleForecastSummary, TrustLayer
from app.services.ensemble_service import ensemble_service

router = APIRouter(prefix="/weather/ensemble", tags=["Ensemble Weather & Uncertainty Intelligence"])

@router.get("", response_model=EnsembleForecastSummary)
@router.get("/", response_model=EnsembleForecastSummary)
async def get_ensemble_forecast_endpoint(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    models: str = Query("icon_seamless"),
    location_name: str = Query(None)
):
    """
    Returns multi-member ensemble forecast spread, forecast mean,
    confidence indicators, and exceedance probabilities.
    """
    data = await ensemble_service.get_ensemble_summary(
        lat=latitude,
        lon=longitude,
        models=models,
        custom_location=location_name
    )

    trust = TrustLayer(
        source=data.get("source", "Open-Meteo Ensemble API"),
        updatedAt=datetime.now(timezone.utc).isoformat(),
        confidence=round(data.get("overall_confidence_pct", 75.0) / 100.0, 2),
        dataFreshness=f"{data.get('member_count', 30)}-Member Ensemble Run"
    )

    data["trust_layer"] = trust
    return data
