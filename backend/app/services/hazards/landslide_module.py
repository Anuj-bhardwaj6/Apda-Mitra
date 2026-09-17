import logging
from typing import Dict, Any, List
from app.services.hazards.base_hazard import BaseHazardModule
from app.services.recommendation_engine import generate_recommendations
from app.services.timeline_service import generate_prediction_timeline
from app.adapters.elevation import ElevationAdapter
from app.adapters.landslide_catalog import LandslideCatalogAdapter
from app.core.config import settings

logger = logging.getLogger(__name__)

class LandslideModule(BaseHazardModule):
    @property
    def hazard_type(self) -> str:
        return "landslide"

    async def evaluate(self, lat: float, lon: float, weather_data: Dict[str, Any], location_name: str) -> Dict[str, Any]:
        """
        Evaluates Landslide Hazard Risk score (0-100), Level, Confidence, XAI Reasons, Recommendations, Timeline, and Historical Incidents.
        Combines Open-Meteo multi-depth moisture/rainfall, Open-Elevation slope gradient, and NASA Global Landslide Catalog records.
        """
        rain_24h = weather_data.get("rainfall_24h_mm", 0.0)
        rain_72h = weather_data.get("rainfall_72h_mm", 0.0)
        soil_pct = weather_data.get("soil_moisture_pct", 35.0)

        # 1. Real Terrain Elevation & Slope from ElevationAdapter
        terrain = await ElevationAdapter.get_terrain_profile(lat, lon)
        slope_deg = terrain.get("slope_degrees", 25.0)
        elevation_m = terrain.get("elevation_m", 750)

        # 2. Real Historical Landslides from NASA GLC
        historical_incidents = await LandslideCatalogAdapter.get_nearby_historical_landslides(lat, lon, radius_km=60.0)

        # 3. Mountain Belt Detection
        is_himalayan = (26.0 <= lat <= 36.0 and 73.0 <= lon <= 96.0)
        is_western_ghats = (8.0 <= lat <= 20.0 and 73.0 <= lon <= 77.0)
        susceptibility_index = 0.88 if is_himalayan else (0.80 if is_western_ghats else 0.35)

        # 4. Multi-Factor Risk Score Weighting
        w_rain_24 = min(1.0, rain_24h / settings.LANDSLIDE_RAINFALL_24H_THRESHOLD_MM) * 35.0
        w_rain_72 = min(1.0, rain_72h / settings.LANDSLIDE_RAINFALL_72H_THRESHOLD_MM) * 25.0
        w_soil = min(1.0, soil_pct / settings.LANDSLIDE_SOIL_MOISTURE_CRITICAL_PCT) * 20.0
        w_slope = min(1.0, slope_deg / settings.LANDSLIDE_SLOPE_CRITICAL_DEG) * 20.0

        # Additional historical landslide penalty if within 15km
        historical_factor = 1.15 if (historical_incidents and historical_incidents[0]["distance_km"] < 15.0) else 1.0

        raw_score = (w_rain_24 + w_rain_72 + w_soil + w_slope) * (0.6 + 0.4 * susceptibility_index) * historical_factor
        risk_score = min(99.0, max(5.0, round(raw_score, 1)))

        # 5. Risk Classification
        if risk_score >= 70.0:
            risk_level = "High" if risk_score < 85.0 else "Severe"
        elif risk_score >= 35.0:
            risk_level = "Moderate"
        else:
            risk_level = "Low"

        # 6. Confidence Rating
        confidence = 0.94 if weather_data.get("is_live") else 0.88

        # 7. Explainable AI (XAI) Human-Readable Reasons
        xai_reasons: List[str] = []
        if rain_24h >= settings.LANDSLIDE_RAINFALL_24H_THRESHOLD_MM:
            xai_reasons.append(f"Heavy 24h precipitation ({rain_24h}mm) exceeds safety threshold ({settings.LANDSLIDE_RAINFALL_24H_THRESHOLD_MM}mm).")
        elif rain_24h > 15:
            xai_reasons.append(f"Moderate 24h rainfall recorded at {rain_24h}mm.")
        else:
            xai_reasons.append(f"24h precipitation is measured at {rain_24h}mm.")

        if rain_72h >= settings.LANDSLIDE_RAINFALL_72H_THRESHOLD_MM:
            xai_reasons.append(f"Sustained 72h accumulated rainfall ({rain_72h}mm) significantly reduces slope shear resistance.")

        if soil_pct >= settings.LANDSLIDE_SOIL_MOISTURE_CRITICAL_PCT:
            xai_reasons.append(f"Volumetric soil moisture saturation reached critical {soil_pct}% (compromised pore-water equilibrium).")
        else:
            xai_reasons.append(f"Soil moisture saturation currently at {soil_pct}%.")

        if slope_deg >= settings.LANDSLIDE_SLOPE_CRITICAL_DEG:
            xai_reasons.append(f"Terrain slope gradient of {slope_deg}° at {elevation_m}m elevation elevates mass movement probability.")

        if historical_incidents:
            nearest = historical_incidents[0]
            xai_reasons.append(f"Historical incident recorded: {nearest['name']} ({nearest['distance_km']}km away on {nearest['date']}).")

        # 8. Actionable Recommendations & Forecast Timeline
        recommendations = generate_recommendations(self.hazard_type, risk_level, rain_24h, soil_pct, slope_deg)
        timeline = generate_prediction_timeline(risk_score, rain_24h, soil_pct)

        return {
            "hazard_type": self.hazard_type,
            "location_name": location_name,
            "latitude": lat,
            "longitude": lon,
            "elevation_m": elevation_m,
            "slope_degrees": slope_deg,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "confidence": confidence,
            "xai_reasons": xai_reasons,
            "recommendations": recommendations,
            "timeline": timeline,
            "historical_incidents": historical_incidents[:3]
        }
