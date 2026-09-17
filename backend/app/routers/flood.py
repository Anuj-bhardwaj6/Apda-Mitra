from fastapi import APIRouter, Query
from datetime import datetime, timezone
from app.schemas.schemas import FloodSummary, TrustLayer, FloodDailyStep
from app.services.flood_service import fetch_flood_intelligence
from app.services.geocoding_service import reverse_geocode

router = APIRouter(prefix="/flood", tags=["Flood & River Basin Intelligence"])

@router.get("/forecast", response_model=FloodSummary)
async def get_flood_forecast(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180)
):
    """
    Retrieves real-time river basin discharge, 3-day inundation forecast, and flood warning levels via Open-Meteo Flood API.
    """
    f = await fetch_flood_intelligence(latitude, longitude)
    loc = await reverse_geocode(latitude, longitude)

    trust = TrustLayer(
        source=f.get("source", "Open-Meteo Flood API"),
        updatedAt=datetime.now(timezone.utc).isoformat(),
        confidence=0.95 if f.get("is_live", True) else 0.85,
        dataFreshness="Live Catchment Hydrology"
    )

    daily_steps = [
        FloodDailyStep(
            date=d["date"],
            day=d["day"],
            river_discharge_m3s=d["river_discharge_m3s"],
            river_discharge_mean_m3s=d["river_discharge_mean_m3s"],
            river_discharge_max_m3s=d["river_discharge_max_m3s"],
            river_discharge_min_m3s=d["river_discharge_min_m3s"],
        )
        for d in f.get("daily_forecast", [])
    ]

    return FloodSummary(
        location_name=loc,
        latitude=latitude,
        longitude=longitude,
        current_discharge_m3s=f["current_discharge_m3s"],
        mean_discharge_m3s=f["mean_discharge_m3s"],
        peak_discharge_m3s=f["peak_discharge_m3s"],
        discharge_trend=f["discharge_trend"],
        flood_risk_level=f["flood_risk_level"],
        alert_tier=f["alert_tier"],
        recommendation=f["recommendation"],
        daily_forecast=daily_steps,
        source=f.get("source", "Open-Meteo Flood API"),
        trust_layer=trust
    )
