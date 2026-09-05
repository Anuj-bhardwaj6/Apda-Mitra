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
class HourlyForecastItem(BaseModel):
    hour: int
    relative_hour: Optional[int] = None
    time_iso: Optional[str] = None
    temp_c: float
    precip_mm: float
    humidity: int
    precip_probability_pct: Optional[int] = None
    weather_code: Optional[int] = None
    condition: Optional[str] = None

class DailyForecastItem(BaseModel):
    day: int
    weather_code: Optional[int] = None
    condition: Optional[str] = None
    temp_max: float
    temp_min: float
    precip_sum: float
    precip_probability_max: Optional[int] = None

class WeatherSummary(BaseModel):
    location_name: str
    temperature_c: float
    feels_like_c: Optional[float] = None
    humidity_pct: int
    rainfall_24h_mm: float
    rainfall_72h_mm: float
    rainfall_weekly_mm: Optional[float] = None
    wind_speed_kmh: float
    wind_direction_deg: Optional[int] = None
    surface_pressure_hpa: float
    soil_moisture_pct: float
    soil_moisture_surface: Optional[float] = None
    soil_moisture_rootzone: Optional[float] = None
    soil_saturation_status: Optional[str] = None
    rainfall_alert_tier: Optional[str] = None
    uv_index: Optional[float] = None
    weather_code: Optional[int] = None
    weather_condition: str
    hourly_forecast: Optional[List[HourlyForecastItem]] = None
    daily_forecast: Optional[List[DailyForecastItem]] = None
    source: Optional[str] = None
    trust_layer: TrustLayer

# --- Open-Meteo Flood Schemas ---
class FloodDailyStep(BaseModel):
    date: str
    day: int
    river_discharge_m3s: float
    river_discharge_mean_m3s: float
    river_discharge_max_m3s: float
    river_discharge_min_m3s: float

class FloodSummary(BaseModel):
    location_name: str
    latitude: float
    longitude: float
    current_discharge_m3s: float
    mean_discharge_m3s: float
    peak_discharge_m3s: float
    discharge_trend: str
    flood_risk_level: str
    alert_tier: str
    recommendation: str
    daily_forecast: List[FloodDailyStep]
    source: str
    trust_layer: TrustLayer

# --- Open-Meteo Air Quality Schemas ---
class AirQualitySummary(BaseModel):
    location_name: str
    latitude: float
    longitude: float
    us_aqi: int
    european_aqi: int
    pm2_5: float
    pm10: float
    nitrogen_dioxide: float
    sulphur_dioxide: float
    ozone: float
    carbon_monoxide: float
    aqi_category: str
    aqi_color: str
    health_advisory: str
    source: str
    trust_layer: TrustLayer

# --- Open-Meteo Elevation / Terrain Profile Schemas ---
class TerrainProfile(BaseModel):
    location_name: str
    latitude: float
    longitude: float
    elevation_m: float
    slope_degrees: float
    aspect_degrees: float
    terrain_type: str
    source: str
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

# --- Phase 3: Historical Weather Schemas (AI/ML Ready) ---
class HistoricalDayStep(BaseModel):
    date: str
    temp_max_c: float
    temp_min_c: float
    temp_mean_c: float
    precipitation_mm: float
    wind_speed_max_kmh: float
    humidity_mean_pct: float

class MLTrainingFeatureVector(BaseModel):
    timestamp: str
    latitude: float
    longitude: float
    precip_7d_sum_mm: float
    precip_14d_sum_mm: float
    temp_mean_c: float
    humidity_mean_pct: float
    wind_max_kmh: float
    antecedent_moisture_index: float
    normalized_features: Dict[str, float]

class HistoricalWeatherSummary(BaseModel):
    location_name: str
    latitude: float
    longitude: float
    start_date: str
    end_date: str
    lookback_days: int
    total_rainfall_mm: float
    rainfall_anomaly_pct: float
    mean_temperature_c: float
    max_wind_speed_kmh: float
    rainfall_trend: str # Increasing, Decreasing, Stable
    daily_history: List[HistoricalDayStep]
    ml_feature_vector: MLTrainingFeatureVector
    source: str
    trust_layer: TrustLayer

# --- Phase 3: Ensemble Forecast Schemas ---
class EnsembleDailyStep(BaseModel):
    date: str
    precip_mean_mm: float
    precip_min_mm: float
    precip_max_mm: float
    precip_spread_mm: float
    temp_mean_c: float
    temp_min_c: float
    temp_max_c: float
    confidence_pct: float

class EnsembleForecastSummary(BaseModel):
    location_name: str
    latitude: float
    longitude: float
    member_count: int
    model_name: str
    overall_confidence_pct: float
    uncertainty_level: str # Low Uncertainty, Moderate Uncertainty, High Uncertainty
    mean_precipitation_next_48h_mm: float
    max_member_precipitation_48h_mm: float
    exceedance_prob_10mm_pct: float
    exceedance_prob_25mm_pct: float
    exceedance_prob_50mm_pct: float
    daily_forecast: List[EnsembleDailyStep]
    source: str
    trust_layer: TrustLayer

# --- Phase 3: Explainable Disaster Risk Analysis Schemas ---
class RiskFactorReason(BaseModel):
    category: str # Rainfall, Slope, River, Soil, Ensemble, AirQuality
    title: str
    title_hi: str
    severity: str # low, medium, high, critical
    score_contribution: float
    description: str
    metric_value: str

class DisasterRiskAnalysisResponse(BaseModel):
    location_name: str
    latitude: float
    longitude: float
    overall_risk_score: float # 0 to 100
    risk_level: str # LOW, MEDIUM, HIGH, CRITICAL
    disclaimer: str
    headline: str
    headline_hi: str
    action_guidance: str
    reasons: List[RiskFactorReason]
    environmental_snapshot: Dict[str, Any]
    source: str
    trust_layer: TrustLayer

