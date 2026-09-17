from typing import List

def generate_recommendations(hazard_type: str, risk_level: str, rainfall_24h_mm: float, soil_moisture_pct: float, slope_deg: float) -> List[str]:
    """
    Generates contextual, actionable safety advice for citizens and field personnel.
    """
    recommendations = []

    if risk_level in ["Severe", "High"]:
        recommendations.append("Avoid high-risk highway corridors (e.g. NH-5 / NH-108) for the next 8 hours.")
        recommendations.append("Delay non-essential mountain and slope travel until weather stabilizes.")
        recommendations.append("Stay clear of steep hill slopes, active rockfall zones, and drainage channels.")
        recommendations.append("Prepare emergency kit with non-perishable food, water, flashlight, and medical supplies.")
        recommendations.append("Move livestock and valuable assets away from low-lying slope bases.")
        recommendations.append("Identify nearest verified community relief shelter via the Apda Mitra map.")
    elif risk_level == "Moderate":
        recommendations.append("Exercise extreme caution while driving on mountain roads during rainfall.")
        recommendations.append("Keep emergency contacts and district disaster helpline (108/112) accessible.")
        recommendations.append("Inspect property perimeter drainage for water clogging or soil cracking.")
        recommendations.append("Subscribe to live regional weather alerts via Apda Mitra notification center.")
    else: # Low risk
        recommendations.append("Conditions are currently stable in your immediate area.")
        recommendations.append("Continue regular travel while remaining attentive to sudden rain shifts.")
        recommendations.append("Save your key places (Home, School, Work) to receive proactive risk updates.")

    return recommendations
