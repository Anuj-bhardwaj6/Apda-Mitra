from fastapi import APIRouter, Query
from typing import List, Dict, Any
from app.services.geocoding_service import search_places, get_structured_location

router = APIRouter(prefix="/geocoding", tags=["Geocoding & Location Intelligence"])

@router.get("/reverse")
async def reverse_geocode_endpoint(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180)
) -> Dict[str, Any]:
    """
    Reverse geocodes coordinates to a structured administrative hierarchy (Village, Taluk, District, State, Country).
    """
    structured = await get_structured_location(latitude, longitude)
    return {
        "success": True,
        "data": structured,
        "source": structured.get("source", "Nominatim OSM Live"),
        "confidence": 0.96
    }

@router.get("/search")
async def search_places_endpoint(
    q: str = Query(..., min_length=1, description="Query string across Indian locations"),
    limit: int = Query(8, ge=1, le=20)
) -> List[Dict[str, Any]]:
    """
    Place search via Open-Meteo Geocoding API with existing OSM fallbacks.
    """
    return await search_places(q, limit=limit)
