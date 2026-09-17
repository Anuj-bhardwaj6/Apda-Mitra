"""
Feature Engineering — Soil Moisture Features
==============================================
Fetches soil moisture features for inference.
During training, soil data comes from the merged dataset.
During inference, fetches from Open-Meteo (free, ~9km resolution).
"""

from __future__ import annotations

import time
from typing import Optional

import requests

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parents[3]))

from ai.config import OPEN_METEO_FORECAST_URL
from ai.logger import PipelineLogger

log = PipelineLogger("features.soil")

MAX_RETRIES = 3


def fetch_live_soil_moisture(lat: float, lon: float) -> dict[str, float]:
    """
    Fetches current soil moisture from Open-Meteo API.
    Uses hourly soil_moisture_0_to_1cm and soil_moisture_1_to_3cm.

    Returns:
        Dict with soil_moisture_surface and soil_moisture_10cm
    """
    defaults = {"soil_moisture_surface": 0.25, "soil_moisture_10cm": 0.30}

    params = {
        "latitude": round(lat, 4),
        "longitude": round(lon, 4),
        "hourly": "soil_moisture_0_to_1cm,soil_moisture_1_to_3cm",
        "forecast_days": 1,
        "past_days": 3,
        "timezone": "Asia/Kolkata",
    }

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.get(OPEN_METEO_FORECAST_URL, params=params, timeout=15)
            resp.raise_for_status()
            data = resp.json()

            import pandas as pd
            hourly = data.get("hourly", {})
            sm_surf = pd.Series(hourly.get("soil_moisture_0_to_1cm", [])).dropna()
            sm_10cm = pd.Series(hourly.get("soil_moisture_1_to_3cm", [])).dropna()

            return {
                "soil_moisture_surface": float(sm_surf.mean()) if len(sm_surf) > 0 else defaults["soil_moisture_surface"],
                "soil_moisture_10cm": float(sm_10cm.mean()) if len(sm_10cm) > 0 else defaults["soil_moisture_10cm"],
            }
        except Exception as exc:
            log.warning("Soil moisture fetch failed", attempt=attempt, error=str(exc))
            if attempt == MAX_RETRIES:
                return defaults
            time.sleep(2 * attempt)

    return defaults


def get_soil_features(
    lat: float,
    lon: float,
    overrides: Optional[dict] = None,
) -> dict[str, float]:
    """Returns soil moisture features with optional caller overrides."""
    features = fetch_live_soil_moisture(lat, lon)
    if overrides:
        for key, val in overrides.items():
            if key in features and val is not None:
                features[key] = float(val)
    return features
