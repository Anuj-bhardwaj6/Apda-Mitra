from fastapi import APIRouter, Depends, Request
from app.api.deps import get_auth_service
from app.schemas.auth import ForgotPasswordRequest
from app.schemas.base import ApiResponse
from app.services.auth_service import AuthService

router = APIRouter()


@router.post(
    "/forgot-password",
    response_model=ApiResponse[dict],
    summary="Initiate Password Reset Request",
    description="Dispatches password recovery link or OTP to registered email/phone.",
)
async def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
) -> ApiResponse[dict]:
    client_ip = request.client.host if request.client else None
    result = await auth_service.forgot_password(payload=payload, client_ip=client_ip)
    return ApiResponse.ok(data=result, message="Password reset instructions dispatched.")
