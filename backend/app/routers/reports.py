from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.db.database import get_db
from app.models.models import CitizenReport
from app.schemas.schemas import CitizenReportCreate, CitizenReportOut
from app.adapters.gemini_adapter import GeminiAdapter
from app.routers.websocket_router import ws_manager

router = APIRouter(prefix="/reports", tags=["Citizen Incident Field Reports"])

@router.post("/analyze-image")
async def analyze_hazard_photo(payload: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    """
    Analyzes uploaded camera photo using Gemini Vision API:
    - Auto-classifies category (Landslide, Flood, Road Block, Tree Fall, Rockfall)
    - Computes severity rating and descriptive assessment
    """
    image_data = payload.get("image_base64") or payload.get("photo_url", "")
    mime_type = payload.get("mime_type", "image/jpeg")
    
    if not image_data:
        raise HTTPException(status_code=400, detail="Missing image_base64 payload")

    analysis = await GeminiAdapter.classify_hazard_image(image_data, mime_type)
    return {
        "success": True,
        "data": analysis,
        "source": analysis.get("source", "Gemini Vision"),
        "confidence": analysis.get("confidence", 0.92)
    }

@router.get("", response_model=List[CitizenReportOut])
def get_recent_reports(db: Session = Depends(get_db)):
    reports = db.query(CitizenReport).order_by(CitizenReport.created_at.desc()).limit(20).all()
    if not reports:
        # Seed initial realistic reports
        defaults = [
            CitizenReport(
                reporter_name="Rahul Nair",
                category="Landslide",
                description="Minor slope shift on Chooralmala bypass corridor. Road shoulder partially covered in mud.",
                latitude=11.6912,
                longitude=76.1380,
                location_name="Chooralmala Bypass KM 4, Wayanad",
                status="Pending",
                photo_url="https://images.unsplash.com/photo-1547683905-f686c993aae5?w=600&q=80"
            ),
            CitizenReport(
                reporter_name="Anjali V.",
                category="Rockfall",
                description="Heavy boulder fallen from mountain wall blocking left lane of mountain highway.",
                latitude=11.6740,
                longitude=76.1210,
                location_name="Attamala Road KM 12, Wayanad",
                status="Verified",
                photo_url="https://images.unsplash.com/photo-1547683905-f686c993aae5?w=600&q=80"
            )
        ]
        for r in defaults:
            db.add(r)
        db.commit()
        reports = db.query(CitizenReport).order_by(CitizenReport.created_at.desc()).limit(20).all()
    return reports

@router.post("", response_model=CitizenReportOut, status_code=status.HTTP_201_CREATED)
async def submit_citizen_report(
    report_in: CitizenReportCreate,
    db: Session = Depends(get_db)
):
    new_report = CitizenReport(
        reporter_name=report_in.reporter_name or "Anonymous Citizen",
        category=report_in.category,
        description=report_in.description,
        latitude=report_in.latitude,
        longitude=report_in.longitude,
        location_name=report_in.location_name,
        photo_url=report_in.photo_url,
        status="Pending"
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    # Real-time WebSocket notification broadcast
    await ws_manager.broadcast({
        "type": "new_incident_report",
        "report": {
            "id": new_report.id,
            "category": new_report.category,
            "location_name": new_report.location_name,
            "latitude": new_report.latitude,
            "longitude": new_report.longitude,
            "description": new_report.description,
            "status": new_report.status
        }
    })

    return new_report

@router.patch("/{report_id}/verify", response_model=CitizenReportOut)
async def verify_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(CitizenReport).filter(CitizenReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    report.status = "Verified"
    db.commit()
    db.refresh(report)

    # Real-time WebSocket verification broadcast
    await ws_manager.broadcast({
        "type": "incident_verified",
        "report_id": report.id,
        "category": report.category,
        "location_name": report.location_name,
        "status": "Verified"
    })

    return report
