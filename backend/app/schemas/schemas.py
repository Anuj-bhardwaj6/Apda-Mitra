from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Auth Schemas ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str
    phone: Optional[str] = None
    role: str = "citizen"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    role: str
    is_active: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

# --- Trust Layer Envelope ---
class TrustLayer(BaseModel):
    source: str = "Open-Meteo + Hazard Engine v1.2"
    updatedAt: str
    confidence: float = 0.91
    dataFreshness: str = "Live API"

# --- Saved Places ---
class SavedPlaceCreate(BaseModel):
    name: str
    place_type: str = "home" # home, parents_house, school, office, farm
    address: Optional[str] = None
    latitude: float
    longitude: float

class SavedPlaceOut(BaseModel):
    id: int
    user_id: int
    name: str
    place_type: str
    address: Optional[str] = None
    latitude: float
    longitude: float
    last_risk_level: str
    last_risk_score: float
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Hazard Engine Schemas ---
class HazardEvaluateRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    location_name: Optional[str] = None
    hazard_type: str = "landslide"

class TimelineStep(BaseModel):
    step: str # "now", "6h", "12h", "tomorrow"
    label: str # "Now", "+6 Hours", "+12 Hours", "Tomorrow"
    risk_level: str # Low, Moderate, High, Severe
    risk_score: float # 0-100
    rainfall_mm: float
    soil_moisture_pct: float

class HazardEvaluateResponse(BaseModel):
    hazard_type: str = "landslide"
    location_name: str
    latitude: float
    longitude: float
    risk_score: float
    risk_level: str
    confidence: float
    xai_reasons: List[str]
    recommendations: List[str]
    timeline: List[TimelineStep]
    trust_layer: TrustLayer

# --- Live Weather Response ---
class WeatherSummary(BaseModel):
    location_name: str
    temperature_c: float
    humidity_pct: int
    rainfall_24h_mm: float
    rainfall_72h_mm: float
    wind_speed_kmh: float
    surface_pressure_hpa: float
    soil_moisture_pct: float
    weather_condition: str
    trust_layer: TrustLayer

# --- Citizen Report Schemas ---
class CitizenReportCreate(BaseModel):
    category: str # Landslide, Rockfall, Tree Fall, Road Block, Flood, Other
    description: Optional[str] = None
    latitude: float
    longitude: float
    location_name: Optional[str] = None
    photo_url: Optional[str] = None

class CitizenReportOut(BaseModel):
    id: int
    reporter_name: str
    category: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    location_name: Optional[str] = None
    photo_url: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Shelters & Emergency Contacts ---
class ShelterOut(BaseModel):
    id: int
    name: str
    facility_type: str
    address: str
    district: str
    latitude: float
    longitude: float
    capacity: int
    current_occupancy: int
    contact_phone: Optional[str] = None
    distance_km: Optional[float] = None

    class Config:
        from_attributes = True

class EmergencyContactOut(BaseModel):
    id: int
    service_name: str
    category: str
    phone: str
    description: Optional[str] = None
    sort_order: int

    class Config:
        from_attributes = True

class AlertOut(BaseModel):
    id: int
    title: str
    district: str
    hazard_type: str
    severity: str
    summary: str
    action_guidance: str
    issued_at: datetime

    class Config:
        from_attributes = True

# --- AI Assistant Schemas ---
class ChatMessage(BaseModel):
    role: str # user, assistant
    content: str

class ChatRequest(BaseModel):
    message: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    context_location: Optional[str] = None

class ChatResponse(BaseModel):
    reply: str
    tools_executed: List[str]
    structured_data: Optional[Dict[str, Any]] = None
    trust_layer: TrustLayer
