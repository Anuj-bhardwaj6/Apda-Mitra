from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timezone
from app.schemas.schemas import HazardEvaluateResponse, TrustLayer
from app.services.hazards.hazard_engine import hazard_engine

router = APIRouter(prefix="/hazard", tags=["Hazard Engine"])

@router.get("/evaluate", response_model=HazardEvaluateResponse)
async def evaluate_hazard(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    location_name: str = Query(None),
    hazard_type: str = Query("landslide")
):
    try:
        res = await hazard_engine.evaluate_hazard(latitude, longitude, hazard_type, location_name)
        
        trust = TrustLayer(
            source="Open-Meteo + Hazard Engine v1.2",
            updatedAt=datetime.now(timezone.utc).isoformat(),
            confidence=res.get("confidence", 0.91),
            dataFreshness="Live API"
        )
        
        return HazardEvaluateResponse(
            hazard_type=res["hazard_type"],
            location_name=res["location_name"],
            latitude=res["latitude"],
            longitude=res["longitude"],
            risk_score=res["risk_score"],
            risk_level=res["risk_level"],
            confidence=res["confidence"],
            xai_reasons=res["xai_reasons"],
            recommendations=res["recommendations"],
            timeline=res["timeline"],
            trust_layer=trust
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hazard evaluation error: {str(e)}")
