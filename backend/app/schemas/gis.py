from typing import List, Optional
from pydantic import BaseModel, Field


class Coordinates(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class EvacuationRouteDetail(BaseModel):
    id: str
    name: str
    origin: List[float]  # [lat, lon]
    destination: List[float]  # [lat, lon]
    polyline_coordinates: List[List[float]]  # list of [lat, lon]
    distance_km: float
    duration_minutes: int
    safety_score_percent: int
    road_hazards_avoided: List[str]
    is_alternative: bool = False


class EvacuationRouteRequest(BaseModel):
    origin: Coordinates
    destination: Coordinates


class EvacuationRouteResponse(BaseModel):
    primary_route: EvacuationRouteDetail
    alternative_route: Optional[EvacuationRouteDetail] = None


class HazardPolygonResponse(BaseModel):
    id: str
    name: str
    type: str  # flood, landslide, cyclone_wind
    severity: str  # CRITICAL, HIGH, MODERATE
    coordinates: List[List[float]]  # polygon ring of [lat, lon]
    fill_color: str
    stroke_color: str
    description: str


class GeocodedLocationResponse(BaseModel):
    id: str
    name: str
    formatted_address: str
    district: str
    state: str
    country: str = "India"
    postal_code: Optional[str] = None
    latitude: float
    longitude: float
    category: str
    distance_meters: Optional[float] = None
