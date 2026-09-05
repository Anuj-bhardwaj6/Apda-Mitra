import httpx
import logging
import time
from typing import Dict, Any

from app.core.config import settings

logger = logging.getLogger(__name__)

_weather_cache: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 600

# Standard WMO Weather Interpretation Codes (WMO 4501)
WMO_WEATHER_CODES: Dict[int, str] = {
    0: "Clear Sky",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing Rime Fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Dense Drizzle",
    56: "Light Freezing Drizzle",
    57: "Dense Freezing Drizzle",
    61: "Slight Rain",
    63: "Moderate Rain",
    65: "Heavy Monsoon Rain",
    66: "Light Freezing Rain",
    67: "Heavy Freezing Rain",
    71: "Slight Snow Fall",
    73: "Moderate Snow Fall",
    75: "Heavy Snow Fall",
    77: "Snow Grains",
    80: "Slight Rain Showers",
    81: "Moderate Rain Showers",
    82: "Violent Rain Showers",
    85: "Slight Snow Showers",
    86: "Heavy Snow Showers",
    95: "Thunderstorm",
    96: "Thunderstorm with Slight Hail",
    99: "Severe Thunderstorm with Hail",
}

def get_wmo_condition(code: int, rain_24h: float = 0.0) -> str:
    if rain_24h >= 64.5:
        return "Heavy Monsoon Downpour"
    return WMO_WEATHER_CODES.get(code, "Partly Cloudy")


class OpenMeteoAdapter:
    BASE_URL = settings.OPEN_METEO_BASE_URL

    @classmethod
    async def get_weather(cls, lat: float, lon: float) -> Dict[str, Any]:
        """
        Fetch comprehensive current and forecast data from Open-Meteo.
        Includes WMO weather codes, multi-depth soil moisture, and 3-day daily outlook.
        """
        cache_key = f"{round(lat, 3)}_{round(lon, 3)}"
        now = time.time()

        if cache_key in _weather_cache:
            entry = _weather_cache[cache_key]
            if now - entry["timestamp"] < CACHE_TTL_SECONDS:
                logger.info("Returning cached Open-Meteo data for %s", cache_key)
                return entry["data"]

        params = {
            "latitude": lat,
            "longitude": lon,
            "current": ",".join([
                "temperature_2m",
                "relative_humidity_2m",
                "apparent_temperature",
                "surface_pressure",
                "wind_speed_10m",
                "wind_direction_10m",
                "precipitation",
                "weather_code",
            ]),
            "hourly": ",".join([
                "temperature_2m",
                "precipitation",
                "precipitation_probability",
                "relative_humidity_2m",
                "weather_code",
                "soil_moisture_0_1cm",
                "soil_moisture_1_3cm",
                "soil_moisture_3_9cm",
                "soil_moisture_9_27cm",
                "visibility",
            ]),
            "daily": ",".join([
                "weather_code",
                "temperature_2m_max",
                "temperature_2m_min",
                "precipitation_sum",
                "precipitation_probability_max",
                "uv_index_max",
            ]),
            "forecast_days": 3,
            "timezone": "auto",
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.get(cls.BASE_URL, params=params)
                response.raise_for_status()
                raw_data = response.json()

            current = raw_data.get("current", {})
            hourly = raw_data.get("hourly", {})
            daily = raw_data.get("daily", {})

            precip_list = hourly.get("precipitation", [])
            rain_24h = sum(precip_list[:24]) if len(precip_list) >= 24 else sum(precip_list)
            rain_72h = sum(precip_list[:72]) if len(precip_list) >= 72 else sum(precip_list)
            rain_weekly = sum(daily.get("precipitation_sum", []))

            moist_surface = hourly.get("soil_moisture_0_1cm", [0.35])[0] if hourly.get("soil_moisture_0_1cm") else 0.35
            moist_root = hourly.get("soil_moisture_9_27cm", [0.40])[0] if hourly.get("soil_moisture_9_27cm") else 0.40
            soil_pct = min(100.0, max(0.0, ((moist_surface * 0.6 + moist_root * 0.4) / 0.55) * 100.0))

            # Soil Saturation Status
            if soil_pct >= 75.0:
                soil_status = "Critical (Saturated)"
            elif soil_pct >= 55.0:
                soil_status = "Elevated Moisture"
            else:
                soil_status = "Normal / Stable"

            # IMD Rainfall Hazard Classification
            if rain_24h >= 204.5:
                rainfall_alert = "Extremely Heavy Rain (Red Alert)"
            elif rain_24h >= 115.6:
                rainfall_alert = "Very Heavy Rain (Orange Alert)"
            elif rain_24h >= 64.5:
                rainfall_alert = "Heavy Rain (Yellow Advisory)"
            elif rain_24h >= 15.6:
                rainfall_alert = "Moderate Rain"
            else:
                rainfall_alert = "Normal / Light"

            temp = current.get("temperature_2m", 23.5)
            feels_like = current.get("apparent_temperature", temp)
            humidity = current.get("relative_humidity_2m", 80)
            wind_speed = current.get("wind_speed_10m", 12.0)
            wind_dir = current.get("wind_direction_10m", 180)
            pressure = current.get("surface_pressure", 1012.0)
            uv_index = daily.get("uv_index_max", [4.0])[0] if daily.get("uv_index_max") else 4.0
            current_code = int(current.get("weather_code", 0))
            cond = get_wmo_condition(current_code, rain_24h)

            # Calculate current local hour offset so hourly forecast begins from current local hour
            times = hourly.get("time", [])
            current_time_str = str(current.get("time", ""))
            current_hour_prefix = current_time_str[:13] if len(current_time_str) >= 13 else ""

            start_idx = 0
            if current_hour_prefix:
                for idx, t in enumerate(times):
                    if str(t).startswith(current_hour_prefix):
                        start_idx = idx
                        break
            elif times and current_time_str:
                for idx, t in enumerate(times):
                    if str(t) >= current_time_str:
                        start_idx = idx
                        break

            hourly_indices = list(range(start_idx, min(start_idx + 24, len(hourly.get("temperature_2m", [])))))
            if not hourly_indices:
                hourly_indices = list(range(min(24, len(hourly.get("temperature_2m", [])))))

            processed_data = {
                "temperature_c": round(temp, 1),
                "feels_like_c": round(feels_like, 1),
                "humidity_pct": int(humidity),
                "surface_pressure_hpa": round(pressure, 1),
                "wind_speed_kmh": round(wind_speed, 1),
                "wind_direction_deg": int(wind_dir),
                "uv_index": round(uv_index, 1),
                "rainfall_24h_mm": round(rain_24h, 1),
                "rainfall_72h_mm": round(rain_72h, 1),
                "rainfall_weekly_mm": round(rain_weekly, 1),
                "soil_moisture_pct": round(soil_pct, 1),
                "soil_moisture_surface": round(moist_surface, 3),
                "soil_moisture_rootzone": round(moist_root, 3),
                "soil_saturation_status": soil_status,
                "rainfall_alert_tier": rainfall_alert,
                "weather_code": current_code,
                "weather_condition": cond,
                "hourly_forecast": [
                    {
                        "hour": int(times[i][11:13]) if i < len(times) and len(str(times[i])) >= 13 and str(times[i])[11:13].isdigit() else (i - start_idx),
                        "relative_hour": i - start_idx,
                        "time_iso": times[i] if i < len(times) else None,
                        "temp_c": hourly.get("temperature_2m", [])[i] if i < len(hourly.get("temperature_2m", [])) else temp,
                        "precip_mm": hourly.get("precipitation", [])[i] if i < len(hourly.get("precipitation", [])) else 0.0,
                        "humidity": hourly.get("relative_humidity_2m", [])[i] if i < len(hourly.get("relative_humidity_2m", [])) else humidity,
                        "precip_probability_pct": hourly.get("precipitation_probability", [])[i] if i < len(hourly.get("precipitation_probability", [])) else 0,
                        "weather_code": int(hourly.get("weather_code", [current_code])[i]) if i < len(hourly.get("weather_code", [])) else current_code,
                        "condition": get_wmo_condition(int(hourly.get("weather_code", [current_code])[i])) if i < len(hourly.get("weather_code", [])) else cond,
                    }
                    for i in hourly_indices
                ],
                "daily_forecast": [
                    {
                        "day": i,
                        "weather_code": int(daily.get("weather_code", [current_code])[i]) if i < len(daily.get("weather_code", [])) else current_code,
                        "condition": get_wmo_condition(int(daily.get("weather_code", [current_code])[i])) if i < len(daily.get("weather_code", [])) else cond,
                        "temp_max": daily.get("temperature_2m_max", [])[i] if i < len(daily.get("temperature_2m_max", [])) else temp,
                        "temp_min": daily.get("temperature_2m_min", [])[i] if i < len(daily.get("temperature_2m_min", [])) else temp - 4,
                        "precip_sum": daily.get("precipitation_sum", [])[i] if i < len(daily.get("precipitation_sum", [])) else 0.0,
                        "precip_probability_max": daily.get("precipitation_probability_max", [])[i] if i < len(daily.get("precipitation_probability_max", [])) else 0,
                    }
                    for i in range(min(3, len(daily.get("temperature_2m_max", []))))
                ],
                "is_live": True,
                "source": "Open-Meteo Forecast API",
            }

            _weather_cache[cache_key] = {"data": processed_data, "timestamp": now}
            return processed_data

        except Exception as e:
            logger.error("Open-Meteo API request failed for %s,%s: %s", lat, lon, e)
            raise RuntimeError(f"Open-Meteo weather service unavailable: {e}") from e