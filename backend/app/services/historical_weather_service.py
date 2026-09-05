import logging
from typing import Dict, Any
from app.adapters.open_meteo_historical import OpenMeteoHistoricalAdapter
from app.services.geocoding_service import reverse_geocode

logger = logging.getLogger(__name__)

class HistoricalWeatherService:
    @classmethod
    async def get_historical_summary(
        cls, 
        lat: float, 
        lon: float, 
        lookback_days: int = 14,
        custom_location: str = None
    ) -> Dict[str, Any]:
        data = await OpenMeteoHistoricalAdapter.get_historical_weather(lat, lon, lookback_days)
        loc_name = custom_location or await reverse_geocode(lat, lon)
        data["location_name"] = loc_name
        data["latitude"] = lat
        data["longitude"] = lon
        return data

historical_weather_service = HistoricalWeatherService()
