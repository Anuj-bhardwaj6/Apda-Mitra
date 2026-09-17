from typing import List, Dict, Any

def generate_prediction_timeline(current_risk_score: float, current_rain_24h: float, soil_moisture_pct: float) -> List[Dict[str, Any]]:
    """
    Generates prediction timeline showing risk evolution over time: Now -> +6h -> +12h -> Tomorrow.
    """
    # Trajectory factors based on current rainfall & soil saturation trends
    steps = [
        {"step": "now", "label": "Now", "score_mult": 1.0, "rain_delta": 0.0},
        {"step": "6h", "label": "+6 Hours", "score_mult": 1.15 if current_rain_24h > 40 else 0.9, "rain_delta": 15.0 if current_rain_24h > 40 else 2.0},
        {"step": "12h", "label": "+12 Hours", "score_mult": 1.25 if current_rain_24h > 60 else 0.8, "rain_delta": 28.0 if current_rain_24h > 60 else 0.0},
        {"step": "tomorrow", "label": "Tomorrow", "score_mult": 0.7 if current_rain_24h < 80 else 1.1, "rain_delta": 10.0 if current_rain_24h > 80 else 0.0},
    ]

    timeline = []
    for s in steps:
        score = min(100.0, max(5.0, round(current_risk_score * s["score_mult"], 1)))
        
        if score >= 75.0:
            level = "Severe"
        elif score >= 50.0:
            level = "High"
        elif score >= 25.0:
            level = "Moderate"
        else:
            level = "Low"

        rain = round(current_rain_24h + s["rain_delta"], 1)
        soil = min(100.0, round(soil_moisture_pct * (1.0 + (s["score_mult"] - 1.0) * 0.5), 1))

        timeline.append({
            "step": s["step"],
            "label": s["label"],
            "risk_level": level,
            "risk_score": score,
            "rainfall_mm": rain,
            "soil_moisture_pct": soil
        })

    return timeline
