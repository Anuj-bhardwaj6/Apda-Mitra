import uuid
from typing import List
from fastapi import APIRouter, Depends, Query, Request
from app.api.deps import get_current_user, get_user_service, require_roles
from app.api.v1.users.profile import router as profile_router
from app.api.v1.users.settings import router as settings_router
from app.core.roles import UserRole
from app.models.user import User
from app.schemas.base import ApiResponse
from app.schemas.user import TelemetryUpdate, UserRead, UserRoleUpdate
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Users & Personnel"])

# Include Modular Feature Routers
router.include_router(profile_router)
router.include_router(settings_router)


@router.put(
    "/telemetry",
    response_model=ApiResponse[bool],
    summary="Update Real-Time GPS Location Telemetry",
    description="Captures live telemetry coordinate updates for emergency responders and citizens.",
)
async def update_telemetry(
    payload: TelemetryUpdate,
    current_user: User = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
) -> ApiResponse[bool]:
    await user_service.update_telemetry(
        user=current_user,
        latitude=payload.latitude,
        longitude=payload.longitude,
    )
    return ApiResponse.ok(data=True, message="Location coordinates updated.")


@router.get(
    "/list",
    response_model=ApiResponse[List[UserRead]],
    summary="List Registered Personnel by District",
    description="Authorizes District Officers and NDMA Admins to view responder rosters.",
)
async def list_users(
    district: str = Query(..., description="Target administrative district"),
    role: str = Query(default=UserRole.VOLUNTEER.value),
    officer: User = Depends(require_roles(UserRole.DISTRICT_OFFICER, UserRole.NDMA_ADMIN)),
    user_service: UserService = Depends(get_user_service),
) -> ApiResponse[List[UserRead]]:
    users = await user_service.list_users(role=role, district=district)
    return ApiResponse.ok(data=users)


@router.put(
    "/{user_id}/role",
    response_model=ApiResponse[UserRead],
    summary="Assign User Role (NDMA Admin Only)",
    description="Promotes or updates jurisdictional role of an account. Strictly restricted to NDMA Admins.",
)
async def update_user_role(
    user_id: uuid.UUID,
    payload: UserRoleUpdate,
    request: Request,
    admin: User = Depends(require_roles(UserRole.NDMA_ADMIN)),
    user_service: UserService = Depends(get_user_service),
) -> ApiResponse[UserRead]:
    client_ip = request.client.host if request.client else None
    updated = await user_service.update_user_role(
        target_user_id=user_id,
        new_role=payload.role,
        admin_user=admin,
        client_ip=client_ip,
    )
    return ApiResponse.ok(data=updated, message="Role assigned successfully.")
