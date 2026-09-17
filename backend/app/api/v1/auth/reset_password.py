from fastapi import APIRouter, Depends, Request
from app.api.deps import get_auth_service
from app.schemas.auth import ResetPasswordRequest
from app.schemas.base import ApiResponse
from app.services.auth_service import AuthService

router = APIRouter()


@router.post(
    "/reset-password",
    response_model=ApiResponse[bool],
    summary="Complete Password Reset",
    description="Validates single-use reset token, sets complex new password, and revokes all previous sessions.",
)
async def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
) -> ApiResponse[bool]:
    client_ip = request.client.host if request.client else None
    await auth_service.reset_password(payload=payload, client_ip=client_ip)
    return ApiResponse.ok(data=True, message="Password updated successfully. Please log in with your new credentials.")
