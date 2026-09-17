import os
from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Production Application Configuration using Pydantic v2 BaseSettings.
    Loads and validates environment variables from system environment or .env file.
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    # --- Application Meta ---
    PROJECT_NAME: str = "Apda Mitra (आपदा मित्र)"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    # --- Server & Networking ---
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ALLOWED_HOSTS: List[str] = ["*"]
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            return v
        return ["*"]

    @field_validator("ALLOWED_HOSTS", mode="before")
    @classmethod
    def assemble_allowed_hosts(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    # --- Database (PostgreSQL 16 + PostGIS) ---
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "apda_mitra"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/apda_mitra",
        description="Database connection URL"
    )
    SYNC_DATABASE_URL: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/apda_mitra",
        description="Sync connection URL for Alembic migrations"
    )
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800

    # --- Redis In-Memory Cache & Sessions ---
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: str = ""
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="Full Redis connection URI"
    )
    WEATHER_CACHE_TTL_SECONDS: int = 600       # 10 minutes
    PREDICTION_CACHE_TTL_SECONDS: int = 900    # 15 minutes
    LOCATION_CACHE_TTL_SECONDS: int = 86400    # 24 hours
    OTP_TTL_SECONDS: int = 300                 # 5 minutes

    # --- Security & JWT Cryptography ---
    SECRET_KEY: str = "apda-mitra-disaster-intelligence-secret-key-2026-sih"
    JWT_SECRET: str = "apda-mitra-disaster-intelligence-secret-key-2026-sih"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    MAX_FAILED_LOGIN_ATTEMPTS: int = 5
    ACCOUNT_LOCKOUT_MINUTES: int = 15
    OTP_EXPIRE_MINUTES: int = 5
    EMAIL_VERIFICATION_EXPIRE_HOURS: int = 24
    PASSWORD_RESET_EXPIRE_MINUTES: int = 15

    # --- Rate Limiting ---
    RATE_LIMIT_PER_MINUTE: int = 120

    # --- External AI & Disaster Intelligence APIs ---
    GEMINI_API_KEY: str = ""
    OPEN_METEO_API_KEY: str = ""
    NASA_API_KEY: str = ""
    ISRO_API_KEY: str = ""
    IMD_API_KEY: str = ""
    FIREBASE_KEY: str = ""
    GOOGLE_MAPS_KEY: str = ""
    SMS_PROVIDER_KEY: str = ""
    EMAIL_PROVIDER_KEY: str = ""

    # --- External Adapter Endpoints ---
    OPEN_METEO_BASE_URL: str = "https://api.open-meteo.com/v1/forecast"
    OPEN_METEO_GEOCODING_BASE_URL: str = "https://geocoding-api.open-meteo.com/v1/search"
    OPEN_METEO_FLOOD_BASE_URL: str = "https://flood-api.open-meteo.com/v1/flood"
    OPEN_METEO_AIR_QUALITY_BASE_URL: str = "https://air-quality-api.open-meteo.com/v1/air-quality"
    OPEN_METEO_ELEVATION_BASE_URL: str = "https://api.open-meteo.com/v1/elevation"
    OPEN_METEO_ARCHIVE_BASE_URL: str = "https://archive-api.open-meteo.com/v1/archive"
    OPEN_METEO_ENSEMBLE_BASE_URL: str = "https://ensemble-api.open-meteo.com/v1/ensemble"
    NOMINATIM_BASE_URL: str = "https://nominatim.openstreetmap.org"

    # --- Default Landslide Threshold Config ---
    LANDSLIDE_RAINFALL_24H_THRESHOLD_MM: float = 80.0
    LANDSLIDE_RAINFALL_72H_THRESHOLD_MM: float = 140.0
    LANDSLIDE_SOIL_MOISTURE_CRITICAL_PCT: float = 75.0
    LANDSLIDE_SLOPE_CRITICAL_DEG: float = 25.0

    # --- Spatial & GIS Constants ---
    SRID: int = 4326  # WGS 84 coordinate reference system
    INDIA_BBOX: List[float] = [68.1, 6.5, 97.4, 35.5]  # [min_lon, min_lat, max_lon, max_lat]

    # --- AI / ML Landslide Subsystem ---
    NASA_EARTHDATA_USER: str = ""
    NASA_EARTHDATA_PASSWORD: str = ""
    MLFLOW_TRACKING_URI: str = "file:///backend/ai/mlruns"
    AI_MODEL_DIR: str = "backend/ai/datasets/models"
    AI_DATASET_DIR: str = "backend/ai/datasets"
    USE_GPU: bool = False
    RETRAIN_MIN_SAMPLES: int = 50
    RETRAIN_SCHEDULE_CRON: str = "0 2 * * *"


settings = Settings()
