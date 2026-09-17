import time
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.api.deps import get_current_user, get_optional_user, get_report_repository, require_roles
from app.core.roles import UserRole
from app.db.models.user import User
from app.db.repositories.report_repository import ReportRepository
from app.schemas.base import ApiResponse
from app.schemas.report import CitizenReportCreate, CitizenReportRead, ReportVerificationRequest

router = APIRouter(prefix="/reports", tags=["Citizen Field Reports"])


@router.post(
    "/submit",
    response_model=ApiResponse[CitizenReportRead],
    status_code=status.HTTP_201_CREATED,
    summary="Submit Citizen Emergency Incident Report",
)
async def submit_report(
    payload: CitizenReportCreate,
    current_user: Optional[User] = Depends(get_optional_user),
    report_repo: ReportRepository = Depends(get_report_repository),
) -> ApiResponse[CitizenReportRead]:
    ref_code = f"CIT-{hex(int(time.time() * 1000))[2:].upper()}"

    report = await report_repo.create({
        "incident_ref": ref_code,
        "user_id": current_user.id if current_user else None,
        "category": payload.category,
        "urgency": payload.urgency,
        "landmark": payload.landmark,
        "contact_number": payload.contact_number,
        "description": payload.description,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "photo_url": payload.photo_url,
        "status": "PENDING_VERIFICATION",
    })


    return ApiResponse.ok(
        data=CitizenReportRead.model_validate(report),
        message="Incident report submitted to Central Disaster Control.",
    )


@router.get(
    "",
    response_model=ApiResponse[List[CitizenReportRead]],
    summary="List Citizen Reports by Triage Status",
)
async def list_reports(
    status_filter: Optional[str] = Query(default=None, pattern="^(PENDING_VERIFICATION|VERIFIED|DISPATCHED|REJECTED)$"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    report_repo: ReportRepository = Depends(get_report_repository),
) -> ApiResponse[List[CitizenReportRead]]:
    reports = await report_repo.get_by_status(status_filter, skip=skip, limit=limit)
    return ApiResponse.ok(
        data=[CitizenReportRead.model_validate(r) for r in reports],
        message=f"Retrieved {len(reports)} report(s).",
    )


@router.put(
    "/{report_id}/verify",
    response_model=ApiResponse[CitizenReportRead],
    summary="Officer Triage & Verification of Emergency Report",
)
async def verify_report(
    report_id: uuid.UUID,
    payload: ReportVerificationRequest,
    officer: User = Depends(
        require_roles(UserRole.DISTRICT_OFFICER, UserRole.STATE_OFFICER, UserRole.NDMA_ADMIN)
    ),
    report_repo: ReportRepository = Depends(get_report_repository),
) -> ApiResponse[CitizenReportRead]:
    updated = await report_repo.verify_report(
        report_id=report_id,
        officer_id=officer.id,
        status=payload.status,
        notes=payload.verification_notes,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    return ApiResponse.ok(
        data=CitizenReportRead.model_validate(updated),
        message=f"Report status updated to '{payload.status}'.",
    )
