from fastapi import APIRouter, Depends, Request
from app.api.deps import get_current_user, get_user_service
from app.models.user import User
from app.schemas.base import ApiResponse
from app.schemas.user import UserRead, UserUpdate
from app.services.user_service import UserService

router = APIRouter()


@router.get(
    "/me",
    response_model=ApiResponse[UserRead],
    summary="Get Authenticated User Profile",
    description="Returns current authenticated user details including roles, verification, and jurisdiction.",
)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
) -> ApiResponse[UserRead]:
    profile = await user_service.get_profile(current_user)
    return ApiResponse.ok(data=profile)


@router.get(
    "/profile",
    response_model=ApiResponse[UserRead],
    summary="Get Detailed User Profile (Alias)",
    description="Synonym endpoint for /me.",
)
async def get_profile_alias(
    current_user: User = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
) -> ApiResponse[UserRead]:
    profile = await user_service.get_profile(current_user)
    return ApiResponse.ok(data=profile)


@router.put(
    "/me",
    response_model=ApiResponse[UserRead],
    summary="Update Authenticated User Profile",
    description="Updates user name, contact number, district, or push notification token with audit log.",
)
async def update_my_profile(
    payload: UserUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
) -> ApiResponse[UserRead]:
    client_ip = request.client.host if request.client else None
    updated = await user_service.update_profile(
        user=current_user,
        payload=payload,
        client_ip=client_ip,
    )
    return ApiResponse.ok(data=updated, message="Profile updated successfully.")


@router.put(
    "/profile",
    response_model=ApiResponse[UserRead],
    summary="Update User Profile (Alias)",
    description="Synonym endpoint for /me.",
)
async def update_profile_alias(
    payload: UserUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
) -> ApiResponse[UserRead]:
    client_ip = request.client.host if request.client else None
    updated = await user_service.update_profile(
        user=current_user,
        payload=payload,
        client_ip=client_ip,
    )
    return ApiResponse.ok(data=updated, message="Profile updated successfully.")
