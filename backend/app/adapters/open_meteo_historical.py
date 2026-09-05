import httpx
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta

from app.core.config import settings

logger = logging.getLogger(__name__)

_historical_cache: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 3600 # 1 hour

class OpenMeteoHistoricalAdapter:
    """
    Adapter for Open-Meteo Historical Weather and Recent Operational Time-Series.
    Extracts multi-day rainfall accumulation, temperature trends, wind history,
    and constructs AI/ML feature vectors for predictive hazard modeling.
    """
    FORECAST_URL = settings.OPEN_METEO_BASE_URL
    ARCHIVE_URL = settings.OPEN_METEO_ARCHIVE_BASE_URL

    @classmethod
    async def get_historical_weather(
        cls, 
        lat: float, 
        lon: float, 
        lookback_days: int = 14
    ) -> Dict[str, Any]:
        cache_key = f"{round(lat, 3)}_{round(lon, 3)}_{lookback_days}"
        now_ts = datetime.now(timezone.utc).timestamp()

        if cache_key in _historical_cache:
            entry = _historical_cache[cache_key]
            if now_ts - entry["cached_at"] < CACHE_TTL_SECONDS:
                return entry["data"]

        safe_lookback = max(7, min(30, lookback_days))

        try:
            params = {
                "latitude": lat,
                "longitude": lon,
                "past_days": safe_lookback,
                "forecast_days": 1,
                "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
                "hourly": "relative_humidity_2m",
                "timezone": "auto"
            }

            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(cls.FORECAST_URL, params=params)

                if res.status_code == 200:
                    payload = res.json()
                    parsed = cls._parse_historical_payload(payload, lat, lon, safe_lookback)
                    _historical_cache[cache_key] = {"data": parsed, "cached_at": now_ts}
                    return parsed
                raise RuntimeError(f"Open-Meteo historical request returned status {res.status_code}")
        except Exception as e:
            logger.error("Open-Meteo Historical request error for %s,%s: %s", lat, lon, e)
            raise RuntimeError(f"Open-Meteo historical weather unavailable: {e}") from e

    @classmethod
    def _parse_historical_payload(
        cls, 
        payload: Dict[str, Any], 
        lat: float, 
        lon: float, 
        lookback_days: int
    ) -> Dict[str, Any]:
        daily = payload.get("daily", {})
        hourly = payload.get("hourly", {})

        times = daily.get("time", [])
        precips = daily.get("precipitation_sum", [])
        temp_maxs = daily.get("temperature_2m_max", [])
        temp_mins = daily.get("temperature_2m_min", [])
        wind_maxs = daily.get("wind_speed_10m_max", [])
        hourly_humidities = hourly.get("relative_humidity_2m", [])

        # Chunk hourly humidities into 24-hour daily averages
        daily_humidities: List[float] = []
        for i in range(len(times)):
            chunk = hourly_humidities[i * 24 : (i + 1) * 24]
            if chunk:
                daily_humidities.append(sum(chunk) / len(chunk))
            else:
                daily_humidities.append(72.0)

        history_steps: List[Dict[str, Any]] = []
        for i in range(len(times)):
            p = float(precips[i]) if i < len(precips) and precips[i] is not None else 0.0
            t_max = float(temp_maxs[i]) if i < len(temp_maxs) and temp_maxs[i] is not None else 26.0
            t_min = float(temp_mins[i]) if i < len(temp_mins) and temp_mins[i] is not None else 18.0
            w_max = float(wind_maxs[i]) if i < len(wind_maxs) and wind_maxs[i] is not None else 12.0
            h_mean = float(daily_humidities[i]) if i < len(daily_humidities) else 70.0
            t_mean = round((t_max + t_min) / 2.0, 1)

            history_steps.append({
                "date": times[i],
                "temp_max_c": round(t_max, 1),
                "temp_min_c": round(t_min, 1),
                "temp_mean_c": t_mean,
                "precipitation_mm": round(p, 1),
                "wind_speed_max_kmh": round(w_max, 1),
                "humidity_mean_pct": round(h_mean, 1)
            })

        # Calculate metrics
        all_precips = [s["precipitation_mm"] for s in history_steps]
        total_rainfall = sum(all_precips)
        precip_7d = sum(all_precips[-7:]) if len(all_precips) >= 7 else total_rainfall
        precip_14d = sum(all_precips[-14:]) if len(all_precips) >= 14 else total_rainfall

        # Antecedent Moisture Index (AMI): Exponential decay weight = 0.85^k
        # High AMI indicates severe soil saturation prior to any new rainfall event
        ami = 0.0
        reversed_precips = list(reversed(all_precips[-7:]))
        for k, daily_p in enumerate(reversed_precips):
            ami += daily_p * (0.85 ** k)

        # Rainfall trend: compare latest 3 days average to earlier days
        if len(all_precips) >= 6:
            recent_avg = sum(all_precips[-3:]) / 3.0
            earlier_avg = sum(all_precips[-6:-3]) / 3.0
            if recent_avg > earlier_avg + 3.0:
                trend = "Increasing"
            elif recent_avg < earlier_avg - 3.0:
                trend = "Decreasing"
            else:
                trend = "Stable"
        else:
            trend = "Stable"

        mean_temp = sum(s["temp_mean_c"] for s in history_steps) / len(history_steps) if history_steps else 22.0
        max_wind = max([s["wind_speed_max_kmh"] for s in history_steps], default=14.0)
        mean_humidity = sum(s["humidity_mean_pct"] for s in history_steps) / len(history_steps) if history_steps else 75.0

        # Baseline rainfall expected for monsoon season (~30mm per 7-day window)
        baseline_7d = 30.0
        rainfall_anomaly = round(((precip_7d - baseline_7d) / max(baseline_7d, 1.0)) * 100.0, 1)

        # Build normalized ML training feature vector (values bounded 0.0 to 1.0)
        ml_vector = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "latitude": lat,
            "longitude": lon,
            "precip_7d_sum_mm": round(precip_7d, 2),
            "precip_14d_sum_mm": round(precip_14d, 2),
            "temp_mean_c": round(mean_temp, 2),
            "humidity_mean_pct": round(mean_humidity, 2),
            "wind_max_kmh": round(max_wind, 2),
            "antecedent_moisture_index": round(ami, 2),
            "normalized_features": {
                "norm_rain_7d": min(1.0, round(precip_7d / 300.0, 4)),
                "norm_rain_14d": min(1.0, round(precip_14d / 600.0, 4)),
                "norm_temp": min(1.0, max(0.0, round((mean_temp + 10.0) / 60.0, 4))),
                "norm_humidity": min(1.0, max(0.0, round(mean_humidity / 100.0, 4))),
                "norm_wind": min(1.0, max(0.0, round(max_wind / 120.0, 4))),
                "norm_ami": min(1.0, round(ami / 150.0, 4)),
            }
        }

        return {
            "start_date": times[0] if times else "",
            "end_date": times[-1] if times else "",
            "lookback_days": len(history_steps),
            "total_rainfall_mm": round(total_rainfall, 1),
            "rainfall_anomaly_pct": rainfall_anomaly,
            "mean_temperature_c": round(mean_temp, 1),
            "max_wind_speed_kmh": round(max_wind, 1),
            "rainfall_trend": trend,
            "daily_history": history_steps,
            "ml_feature_vector": ml_vector,
            "source": "Open-Meteo Historical & Past Weather API",
            "is_live": True
        }
