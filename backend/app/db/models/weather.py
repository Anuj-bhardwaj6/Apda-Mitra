from datetime import datetime, timezone
from sqlalchemy import DateTime, Float, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, UUIDPrimaryKeyMixin


class WeatherTelemetry(Base, UUIDPrimaryKeyMixin):
    """
    Time-series meteorological snapshot ingested from IMD Doppler Radars and Open-Meteo.
    """
    __tablename__ = "weather_telemetry"

    station_code: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    station_name: Mapped[str] = mapped_column(String(128), nullable=False)
    state: Mapped[str] = mapped_column(String(64), index=True, nullable=False)

    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)

    temperature_c: Mapped[float] = mapped_column(Float, nullable=False)
    feels_like_c: Mapped[float] = mapped_column(Float, nullable=False)
    wind_speed_kmh: Mapped[float] = mapped_column(Float, nullable=False)
    wind_gust_kmh: Mapped[float] = mapped_column(Float, nullable=False)
    wind_direction: Mapped[str] = mapped_column(String(8), nullable=False)
    precipitation_mm: Mapped[float] = mapped_column(Float, nullable=False)
    humidity_percent: Mapped[float] = mapped_column(Float, nullable=False)
    aqi_value: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    imd_warning_color: Mapped[str] = mapped_column(String(16), default="Green", index=True, nullable=False)

    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
        nullable=False,
    )

    __table_args__ = (
        Index("idx_weather_station_time", "station_code", "recorded_at"),
    )
