from fastapi import APIRouter, Query
from datetime import datetime, timezone
from app.schemas.schemas import TerrainProfile, TrustLayer
from app.adapters.elevation import ElevationAdapter
from app.services.geocoding_service import reverse_geocode

router = APIRouter(prefix="/elevation", tags=["Terrain & Elevation Intelligence"])

@router.get("", response_model=TerrainProfile)
@router.get("/", response_model=TerrainProfile)
@router.get("/profile", response_model=TerrainProfile)
async def get_elevation_profile(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180)
):

    """
    Calculates precise terrain elevation, slope gradient, and aspect via Open-Meteo Elevation API.
    """
    profile = await ElevationAdapter.get_terrain_profile(latitude, longitude)
    loc = await reverse_geocode(latitude, longitude)

    trust = TrustLayer(
        source=profile.get("source", "Open-Meteo Elevation API"),
        updatedAt=datetime.now(timezone.utc).isoformat(),
        confidence=0.98,
        dataFreshness="Live Topographic Sampling"
    )

    return TerrainProfile(
        location_name=loc,
        latitude=latitude,
        longitude=longitude,
        elevation_m=profile["elevation_m"],
        slope_degrees=profile["slope_degrees"],
        aspect_degrees=profile["aspect_degrees"],
        terrain_type=profile["terrain_type"],
        source=profile["source"],
        trust_layer=trust
    )
