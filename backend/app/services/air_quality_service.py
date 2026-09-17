import logging
from typing import Dict, Any
from app.adapters.open_meteo_air_quality import OpenMeteoAirQualityAdapter

logger = logging.getLogger(__name__)

async def fetch_air_quality_telemetry(lat: float, lon: float) -> Dict[str, Any]:
    """
    Service Layer: Retrieves real-time AQI and pollutant indicators via OpenMeteoAirQualityAdapter.
    """
    return await OpenMeteoAirQualityAdapter.get_air_quality(lat, lon)
