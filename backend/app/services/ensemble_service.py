import logging
from typing import Dict, Any
from app.adapters.open_meteo_ensemble import OpenMeteoEnsembleAdapter
from app.services.geocoding_service import reverse_geocode

logger = logging.getLogger(__name__)

class EnsembleService:
    @classmethod
    async def get_ensemble_summary(
        cls, 
        lat: float, 
        lon: float, 
        models: str = "icon_seamless",
        custom_location: str = None
    ) -> Dict[str, Any]:
        data = await OpenMeteoEnsembleAdapter.get_ensemble_forecast(lat, lon, models)
        loc_name = custom_location or await reverse_geocode(lat, lon)
        data["location_name"] = loc_name
        data["latitude"] = lat
        data["longitude"] = lon
        return data

ensemble_service = EnsembleService()
