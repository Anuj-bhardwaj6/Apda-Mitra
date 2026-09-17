import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.api.deps import get_shelter_repository, require_roles
from app.core.roles import UserRole
from app.db.models.user import User
from app.db.repositories.shelter_repository import ShelterRepository
from app.schemas.base import ApiResponse
from app.schemas.shelter import (
    NearbyShelterResponse,
    ShelterCreate,
    ShelterOccupancyUpdate,
    ShelterRead,
)

router = APIRouter(prefix="/shelters", tags=["Relief Shelters & Staging Bases"])


@router.get(
    "/nearby",
    response_model=ApiResponse[List[NearbyShelterResponse]],
    summary="Get Nearby Relief Shelters Ranked by Spatial Proximity",
)
async def get_nearby_shelters(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(default=30.0, ge=1.0, le=100.0),
    shelter_repo: ShelterRepository = Depends(get_shelter_repository),
) -> ApiResponse[List[NearbyShelterResponse]]:
    results = await shelter_repo.get_nearby_shelters(lat, lon, radius_km=radius_km)
    response_items = [
        NearbyShelterResponse(
            shelter=ShelterRead.model_validate(sh),
            distance_km=dist,
        )
        for sh, dist in results
    ]
    return ApiResponse.ok(
        data=response_items,
        message=f"Found {len(response_items)} operational shelter(s) within {radius_km} km.",
    )


@router.get(
    "/{shelter_id}",
    response_model=ApiResponse[ShelterRead],
    summary="Get Detailed Shelter Infrastructure by ID",
)
async def get_shelter(
    shelter_id: uuid.UUID,
    shelter_repo: ShelterRepository = Depends(get_shelter_repository),
) -> ApiResponse[ShelterRead]:
    shelter = await shelter_repo.get_by_id(shelter_id)
    if not shelter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shelter not found.")

    return ApiResponse.ok(data=ShelterRead.model_validate(shelter))


@router.post(
    "",
    response_model=ApiResponse[ShelterRead],
    status_code=status.HTTP_201_CREATED,
    summary="Register New Emergency Shelter (Officers Only)",
)
async def create_shelter(
    payload: ShelterCreate,
    officer: User = Depends(
        require_roles(UserRole.DISTRICT_OFFICER, UserRole.STATE_OFFICER, UserRole.NDMA_ADMIN)
    ),
    shelter_repo: ShelterRepository = Depends(get_shelter_repository),
) -> ApiResponse[ShelterRead]:
    existing = await shelter_repo.get_by_code(payload.shelter_code)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Shelter code '{payload.shelter_code}' already exists.",
        )

    shelter = await shelter_repo.create(**payload.model_dump())
    return ApiResponse.ok(data=ShelterRead.model_validate(shelter), message="Shelter registered.")


@router.put(
    "/{shelter_id}/occupancy",
    response_model=ApiResponse[ShelterRead],
    summary="Update Bed Occupancy and Water Reserves",
)
async def update_occupancy(
    shelter_id: uuid.UUID,
    payload: ShelterOccupancyUpdate,
    personnel: User = Depends(
        require_roles(UserRole.VOLUNTEER, UserRole.DISTRICT_OFFICER, UserRole.NDMA_ADMIN)
    ),
    shelter_repo: ShelterRepository = Depends(get_shelter_repository),
) -> ApiResponse[ShelterRead]:
    shelter = await shelter_repo.get_by_id(shelter_id)
    if not shelter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shelter not found.")

    if payload.current_occupancy > shelter.total_capacity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Occupancy ({payload.current_occupancy}) exceeds total capacity ({shelter.total_capacity}).",
        )

    updated = await shelter_repo.update(shelter, **payload.model_dump(exclude_unset=True))
    return ApiResponse.ok(data=ShelterRead.model_validate(updated), message="Occupancy updated.")
