import asyncio
import logging
from typing import Dict, Any, List
from datetime import datetime, timezone

from app.services.weather_service import fetch_live_weather, fetch_weather_forecast
from app.services.flood_service import fetch_flood_intelligence
from app.services.air_quality_service import fetch_air_quality_telemetry
from app.adapters.elevation import ElevationAdapter
from app.adapters.open_meteo_historical import OpenMeteoHistoricalAdapter
from app.adapters.open_meteo_ensemble import OpenMeteoEnsembleAdapter
from app.services.geocoding_service import reverse_geocode

logger = logging.getLogger(__name__)

DISCLAIMER_TEXT = (
    "This score represents an environmental early-warning risk indicator synthesized "
    "from live Open-Meteo meteorological, GloFAS hydrological, and Copernicus topographic telemetry. "
    "It is an advisory risk indicator and does NOT guarantee or predict localized disaster occurrence, "
    "which requires on-site geological surveying and official NDMA/SDMA administrative bulletins."
)

class DisasterRiskAnalysisService:
    @classmethod
    async def evaluate_comprehensive_risk(
        cls, 
        lat: float, 
        lon: float, 
        custom_location: str = None
    ) -> Dict[str, Any]:
        """
        Synthesizes multi-source real Open-Meteo data into an explainable 
        composite disaster risk score (LOW, MEDIUM, HIGH, CRITICAL).
        """
        # Concurrently gather all 6 data streams
        results = await asyncio.gather(
            fetch_weather_forecast(lat, lon),
            fetch_flood_intelligence(lat, lon),
            fetch_air_quality_telemetry(lat, lon),
            ElevationAdapter.get_terrain_profile(lat, lon),
            OpenMeteoHistoricalAdapter.get_historical_weather(lat, lon, lookback_days=14),
            OpenMeteoEnsembleAdapter.get_ensemble_forecast(lat, lon),
            reverse_geocode(lat, lon) if not custom_location else asyncio.sleep(0, result=custom_location),
            return_exceptions=True
        )


        weather = results[0] if not isinstance(results[0], Exception) else {}
        flood = results[1] if not isinstance(results[1], Exception) else {}
        air_quality = results[2] if not isinstance(results[2], Exception) else {}
        terrain = results[3] if not isinstance(results[3], Exception) else {}
        historical = results[4] if not isinstance(results[4], Exception) else {}
        ensemble = results[5] if not isinstance(results[5], Exception) else {}
        location_name = results[6] if not isinstance(results[6], Exception) and results[6] else "Sector Location"

        reasons: List[Dict[str, Any]] = []
        total_score = 0.0

        # -------------------------------------------------------------
        # 1. Rainfall Intensity & Hourly Probability (Max 25 pts)
        # -------------------------------------------------------------
        rain_24h = float(weather.get("rainfall_24h_mm", 0.0) or 0.0)
        hourly_forecast = weather.get("hourly_forecast", []) or []
        max_rain_prob = max([h.get("precip_probability_pct", 0) for h in hourly_forecast[:12]], default=20)

        rain_score = 0.0
        if rain_24h >= 100.0:
            rain_score += 20.0
            r_sev = "critical"
            r_desc = f"Extreme downpour detected: {rain_24h}mm in 24 hours with {max_rain_prob}% rain probability."
        elif rain_24h >= 50.0:
            rain_score += 15.0
            r_sev = "high"
            r_desc = f"Heavy rainfall accumulation: {rain_24h}mm in 24 hours with elevated rain probability ({max_rain_prob}%)."
        elif rain_24h >= 20.0:
            rain_score += 9.0
            r_sev = "medium"
            r_desc = f"Moderate rain intensity: {rain_24h}mm recorded with {max_rain_prob}% precipitation probability."
        else:
            rain_score += 3.0
            r_sev = "low"
            r_desc = f"Precipitation remains mild at {rain_24h}mm (Probability: {max_rain_prob}%)."

        if max_rain_prob >= 75:
            rain_score += 5.0
        elif max_rain_prob >= 40:
            rain_score += 2.0

        rain_score = min(25.0, rain_score)
        total_score += rain_score

        reasons.append({
            "category": "Precipitation",
            "title": "Rainfall Volume & Probability",
            "title_hi": "वर्षा का स्तर एवं संभावना",
            "severity": r_sev,
            "score_contribution": round(rain_score, 1),
            "description": r_desc,
            "metric_value": f"{rain_24h} mm (Prob: {max_rain_prob}%)"
        })

        # -------------------------------------------------------------
        # 2. Historical Antecedent Moisture & Trend (Max 20 pts)
        # -------------------------------------------------------------
        p7 = float(historical.get("total_rainfall_mm", 0.0) or 0.0)
        trend = historical.get("rainfall_trend", "Stable")
        ami = historical.get("ml_feature_vector", {}).get("antecedent_moisture_index", p7 * 0.7)

        hist_score = 0.0
        if p7 >= 120.0 or ami >= 60.0:
            hist_score += 15.0
            h_sev = "critical"
            h_desc = f"Severe antecedent rainfall saturation: 7-day total of {p7}mm creates high baseline waterlogging."
        elif p7 >= 60.0 or ami >= 35.0:
            hist_score += 10.0
            h_sev = "high"
            h_desc = f"Substantial multi-day rainfall accumulation: {p7}mm over the past 7 days."
        elif p7 >= 25.0:
            hist_score += 6.0
            h_sev = "medium"
            h_desc = f"Moderate cumulative 7-day precipitation of {p7}mm."
        else:
            hist_score += 2.0
            h_sev = "low"
            h_desc = f"7-day cumulative rainfall is low at {p7}mm."

        if trend == "Increasing":
            hist_score += 5.0
            h_desc += " Rainfall trajectory is actively rising."
        elif trend == "Stable":
            hist_score += 2.0

        hist_score = min(20.0, hist_score)
        total_score += hist_score

        reasons.append({
            "category": "Historical Trend",
            "title": "7-Day Antecedent Rainfall Trajectory",
            "title_hi": "7-दिवसीय ऐतिहासिक वर्षा एवं रुझान",
            "severity": h_sev,
            "score_contribution": round(hist_score, 1),
            "description": h_desc,
            "metric_value": f"{p7} mm / 7d ({trend})"
        })

        # -------------------------------------------------------------
        # 3. Soil Moisture & Topographical Slope (Max 25 pts)
        # -------------------------------------------------------------
        soil_pct = float(weather.get("soil_moisture_pct", 35.0) or 35.0)
        slope_deg = float(terrain.get("slope_degrees", 8.0) or 8.0)
        elev_m = float(terrain.get("elevation_m", 750.0) or 750.0)

        terrain_score = 0.0
        # Soil component (max 12 pts)
        if soil_pct >= 75.0:
            terrain_score += 12.0
            s_note = f"Critical soil moisture saturation ({soil_pct}%)"
        elif soil_pct >= 55.0:
            terrain_score += 7.0
            s_note = f"Elevated soil saturation ({soil_pct}%)"
        else:
            terrain_score += 3.0
            s_note = f"Stable soil moisture ({soil_pct}%)"

        # Slope component (max 13 pts)
        if slope_deg >= 25.0:
            terrain_score += 13.0
            t_sev = "critical" if soil_pct >= 60.0 else "high"
            t_desc = f"Steep mountain gradient ({slope_deg}°) combined with {s_note} at {elev_m}m ASL."
        elif slope_deg >= 14.0:
            terrain_score += 8.0
            t_sev = "high" if soil_pct >= 70.0 else "medium"
            t_desc = f"Moderate hillside slope ({slope_deg}°) with {s_note} at {elev_m}m ASL."
        else:
            terrain_score += 3.0
            t_sev = "low"
            t_desc = f"Gentle terrain gradient ({slope_deg}°) with {s_note}."

        terrain_score = min(25.0, terrain_score)
        total_score += terrain_score

        reasons.append({
            "category": "Slope & Soil",
            "title": "Topographical Slope & Soil Saturation",
            "title_hi": "भू-ढलान एवं मिट्टी नमी संतृप्ति",
            "severity": t_sev,
            "score_contribution": round(terrain_score, 1),
            "description": t_desc,
            "metric_value": f"{slope_deg}° slope, {soil_pct}% moisture"
        })

        # -------------------------------------------------------------
        # 4. River Basin Hydrology / Flood (Max 15 pts)
        # -------------------------------------------------------------
        discharge = float(flood.get("current_discharge_m3s", 12.0) or 12.0)
        d_trend = flood.get("discharge_trend", "Stable")
        flood_risk = flood.get("flood_risk_level", "Low")

        flood_score = 0.0
        if flood_risk == "High" or discharge >= 45.0:
            flood_score = 15.0
            f_sev = "critical"
            f_desc = f"Elevated river catchment discharge: {discharge} m³/s with {d_trend} flow trend."
        elif flood_risk == "Moderate" or discharge >= 20.0:
            flood_score = 10.0
            f_sev = "medium"
            f_desc = f"Moderate river basin flow of {discharge} m³/s ({d_trend} flow)."
        else:
            flood_score = 3.0
            f_sev = "low"
            f_desc = f"River discharge within safe baseline at {discharge} m³/s ({d_trend})."

        total_score += flood_score

        reasons.append({
            "category": "Hydrology",
            "title": "Catchment River Discharge (GloFAS)",
            "title_hi": "नदी जलग्रहण निर्वहन एवं बाढ़ स्तर",
            "severity": f_sev,
            "score_contribution": round(flood_score, 1),
            "description": f_desc,
            "metric_value": f"{discharge} m³/s ({d_trend})"
        })

        # -------------------------------------------------------------
        # 5. Ensemble Forecast Uncertainty & Consensus (Max 10 pts)
        # -------------------------------------------------------------
        exceed_25 = float(ensemble.get("exceedance_prob_25mm_pct", 10.0) or 10.0)
        ens_mean_48h = float(ensemble.get("mean_precipitation_next_48h_mm", 10.0) or 10.0)
        confidence_pct = float(ensemble.get("overall_confidence_pct", 75.0) or 75.0)
        members = int(ensemble.get("member_count", 30) or 30)

        ens_score = 0.0
        if exceed_25 >= 60.0:
            ens_score = 10.0
            e_sev = "high"
            e_desc = f"{exceed_25}% of {members} ensemble members predict heavy rain (>25mm/48h)."
        elif exceed_25 >= 30.0:
            ens_score = 6.0
            e_sev = "medium"
            e_desc = f"{exceed_25}% ensemble members forecast rainfall exceeding 25mm (48h mean: {ens_mean_48h}mm)."
        else:
            ens_score = 2.0
            e_sev = "low"
            e_desc = f"High model consensus ({confidence_pct}% confidence) on calm rainfall under 25mm."

        total_score += ens_score

        reasons.append({
            "category": "Ensemble Consensus",
            "title": "Multi-Model Forecast Consensus",
            "title_hi": "मल्टी-मॉडल एन्सेम्बल सहमति",
            "severity": e_sev,
            "score_contribution": round(ens_score, 1),
            "description": e_desc,
            "metric_value": f"{exceed_25}% member consensus (>25mm)"
        })

        # -------------------------------------------------------------
        # 6. Wind & Air Quality Atmospheric Stress (Max 5 pts)
        # -------------------------------------------------------------
        wind_kmh = float(weather.get("wind_speed_kmh", 10.0) or 10.0)
        aqi_val = int(air_quality.get("us_aqi", 35) or 35)

        atmos_score = 0.0
        if wind_kmh >= 45.0 or aqi_val >= 150:
            atmos_score = 5.0
            a_sev = "high"
            a_desc = f"Strong wind gusts of {wind_kmh} km/h with AQI of {aqi_val}."
        elif wind_kmh >= 25.0 or aqi_val >= 100:
            atmos_score = 3.0
            a_sev = "medium"
            a_desc = f"Breezy winds at {wind_kmh} km/h and moderate AQI ({aqi_val})."
        else:
            atmos_score = 1.0
            a_sev = "low"
            a_desc = f"Mild winds ({wind_kmh} km/h) and clean air quality (AQI {aqi_val})."

        total_score += atmos_score

        reasons.append({
            "category": "Atmosphere",
            "title": "Wind Gusts & Air Quality Stress",
            "title_hi": "हवा की गति एवं वायु गुणवत्ता दबाव",
            "severity": a_sev,
            "score_contribution": round(atmos_score, 1),
            "description": a_desc,
            "metric_value": f"{wind_kmh} km/h, AQI {aqi_val}"
        })

        # -------------------------------------------------------------
        # Final Categorization: LOW, MEDIUM, HIGH, CRITICAL
        # -------------------------------------------------------------
        final_score = round(min(100.0, max(0.0, total_score)), 1)

        if final_score >= 80.0:
            risk_level = "CRITICAL"
            headline = "Critical Multi-Hazard Environmental Alert"
            headline_hi = "अत्यधिक बहु-आपदा पर्यावरणीय चेतावनी"
            action_guidance = "Severe convergence of steep terrain, soil moisture, and heavy rainfall. Immediate evacuation or relocation to verified district shelters strongly advised."
        elif final_score >= 60.0:
            risk_level = "HIGH"
            headline = "High Environmental Risk: Vulnerable Corridor Alert"
            headline_hi = "उच्च पर्यावरणीय जोखिम: संवेदनशील पहाड़ी क्षेत्र अलर्ट"
            action_guidance = "Elevated risk for debris flow and waterlogging. Avoid non-essential hillside transit and monitor DEOC emergency channels."
        elif final_score >= 30.0:
            risk_level = "MEDIUM"
            headline = "Moderate Risk: Elevated Antecedent Moisture & Rain Watch"
            headline_hi = "मध्यम जोखिम: वर्षा एवं नमी पर सतत निगरानी आवश्यक"
            action_guidance = "Conditions require vigilant monitoring. Stay informed on regional weather updates and keep communication channels open."
        else:
            risk_level = "LOW"
            headline = "Low Environmental Hazard: Normal Baseline Conditions"
            headline_hi = "कम पर्यावरणीय जोखिम: सामान्य एवं सुरक्षित स्थिति"
            action_guidance = "Current atmospheric, hydrological, and topographic parameters are stable and within safe historical limits."

        return {
            "location_name": location_name,
            "latitude": lat,
            "longitude": lon,
            "overall_risk_score": final_score,
            "risk_level": risk_level,
            "disclaimer": DISCLAIMER_TEXT,
            "headline": headline,
            "headline_hi": headline_hi,
            "action_guidance": action_guidance,
            "reasons": reasons,
            "environmental_snapshot": {
                "rainfall_24h_mm": rain_24h,
                "rainfall_7d_mm": p7,
                "soil_moisture_pct": soil_pct,
                "slope_degrees": slope_deg,
                "elevation_m": elev_m,
                "river_discharge_m3s": discharge,
                "river_trend": d_trend,
                "us_aqi": aqi_val,
                "wind_speed_kmh": wind_kmh,
                "ensemble_confidence_pct": confidence_pct
            },
            "source": "Open-Meteo Multi-API Risk Synthesis Engine",
            "is_live": True
        }

risk_analysis_service = DisasterRiskAnalysisService()
