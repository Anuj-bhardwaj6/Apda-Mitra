from typing import List
from fastapi import APIRouter, Query
from app.schemas.base import ApiResponse
from app.schemas.gis import GeocodedLocationResponse
from app.services.external.nominatim import NominatimService

router = APIRouter(prefix="/geocoding", tags=["Spatial Geocoding & Addresses"])


@router.get(
    "/reverse",
    response_model=ApiResponse[GeocodedLocationResponse],
    summary="Reverse Geocode Coordinates to Administrative Address",
)
async def reverse_geocode(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
) -> ApiResponse[GeocodedLocationResponse]:
    result = await NominatimService.reverse_geocode(lat, lon)
    return ApiResponse.ok(data=result, message="Address resolved successfully.")


@router.get(
    "/search",
    response_model=ApiResponse[List[GeocodedLocationResponse]],
    summary="Search Indian Locations by Name or PIN",
)
async def search_locations(
    q: str = Query(..., min_length=2, description="Search query string"),
) -> ApiResponse[List[GeocodedLocationResponse]]:
    results = await NominatimService.search(q)
    return ApiResponse.ok(data=results, message=f"Found {len(results)} location match(es).")
