from fastapi import APIRouter, HTTPException, Query
from app.schemas.base import ApiResponse
from app.schemas.weather import CurrentWeatherResponse
from app.services.external.imd import IMDWeatherService
from app.services.external.open_meteo import OpenMeteoService

router = APIRouter(prefix="/weather", tags=["Meteorology & Doppler Radar"])


@router.get(
    "/current",
    response_model=ApiResponse[CurrentWeatherResponse],
    summary="Get Real-Time Weather Telemetry",
    description="Queries Open-Meteo REST API with Redis caching and IMD alert color categorization.",
)
async def get_current_weather(
    lat: float = Query(..., ge=-90, le=90, description="Latitude in decimal degrees"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude in decimal degrees"),
) -> ApiResponse[CurrentWeatherResponse]:
    data = await OpenMeteoService.get_weather(lat, lon)
    if not data:
        raise HTTPException(
            status_code=502,
            detail="Failed to retrieve live meteorological data from satellite telemetry.",
        )

    return ApiResponse.ok(data=data, message="Weather telemetry fetched successfully.")


@router.get(
    "/radar-tiles",
    response_model=ApiResponse[dict],
    summary="Get IMD Doppler Weather Radar Tile Template",
)
async def get_radar_tiles() -> ApiResponse[dict]:
    tile_url = IMDWeatherService.get_radar_tile_endpoint()
    return ApiResponse.ok(
        data={
            "tileUrlTemplate": tile_url,
            "provider": "India Meteorological Department",
            "format": "image/png",
            "minZoom": 3,
            "maxZoom": 18,
        },
        message="IMD Doppler radar tile endpoint ready.",
    )


@router.get(
    "/imd-bulletin",
    response_model=ApiResponse[dict],
    summary="Get IMD Severe Weather District Bulletin",
)
async def get_imd_bulletin(
    district_code: str = Query(default="BALASORE", description="Official district identifier"),
) -> ApiResponse[dict]:
    bulletin = await IMDWeatherService.get_district_weather_bulletin(district_code)
    return ApiResponse.ok(data=bulletin, message="Official IMD bulletin retrieved.")
