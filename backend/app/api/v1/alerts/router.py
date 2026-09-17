import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.api.deps import get_incident_repository, require_roles
from app.core.roles import UserRole
from app.db.models.user import User
from app.db.repositories.incident_repository import IncidentRepository
from app.schemas.alert import DisasterIncidentRead, IncidentCreate
from app.schemas.base import ApiResponse

router = APIRouter(prefix="/alerts", tags=["Disaster Bulletins & Early Warning"])


@router.get(
    "/active",
    response_model=ApiResponse[List[DisasterIncidentRead]],
    summary="Get All Active Verified Disaster Bulletins",
)
async def get_active_alerts(
    district: str = Query(default=None, description="Filter by affected district"),
    incident_repo: IncidentRepository = Depends(get_incident_repository),
) -> ApiResponse[List[DisasterIncidentRead]]:
    if district:
        incidents = await incident_repo.get_by_district(district)
    else:
        incidents = await incident_repo.get_active_bulletins()

    return ApiResponse.ok(
        data=[DisasterIncidentRead.model_validate(i) for i in incidents],
        message=f"Retrieved {len(incidents)} active disaster bulletin(s).",
    )


@router.get(
    "/{incident_id}",
    response_model=ApiResponse[DisasterIncidentRead],
    summary="Get Incident Details by ID",
)
async def get_incident(
    incident_id: uuid.UUID,
    incident_repo: IncidentRepository = Depends(get_incident_repository),
) -> ApiResponse[DisasterIncidentRead]:
    incident = await incident_repo.get_by_id(incident_id)
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")

    return ApiResponse.ok(data=DisasterIncidentRead.model_validate(incident))


@router.post(
    "",
    response_model=ApiResponse[DisasterIncidentRead],
    status_code=status.HTTP_201_CREATED,
    summary="Publish Official Disaster Alert Bulletin (Officers Only)",
)
async def create_alert(
    payload: IncidentCreate,
    officer: User = Depends(
        require_roles(UserRole.DISTRICT_OFFICER, UserRole.STATE_OFFICER, UserRole.NDMA_ADMIN)
    ),
    incident_repo: IncidentRepository = Depends(get_incident_repository),
) -> ApiResponse[DisasterIncidentRead]:
    existing = await incident_repo.get_by_bulletin_id(payload.bulletin_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Bulletin with ID '{payload.bulletin_id}' already exists.",
        )

    incident = await incident_repo.create(**payload.model_dump())
    return ApiResponse.ok(
        data=DisasterIncidentRead.model_validate(incident),
        message="Official disaster bulletin published and broadcasted.",
    )
