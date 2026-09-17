from app.schemas.ai import RecommendationResponse


class RecommendationEngine:
    """
    Generates actionable, automated disaster mitigation advisories and resource
    allocation instructions conforming to NDMA standard operating procedures.
    """

    @classmethod
    async def generate_recommendations(
        cls, composite_risk: float, hazard_type: str, district: str = None
    ) -> RecommendationResponse:
        is_critical = composite_risk >= 0.70
        is_high = composite_risk >= 0.45

        actions = []
        if is_critical:
            actions = [
                "IMMEDIATE EVACUATION: Vacate kutcha/semi-pucca dwellings within 5km from coast or riverbed.",
                "Proceed along designated elevated high-ground bypass corridor towards Block Cyclone Shelter.",
                "Switch off main domestic electrical circuit breaker and LPG cylinder regulators.",
                "Carry dry rations, emergency medicines, infant formula, and battery-powered radio.",
            ]
            priority = "URGENT_LIFE_SAFETY"
        elif is_high:
            actions = [
                "HIGH ALERT: Keep emergency grab-bags packed and vehicle fuel tanks full.",
                "Avoid travel through low-lying culverts, underpasses, and river bridges.",
                "Secure tin roofs, loose awnings, and outdoor equipment.",
                "Keep drinking water stored (minimum 15 litres per person).",
            ]
            priority = "PREPAREDNESS_AND_MONITORING"
        else:
            actions = [
                "Stay tuned to All India Radio disaster bulletins.",
                "Verify family emergency contact channels.",
                "Report any localized waterlogging or fallen powerlines to 112.",
            ]
            priority = "ROUTINE_MONITORING"

        return RecommendationResponse(
            evacuation_mandated=is_critical,
            priority_level=priority,
            immediate_actions=actions,
            nearest_safe_shelter_id="SHL-BAL-01",
            recommended_corridor_name="Designated Safe High-Ground Corridor via NH-16 Elevated Bypass",
            emergency_contacts={
                "National Emergency": "112",
                "NDRF Control Room": "1078",
                "State Disaster Cell": "1070",
                "Ambulance Network": "108",
            },
        )
