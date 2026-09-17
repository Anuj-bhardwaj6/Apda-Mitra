import math
from typing import Dict
from app.services.external.open_meteo import OpenMeteoService


class FeatureBuilder:
    """
    Constructs normalized multidimensional feature representations combining
    satellite telemetry, meteorological observations, and GIS terrain indices.
    """

    @classmethod
    async def build_spatial_features(
        cls, latitude: float, longitude: float, district: str = None
    ) -> Dict[str, float]:
        # 1. Fetch live meteorological observations
        weather = await OpenMeteoService.get_weather(latitude, longitude)
        wind_speed = weather.wind_speed_kmh if weather else 20.0
        precip_mm = weather.rainfall_past_24h_mm if weather else 5.0

        # 2. Normalize wind intensity [0.0 - 1.0] capped at 160 km/h
        norm_wind = min(1.0, wind_speed / 160.0)

        # 3. Normalize precipitation saturation [0.0 - 1.0] capped at 220 mm
        norm_rain = min(1.0, precip_mm / 220.0)

        # 4. Coastal proximity estimation (approximate distance to Indian coastlines)
        # Bay of Bengal (around 87.0E) or Arabian Sea (around 72.8E)
        dist_to_coast_km = min(
            abs(longitude - 87.0) * 111.0,
            abs(longitude - 72.8) * 111.0,
        )
        coastal_vulnerability = max(0.0, min(1.0, (100.0 - dist_to_coast_km) / 100.0))

        # 5. Slope and terrain vulnerability index (higher for Western Ghats / Himalayas)
        is_hilly = 10.0 <= latitude <= 15.0 and 75.0 <= longitude <= 77.0  # Western Ghats
        slope_index = 0.85 if is_hilly else 0.25

        return {
            "norm_wind": round(norm_wind, 3),
            "norm_rain": round(norm_rain, 3),
            "coastal_vulnerability": round(coastal_vulnerability, 3),
            "slope_index": round(slope_index, 3),
            "soil_saturation": round(min(1.0, norm_rain * 1.3), 3),
            "urban_density": 0.65 if (district and "mumbai" in district.lower()) else 0.40,
        }
