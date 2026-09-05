import logging
from typing import List, Dict, Any
from app.adapters.open_meteo_geocoding import OpenMeteoGeocodingAdapter
from app.adapters.nominatim import NominatimAdapter
from app.adapters.photon import PhotonAdapter

logger = logging.getLogger(__name__)

async def reverse_geocode(lat: float, lon: float) -> str:
    """
    Service Layer: Resolves human-readable place name via NominatimAdapter.
    """
    res = await NominatimAdapter.reverse_geocode(lat, lon)
    return res.get("formatted_name", f"{lat:.3f}°N, {lon:.3f}°E")

async def get_structured_location(lat: float, lon: float) -> Dict[str, Any]:
    """
    Service Layer: Returns detailed administrative hierarchy.
    """
    return await NominatimAdapter.reverse_geocode(lat, lon)

async def search_places(query: str, limit: int = 8) -> List[Dict[str, Any]]:
    """
    Service Layer: Performs Indian place search via Open-Meteo first,
    then falls back to Photon/Nominatim through PhotonAdapter.
    """
    open_meteo_results = await OpenMeteoGeocodingAdapter.search(query, limit=limit)
    if open_meteo_results:
        return open_meteo_results
    return await PhotonAdapter.search(query, limit=limit)
