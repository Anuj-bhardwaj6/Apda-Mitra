from typing import Any, Dict
from fastapi import APIRouter, Depends, Request
from app.api.deps import get_current_user, get_user_service
from app.models.user import User
from app.schemas.base import ApiResponse
from app.schemas.user import PasswordChangeRequest, UserSettingsUpdate
from app.services.user_service import UserService

router = APIRouter()


@router.put(
    "/settings",
    response_model=ApiResponse[Dict[str, Any]],
    summary="Update User Account Settings",
    description="Updates notification preferences, SMS alerts, and language choice.",
)
async def update_settings(
    payload: UserSettingsUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
) -> ApiResponse[Dict[str, Any]]:
    client_ip = request.client.host if request.client else None
    result = await user_service.update_settings(
        user=current_user,
        payload=payload,
        client_ip=client_ip,
    )
    return ApiResponse.ok(data=result, message="Settings updated successfully.")


@router.put(
    "/change-password",
    response_model=ApiResponse[bool],
    summary="Change User Password",
    description="Validates current password, updates to strong new password, and revokes all active refresh tokens.",
)
async def change_password(
    payload: PasswordChangeRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
) -> ApiResponse[bool]:
    client_ip = request.client.host if request.client else None
    await user_service.change_password(
        user=current_user,
        payload=payload,
        client_ip=client_ip,
    )
    return ApiResponse.ok(data=True, message="Password updated successfully. Other active sessions revoked.")


@router.delete(
    "/account",
    response_model=ApiResponse[bool],
    summary="Deactivate Current User Account",
    description="Soft-deletes the user profile and invalidates all session tokens.",
)
async def deactivate_account(
    request: Request,
    current_user: User = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
) -> ApiResponse[bool]:
    client_ip = request.client.host if request.client else None
    await user_service.deactivate_account(
        user=current_user,
        client_ip=client_ip,
    )
    return ApiResponse.ok(data=True, message="Account deactivated successfully.")
