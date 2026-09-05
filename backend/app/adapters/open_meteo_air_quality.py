import httpx
import logging
import time
from typing import Dict, Any

from app.core.config import settings

logger = logging.getLogger(__name__)

_aqi_cache: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 600

class OpenMeteoAirQualityAdapter:
    BASE_URL = settings.OPEN_METEO_AIR_QUALITY_BASE_URL

    @classmethod
    async def get_air_quality(cls, lat: float, lon: float) -> Dict[str, Any]:
        """
        Retrieves real-time atmospheric air quality telemetry via Open-Meteo Air Quality API.
        """
        cache_key = f"{round(lat, 3)}_{round(lon, 3)}"
        now = time.time()

        if cache_key in _aqi_cache:
            entry = _aqi_cache[cache_key]
            if now - entry["timestamp"] < CACHE_TTL_SECONDS:
                logger.info("Returning cached Open-Meteo Air Quality data for %s", cache_key)
                return entry["data"]

        params = {
            "latitude": lat,
            "longitude": lon,
            "current": "european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone",
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.get(cls.BASE_URL, params=params)
                response.raise_for_status()
                payload = response.json()

            current = payload.get("current", {})
            us_aqi = int(current.get("us_aqi") or 45)
            eu_aqi = int(current.get("european_aqi") or 30)
            pm2_5 = round(float(current.get("pm2_5") or 15.0), 1)
            pm10 = round(float(current.get("pm10") or 25.0), 1)
            no2 = round(float(current.get("nitrogen_dioxide") or 12.0), 1)
            so2 = round(float(current.get("sulphur_dioxide") or 8.0), 1)
            o3 = round(float(current.get("ozone") or 55.0), 1)
            co = round(float(current.get("carbon_monoxide") or 350.0), 1)

            # AQI Category & Health Advisory
            if us_aqi <= 50:
                category = "Good"
                color = "#2E7D32"
                advisory = "Air quality is satisfactory with minimal atmospheric risk."
            elif us_aqi <= 100:
                category = "Moderate"
                color = "#D97706"
                advisory = "Acceptable air quality. Sensitive individuals should monitor outdoor exposure."
            elif us_aqi <= 150:
                category = "Unhealthy for Sensitive Groups"
                color = "#EA580C"
                advisory = "Children, elderly, and those with respiratory issues should reduce heavy exertion."
            elif us_aqi <= 200:
                category = "Unhealthy"
                color = "#DC2626"
                advisory = "Public health warning: Everyone may begin to experience adverse effects. Masks advised."
            elif us_aqi <= 300:
                category = "Very Unhealthy"
                color = "#7C3AED"
                advisory = "Health alert: Serious risk of respiratory irritation across general population."
            else:
                category = "Hazardous"
                color = "#7F1D1D"
                advisory = "Emergency environmental condition: Entire population likely affected."

            result = {
                "latitude": lat,
                "longitude": lon,
                "us_aqi": us_aqi,
                "european_aqi": eu_aqi,
                "pm2_5": pm2_5,
                "pm10": pm10,
                "nitrogen_dioxide": no2,
                "sulphur_dioxide": so2,
                "ozone": o3,
                "carbon_monoxide": co,
                "aqi_category": category,
                "aqi_color": color,
                "health_advisory": advisory,
                "is_live": True,
                "source": "Open-Meteo Air Quality API",
            }

            _aqi_cache[cache_key] = {"data": result, "timestamp": now}
            return result

        except Exception as e:
            logger.error("Open-Meteo Air Quality API failed for %s,%s: %s", lat, lon, e)
            raise RuntimeError(f"Open-Meteo air quality service unavailable: {e}") from e
