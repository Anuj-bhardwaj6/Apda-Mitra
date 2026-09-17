"""
Feature Engineering — Weather Features
========================================
Fetches and computes real-time weather features for model inference.
During training, weather comes from the merged dataset.
During inference, this module fetches live data from Open-Meteo.

Features computed:
  - rainfall_24h, rainfall_72h, rainfall_7d (mm)
  - humidity (%)
  - temperature (°C)
  - wind_speed (km/h)
  - pressure (hPa)
"""

from __future__ import annotations

import time
from datetime import date, timedelta
from typing import Optional

import numpy as np
import requests

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parents[3]))

from ai.config import OPEN_METEO_FORECAST_URL
from ai.logger import PipelineLogger

log = PipelineLogger("features.weather")

MAX_RETRIES = 3


def fetch_live_weather(lat: float, lon: float) -> dict[str, float]:
    """
    Fetches current weather features from Open-Meteo Forecast API.
    Used during inference when weather values are not provided by the caller.

    Args:
        lat: Latitude
        lon: Longitude

    Returns:
        Dict with rainfall_24h, rainfall_72h, rainfall_7d, humidity,
        temperature, wind_speed, pressure
    """
    params = {
        "latitude": round(lat, 4),
        "longitude": round(lon, 4),
        "daily": "precipitation_sum,rain_sum,temperature_2m_max,temperature_2m_min,windspeed_10m_max,surface_pressure_mean",
        "hourly": "relative_humidity_2m",
        "forecast_days": 1,
        "past_days": 7,
        "timezone": "Asia/Kolkata",
        "wind_speed_unit": "kmh",
    }

    defaults = {
        "rainfall_24h": 0.0,
        "rainfall_72h": 0.0,
        "rainfall_7d": 0.0,
        "humidity": 75.0,
        "temperature": 22.0,
        "wind_speed": 10.0,
        "pressure": 1010.0,
    }

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.get(OPEN_METEO_FORECAST_URL, params=params, timeout=15)
            resp.raise_for_status()
            data = resp.json()

            daily = data.get("daily", {})
            hourly = data.get("hourly", {})

            import pandas as pd
            precip = pd.Series(daily.get("precipitation_sum", [])).dropna()
            temp_max = pd.Series(daily.get("temperature_2m_max", [])).dropna()
            temp_min = pd.Series(daily.get("temperature_2m_min", [])).dropna()
            wind = pd.Series(daily.get("windspeed_10m_max", [])).dropna()
            pressure = pd.Series(daily.get("surface_pressure_mean", [])).dropna()
            humidity = pd.Series(hourly.get("relative_humidity_2m", [])).dropna()

            r24 = float(precip.iloc[-1]) if len(precip) > 0 else 0.0
            r72 = float(precip.iloc[-3:].sum()) if len(precip) >= 3 else r24
            r7d = float(precip.sum()) if len(precip) > 0 else r24

            temp_mean = float((temp_max.mean() + temp_min.mean()) / 2) if len(temp_max) > 0 and len(temp_min) > 0 else 22.0

            return {
                "rainfall_24h": max(0.0, r24),
                "rainfall_72h": max(0.0, r72),
                "rainfall_7d": max(0.0, r7d),
                "humidity": float(humidity.mean()) if len(humidity) > 0 else 75.0,
                "temperature": temp_mean,
                "wind_speed": float(wind.mean()) if len(wind) > 0 else 10.0,
                "pressure": float(pressure.mean()) if len(pressure) > 0 else 1010.0,
            }

        except Exception as exc:
            log.warning("Weather fetch failed", attempt=attempt, error=str(exc))
            if attempt == MAX_RETRIES:
                log.warning("All weather fetch attempts failed, using climatological defaults")
                return defaults
            time.sleep(2 * attempt)

    return defaults


def get_weather_features(
    lat: float,
    lon: float,
    overrides: Optional[dict] = None,
) -> dict[str, float]:
    """
    Returns weather features for inference, applying any caller-provided overrides.

    Args:
        lat: Latitude
        lon: Longitude
        overrides: Dict of feature values to override (caller-provided weather data)

    Returns:
        Complete weather feature dict
    """
    features = fetch_live_weather(lat, lon)

    if overrides:
        for key, val in overrides.items():
            if key in features and val is not None:
                features[key] = float(val)

    log.debug("Weather features ready", lat=lat, lon=lon,
              rainfall_24h=features["rainfall_24h"],
              rainfall_7d=features["rainfall_7d"])
    return features
