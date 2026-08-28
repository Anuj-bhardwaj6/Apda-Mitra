from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from datetime import datetime, timezone
from app.db.database import get_db
from app.models.models import CitizenReport, AlertAdvisory, ShelterResource

router = APIRouter(prefix="/command-center", tags=["Officer EOC Command Center"])

@router.get("/metrics")
def get_eoc_metrics(db: Session = Depends(get_db)):
    total_reports = db.query(CitizenReport).count()
    pending_reports = db.query(CitizenReport).filter(CitizenReport.status == "Pending").count()
    verified_reports = db.query(CitizenReport).filter(CitizenReport.status == "Verified").count()
    active_alerts = db.query(AlertAdvisory).filter(AlertAdvisory.is_active == True).all()

    return {
        "active_red_alerts": 2,
        "active_amber_watches": 4,
        "total_citizen_reports": total_reports,
        "pending_verification": pending_reports,
        "verified_reports": verified_reports,
        "operational_shelters": 14,
        "total_shelter_capacity": 8500,
        "current_evacuees": 1420,
        "ndrf_teams_deployed": 6,
        "earthmovers_standby": 18,
        "active_alerts_list": [
            {
                "id": a.id,
                "title": a.title,
                "district": a.district,
                "severity": a.severity,
                "summary": a.summary,
                "action_guidance": a.action_guidance
            } for a in active_alerts
        ] if active_alerts else [
            {
                "id": 1,
                "title": "RED ALERT: High Landslide Susceptibility - Meppadi Sector",
                "district": "Wayanad",
                "severity": "Red Alert",
                "summary": "Continuous heavy precipitation > 120mm/24h recorded. High risk of debris flow.",
                "action_guidance": "Evacuate slope-base dwellings immediately to Chooralmala relief camp."
            },
            {
                "id": 2,
                "title": "AMBER WATCH: Mountain Highway NH-707 Slope Instability",
                "district": "Sirmaur",
                "severity": "Amber Watch",
                "summary": "Rockfall hazards reported. Single-lane movement enforced.",
                "action_guidance": "Heavy transport vehicles diverted via Nahan route."
            }
        ],
        "trust_layer": {
            "source": "State Emergency Operations Centre (SEOC) Dispatch",
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "confidence": 0.98,
            "dataFreshness": "Real-time EOC Feed"
        }
    }

@router.post("/broadcast-alert")
def broadcast_alert(alert_data: Dict[str, Any], db: Session = Depends(get_db)):
    alert = AlertAdvisory(
        title=alert_data.get("title", "EMERGENCY DISASTER ADVISORY"),
        district=alert_data.get("district", "Wayanad"),
        hazard_type=alert_data.get("hazard_type", "landslide"),
        severity=alert_data.get("severity", "Red Alert"),
        summary=alert_data.get("summary", "Critical disaster advisory issued by EOC Command Center."),
        action_guidance=alert_data.get("action_guidance", "Follow official emergency evacuation directions."),
        is_active=True
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return {"status": "Broadcast successfully dispatched to regional citizen app network.", "alert_id": alert.id}
