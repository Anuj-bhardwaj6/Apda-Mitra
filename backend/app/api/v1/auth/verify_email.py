from fastapi import APIRouter, Depends, Request
from app.api.deps import get_auth_service
from app.schemas.auth import SendEmailVerificationRequest, VerifyEmailRequest
from app.schemas.base import ApiResponse
from app.services.auth_service import AuthService

router = APIRouter()


@router.post(
    "/verify-email",
    response_model=ApiResponse[bool],
    summary="Verify Email Address",
    description="Validates email confirmation token and marks user email as verified.",
)
async def verify_email(
    payload: VerifyEmailRequest,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
) -> ApiResponse[bool]:
    client_ip = request.client.host if request.client else None
    await auth_service.verify_email(token=payload.token, client_ip=client_ip)
    return ApiResponse.ok(data=True, message="Email successfully verified.")


@router.post(
    "/verify-email/send",
    response_model=ApiResponse[dict],
    summary="Request Email Verification Link",
    description="Sends verification link with cryptographic token to registered email address.",
)
async def send_verification_email(
    payload: SendEmailVerificationRequest,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
) -> ApiResponse[dict]:
    client_ip = request.client.host if request.client else None
    result = await auth_service.send_email_verification(email=payload.email, client_ip=client_ip)
    return ApiResponse.ok(data=result, message="Verification link dispatched.")
