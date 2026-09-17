from app.schemas.ai import ExplainabilityResponse
from app.services.ai.risk_engine import RiskEngine


class ShapExplainabilityEngine:
    """
    Simulates SHAP (SHapley Additive exPlanations) feature attribution
    to provide model interpretability, transparency, and trust for district officers.
    """

    @classmethod
    async def explain_risk_assessment(
        cls, latitude: float, longitude: float, district: str = None
    ) -> ExplainabilityResponse:
        assessment = await RiskEngine.assess_risk(latitude, longitude, district)
        base_value = 0.15  # National background disaster risk baseline

        summary_parts = []
        for factor in assessment.top_contributing_factors:
            summary_parts.append(
                f"{factor.feature_name} ({factor.impact_weight_percent}% impact - {factor.direction})"
            )

        summary_text = (
            f"The composite hazard vulnerability index of {assessment.composite_risk_score} "
            f"is predominantly driven by: {', '.join(summary_parts[:2])}. "
            f"This requires targeted {assessment.severity_level} protocol deployment."
        )

        return ExplainabilityResponse(
            model_name="APDA-MITRA-Ensemble-XGBoost-SpatialRisk-v1",
            composite_score=assessment.composite_risk_score,
            base_value=base_value,
            shap_contributions=assessment.top_contributing_factors,
            summary=summary_text,
        )
