from typing import Any, Dict
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from app.api.deps import (
    get_incident_repository,
    get_report_repository,
    get_shelter_repository,
    require_roles,
)
from app.core.roles import UserRole
from app.db.models.user import User
from app.db.repositories.incident_repository import IncidentRepository
from app.db.repositories.report_repository import ReportRepository
from app.db.repositories.shelter_repository import ShelterRepository
from app.schemas.base import ApiResponse

router = APIRouter(prefix="/officer", tags=["District & State Officer Dashboard"])


class DispatchTeamRequest(BaseModel):
    team_type: str = Field(..., description="NDRF_BATTALION, SDRF_SWIFT_WATER, FIRE_DISASTER, MEDICAL_TRAUMA")
    target_incident_ref: str
    destination_latitude: float
    destination_longitude: float
    unit_count: int = Field(default=1, ge=1, le=10)
    instructions: str


@router.get(
    "/dashboard-stats",
    response_model=ApiResponse[Dict[str, Any]],
    summary="Aggregate District Disaster Control Metrics (Officers Only)",
)
async def get_dashboard_metrics(
    officer: User = Depends(
        require_roles(UserRole.DISTRICT_OFFICER, UserRole.STATE_OFFICER, UserRole.NDMA_ADMIN)
    ),
    incident_repo: IncidentRepository = Depends(get_incident_repository),
    report_repo: ReportRepository = Depends(get_report_repository),
    shelter_repo: ShelterRepository = Depends(get_shelter_repository),
) -> ApiResponse[Dict[str, Any]]:
    active_incidents = await incident_repo.get_active_bulletins()
    pending_reports = await report_repo.get_by_status("PENDING_VERIFICATION")
    all_shelters = await shelter_repo.get_all(limit=500)

    total_capacity = sum(s.total_capacity for s in all_shelters)
    current_occupancy = sum(s.current_occupancy for s in all_shelters)

    stats = {
        "activeDisasterBulletins": len(active_incidents),
        "pendingCitizenReports": len(pending_reports),
        "totalSheltersOperational": len([s for s in all_shelters if s.is_open]),
        "totalShelterCapacity": total_capacity,
        "currentShelterOccupancy": current_occupancy,
        "occupancyPercentage": round((current_occupancy / total_capacity * 100) if total_capacity else 0, 1),
        "officerJurisdiction": {
            "district": officer.assigned_district or "National Jurisdiction",
            "state": officer.assigned_state or "India",
            "role": officer.role,
        },
    }

    return ApiResponse.ok(data=stats, message="Dashboard metrics aggregated.")


@router.post(
    "/dispatch-teams",
    response_model=ApiResponse[Dict[str, Any]],
    summary="Dispatch NDRF / SDRF Search & Rescue Units",
)
async def dispatch_rescue_teams(
    payload: DispatchTeamRequest,
    officer: User = Depends(
        require_roles(UserRole.DISTRICT_OFFICER, UserRole.STATE_OFFICER, UserRole.NDMA_ADMIN)
    ),
) -> ApiResponse[Dict[str, Any]]:
    dispatch_code = f"DISP-{payload.team_type[:4]}-{int(officer.id.hex[:6], 16)}"
    return ApiResponse.ok(
        data={
            "dispatchCode": dispatch_code,
            "teamType": payload.team_type,
            "unitCount": payload.unit_count,
            "incidentRef": payload.target_incident_ref,
            "status": "EN_ROUTE",
            "dispatchedBy": officer.full_name,
        },
        message="Search and rescue battalion mobilized.",
    )
