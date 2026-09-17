from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class HourlyForecastItem(BaseModel):
    time: str
    temp_c: float
    rain_prob: float
    condition: str


class CurrentWeatherResponse(BaseModel):
    station_name: str
    state: str
    latitude: float
    longitude: float
    temperature_c: float
    feels_like_c: float
    condition: str
    rainfall_past_24h_mm: float
    precipitation_probability: float
    wind_speed_kmh: float
    wind_gust_kmh: float
    wind_direction: str
    humidity_percent: float
    uv_index: float
    aqi_value: int
    aqi_category: str
    radar_status: str
    radar_station: str
    imd_warning_color: str = Field(..., description="Red, Orange, Yellow, Green")
    hourly_forecast: List[HourlyForecastItem] = Field(default_factory=list)


class WeatherTelemetryRead(BaseModel):
    station_code: str
    station_name: str
    state: str
    temperature_c: float
    wind_speed_kmh: float
    precipitation_mm: float
    imd_warning_color: str
    recorded_at: datetime
