import logging
from typing import Dict, Any
from app.services.hazards.base_hazard import BaseHazardModule
from app.services.hazards.landslide_module import LandslideModule
from app.services.weather_service import fetch_live_weather
from app.services.geocoding_service import reverse_geocode

logger = logging.getLogger(__name__)

class HazardEngine:
    """
    Unified Hazard Engine orchestrator for Apda Mitra.
    Routes prediction requests to specific registered hazard modules (Landslide, Flood, etc.).
    """
    def __init__(self):
        self._modules: Dict[str, BaseHazardModule] = {}
        # Register implemented modules
        self.register_module(LandslideModule())

    def register_module(self, module: BaseHazardModule):
        self._modules[module.hazard_type.lower()] = module
        logger.info(f"Registered Hazard Module: {module.hazard_type}")

    async def evaluate_hazard(self, lat: float, lon: float, hazard_type: str = "landslide", custom_location: str = None) -> Dict[str, Any]:
        hazard_key = hazard_type.lower()
        module = self._modules.get(hazard_key, self._modules.get("landslide"))

        # Fetch real live weather data from Open-Meteo API
        weather_data = await fetch_live_weather(lat, lon)

        # Get human-readable location name via Nominatim reverse geocode
        location_name = custom_location or await reverse_geocode(lat, lon)

        # Execute evaluation
        result = await module.evaluate(lat, lon, weather_data, location_name)
        return result

hazard_engine = HazardEngine()
