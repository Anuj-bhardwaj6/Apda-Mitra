from app.schemas.ai import (
    HazardRiskBreakdown,
    RiskAssessmentResponse,
    RiskFactorContribution,
)
from app.services.ai.feature_builder import FeatureBuilder


class RiskEngine:
    """
    Multi-Hazard Risk Engine calculating calibrated disaster vulnerability indices
    across cyclone, river flood, debris slope, and urban inundation vectors.
    """

    @classmethod
    async def assess_risk(
        cls, latitude: float, longitude: float, district: str = None, active_hazard_type: str = None
    ) -> RiskAssessmentResponse:
        features = await FeatureBuilder.build_spatial_features(latitude, longitude, district)

        # 1. Hazard-specific threat scores
        cyclone_risk = round(
            0.45 * features["norm_wind"] + 0.55 * features["coastal_vulnerability"], 3
        )
        flood_risk = round(
            0.60 * features["norm_rain"] + 0.40 * features["coastal_vulnerability"], 3
        )
        landslide_risk = round(
            0.50 * features["norm_rain"] + 0.50 * features["slope_index"], 3
        )
        waterlogging_risk = round(
            0.55 * features["norm_rain"] + 0.45 * features["urban_density"], 3
        )

        hazard_breakdown = HazardRiskBreakdown(
            cyclone_wind_risk=cyclone_risk,
            flood_inundation_risk=flood_risk,
            landslide_slope_risk=landslide_risk,
            urban_waterlogging_risk=waterlogging_risk,
        )

        # 2. Compute composite threat index
        threat_values = [cyclone_risk, flood_risk, landslide_risk, waterlogging_risk]
        max_threat = max(threat_values)
        avg_threat = sum(threat_values) / len(threat_values)
        composite_score = round(max_threat * 0.70 + avg_threat * 0.30, 3)

        # 3. Categorize severity
        if composite_score >= 0.70:
            severity = "CRITICAL"
        elif composite_score >= 0.45:
            severity = "HIGH"
        elif composite_score >= 0.25:
            severity = "MODERATE"
        else:
            severity = "LOW"

        # 4. Identify primary threat
        threat_map = {
            cyclone_risk: "CYCLONE_STORM_SURGE",
            flood_risk: "RIVER_INUNDATION",
            landslide_risk: "LANDSLIDE_DEBRIS_FLOW",
            waterlogging_risk: "URBAN_WATERLOGGING",
        }
        primary_threat = threat_map[max_threat]

        # 5. Extract top contributing factors
        factors = [
            RiskFactorContribution(
                feature_name="Precipitation Saturation",
                impact_weight_percent=round(features["norm_rain"] * 38.0, 1),
                description=f"24-hr rainfall saturation index at {int(features['norm_rain'] * 100)}%",
                direction="INCREASING" if features["norm_rain"] > 0.3 else "MITIGATING",
            ),
            RiskFactorContribution(
                feature_name="Wind & Squall Magnitude",
                impact_weight_percent=round(features["norm_wind"] * 32.0, 1),
                description=f"Sustained wind gusts reaching {int(features['norm_wind'] * 160)} km/h",
                direction="INCREASING" if features["norm_wind"] > 0.35 else "MITIGATING",
            ),
            RiskFactorContribution(
                feature_name="Coastal Lowland Proximity",
                impact_weight_percent=round(features["coastal_vulnerability"] * 20.0, 1),
                description="Tidal surge susceptibility along maritime coastal boundary",
                direction="INCREASING" if features["coastal_vulnerability"] > 0.4 else "MITIGATING",
            ),
            RiskFactorContribution(
                feature_name="Terrain Slope Gradient",
                impact_weight_percent=round(features["slope_index"] * 10.0, 1),
                description="Geological elevation gradient and debris flow susceptibility",
                direction="INCREASING" if features["slope_index"] > 0.5 else "MITIGATING",
            ),
        ]

        return RiskAssessmentResponse(
            composite_risk_score=composite_score,
            severity_level=severity,
            confidence_score=0.92,
            hazard_breakdown=hazard_breakdown,
            primary_threat=primary_threat,
            top_contributing_factors=factors,
        )
