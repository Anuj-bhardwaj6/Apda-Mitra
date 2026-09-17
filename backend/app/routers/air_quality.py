from fastapi import APIRouter, Query
from datetime import datetime, timezone
from app.schemas.schemas import AirQualitySummary, TrustLayer
from app.services.air_quality_service import fetch_air_quality_telemetry
from app.services.geocoding_service import reverse_geocode

router = APIRouter(prefix="/air-quality", tags=["Atmospheric & Environmental Health"])

@router.get("/current", response_model=AirQualitySummary)
async def get_air_quality_current(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180)
):
    """
    Retrieves real-time atmospheric air quality (AQI, PM2.5, PM10, NO2, O3) via Open-Meteo Air Quality API.
    """
    aq = await fetch_air_quality_telemetry(latitude, longitude)
    loc = await reverse_geocode(latitude, longitude)

    trust = TrustLayer(
        source=aq.get("source", "Open-Meteo Air Quality API"),
        updatedAt=datetime.now(timezone.utc).isoformat(),
        confidence=0.96 if aq.get("is_live", True) else 0.88,
        dataFreshness="Live Atmosphere Telemetry"
    )

    return AirQualitySummary(
        location_name=loc,
        latitude=latitude,
        longitude=longitude,
        us_aqi=aq["us_aqi"],
        european_aqi=aq["european_aqi"],
        pm2_5=aq["pm2_5"],
        pm10=aq["pm10"],
        nitrogen_dioxide=aq["nitrogen_dioxide"],
        sulphur_dioxide=aq["sulphur_dioxide"],
        ozone=aq["ozone"],
        carbon_monoxide=aq["carbon_monoxide"],
        aqi_category=aq["aqi_category"],
        aqi_color=aq["aqi_color"],
        health_advisory=aq["health_advisory"],
        source=aq.get("source", "Open-Meteo Air Quality API"),
        trust_layer=trust
    )
