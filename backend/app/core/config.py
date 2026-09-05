import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Apda Mitra (à¤†à¤ªà¤¦à¤¾ à¤®à¤¿à¤¤à¥à¤°)"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "apda-mitra-disaster-intelligence-secret-key-2026-sih")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # Database - Primary PostgreSQL + PostGIS with SQLite fallback if PG not reachable locally
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+psycopg2://postgres:postgres@localhost:5432/apdamitra"
    )
    
    # External Live APIs
    OPEN_METEO_BASE_URL: str = "https://api.open-meteo.com/v1/forecast"
    OPEN_METEO_GEOCODING_BASE_URL: str = "https://geocoding-api.open-meteo.com/v1/search"
    OPEN_METEO_FLOOD_BASE_URL: str = "https://flood-api.open-meteo.com/v1/flood"
    OPEN_METEO_AIR_QUALITY_BASE_URL: str = "https://air-quality-api.open-meteo.com/v1/air-quality"
    OPEN_METEO_ELEVATION_BASE_URL: str = "https://api.open-meteo.com/v1/elevation"
    OPEN_METEO_ARCHIVE_BASE_URL: str = "https://archive-api.open-meteo.com/v1/archive"
    OPEN_METEO_ENSEMBLE_BASE_URL: str = "https://ensemble-api.open-meteo.com/v1/ensemble"
    NOMINATIM_BASE_URL: str = "https://nominatim.openstreetmap.org"

    
    # Default Landslide Threshold Config (configurable & extensible)
    LANDSLIDE_RAINFALL_24H_THRESHOLD_MM: float = 80.0
    LANDSLIDE_RAINFALL_72H_THRESHOLD_MM: float = 140.0
    LANDSLIDE_SOIL_MOISTURE_CRITICAL_PCT: float = 75.0
    LANDSLIDE_SLOPE_CRITICAL_DEG: float = 25.0

    class Config:
        case_sensitive = True

settings = Settings()
