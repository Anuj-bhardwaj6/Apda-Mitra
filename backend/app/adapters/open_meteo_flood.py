import httpx
import logging
import time
from typing import Dict, Any, List

from app.core.config import settings

logger = logging.getLogger(__name__)

_flood_cache: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 600

class OpenMeteoFloodAdapter:
    BASE_URL = settings.OPEN_METEO_FLOOD_BASE_URL

    @classmethod
    async def get_flood_forecast(cls, lat: float, lon: float) -> Dict[str, Any]:
        """
        Retrieves live river discharge and flood inundation risk forecast via Open-Meteo Flood API.
        """
        cache_key = f"{round(lat, 3)}_{round(lon, 3)}"
        now = time.time()

        if cache_key in _flood_cache:
            entry = _flood_cache[cache_key]
            if now - entry["timestamp"] < CACHE_TTL_SECONDS:
                logger.info("Returning cached Open-Meteo Flood data for %s", cache_key)
                return entry["data"]

        params = {
            "latitude": lat,
            "longitude": lon,
            "daily": "river_discharge,river_discharge_mean,river_discharge_max,river_discharge_min",
            "forecast_days": 3,
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.get(cls.BASE_URL, params=params)
                response.raise_for_status()
                payload = response.json()

            daily = payload.get("daily", {})
            times = daily.get("time", [])
            discharges = daily.get("river_discharge", [])
            means = daily.get("river_discharge_mean", [])
            maxs = daily.get("river_discharge_max", [])
            mins = daily.get("river_discharge_min", [])

            # Filter out None values
            valid_discharges = [d for d in discharges if d is not None]
            valid_means = [m for m in means if m is not None]
            valid_maxs = [mx for mx in maxs if mx is not None]

            current_discharge = round(valid_discharges[0], 2) if valid_discharges else (round(valid_means[0], 2) if valid_means else 45.0)
            mean_discharge = round(sum(valid_means) / len(valid_means), 2) if valid_means else current_discharge
            peak_discharge = round(max(valid_maxs), 2) if valid_maxs else current_discharge

            # Flow Trend Calculation
            if len(valid_discharges) >= 2:
                if valid_discharges[1] > valid_discharges[0] * 1.15:
                    trend = "Rising Flow"
                elif valid_discharges[1] < valid_discharges[0] * 0.85:
                    trend = "Receding Flow"
                else:
                    trend = "Stable Flow"
            else:
                trend = "Stable Flow"

            # Flood Alert Tier
            ratio = (peak_discharge / max(1.0, mean_discharge))
            if peak_discharge > 1200 or ratio >= 1.8:
                alert_tier = "Severe Flood Risk (Red Alert)"
                severity = "High"
                recommendation = "Direct riverbank and low-lying floodplain evacuations immediately."
            elif peak_discharge > 600 or ratio >= 1.35:
                alert_tier = "Elevated Inundation Watch (Amber)"
                severity = "Moderate"
                recommendation = "Restrict riverside crossings and monitor culvert discharge levels."
            elif peak_discharge > 150 or ratio >= 1.15:
                alert_tier = "Moderate River Discharge"
                severity = "Advisory"
                recommendation = "Normal catchment flow. Stay alert during heavy rain windows."
            else:
                alert_tier = "Normal River Basin Flow"
                severity = "Low"
                recommendation = "River flow within standard baseline capacity."

            daily_forecast: List[Dict[str, Any]] = []
            for i in range(min(3, len(times))):
                daily_forecast.append({
                    "date": times[i],
                    "day": i,
                    "river_discharge_m3s": round(discharges[i], 2) if i < len(discharges) and discharges[i] is not None else current_discharge,
                    "river_discharge_mean_m3s": round(means[i], 2) if i < len(means) and means[i] is not None else mean_discharge,
                    "river_discharge_max_m3s": round(maxs[i], 2) if i < len(maxs) and maxs[i] is not None else peak_discharge,
                    "river_discharge_min_m3s": round(mins[i], 2) if i < len(mins) and mins[i] is not None else current_discharge,
                })

            result = {
                "latitude": lat,
                "longitude": lon,
                "current_discharge_m3s": current_discharge,
                "mean_discharge_m3s": mean_discharge,
                "peak_discharge_m3s": peak_discharge,
                "discharge_trend": trend,
                "flood_risk_level": severity,
                "alert_tier": alert_tier,
                "recommendation": recommendation,
                "daily_forecast": daily_forecast,
                "is_live": True,
                "source": "Open-Meteo Flood API",
            }

            _flood_cache[cache_key] = {"data": result, "timestamp": now}
            return result

        except Exception as e:
            logger.error("Open-Meteo Flood API request failed for %s,%s: %s", lat, lon, e)
            raise RuntimeError(f"Open-Meteo flood service unavailable: {e}") from e
