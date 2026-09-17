from fastapi import APIRouter, Depends, Request
from app.api.deps import get_auth_service, get_current_user
from app.api.v1.auth.forgot_password import router as forgot_password_router
from app.api.v1.auth.login import router as login_router
from app.api.v1.auth.logout import router as logout_router
from app.api.v1.auth.refresh import router as refresh_router
from app.api.v1.auth.register import router as register_router
from app.api.v1.auth.reset_password import router as reset_password_router
from app.api.v1.auth.verify_email import router as verify_email_router
from app.api.v1.auth.verify_mobile import router as verify_mobile_router
from app.models.user import User
from app.schemas.auth import OtpRequest, OtpVerifyRequest, UserSummary
from app.schemas.base import ApiResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication & Identity"])

# Include Modular Feature Routers
router.include_router(register_router)
router.include_router(login_router)
router.include_router(refresh_router)
router.include_router(logout_router)
router.include_router(forgot_password_router)
router.include_router(reset_password_router)
router.include_router(verify_email_router)
router.include_router(verify_mobile_router)


# --- Backward-Compatible Aliases ---

@router.get(
    "/me",
    response_model=ApiResponse[UserSummary],
    summary="Current Authenticated User Summary (Compat)",
)
async def get_my_profile_compat(
    current_user: User = Depends(get_current_user),
) -> ApiResponse[UserSummary]:
    return ApiResponse.ok(data=UserSummary.model_validate(current_user))


@router.post(
    "/otp/request",
    response_model=ApiResponse[dict],
    summary="Request Phone Verification OTP (Compat)",
)
async def request_otp_compat(
    payload: OtpRequest,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
) -> ApiResponse[dict]:
    client_ip = request.client.host if request.client else None
    target_phone = payload.mobile_number or payload.phone
    result = await auth_service.send_mobile_otp(mobile_number=target_phone, client_ip=client_ip)
    return ApiResponse.ok(data=result, message="OTP dispatched via Government Emergency SMS Gateway.")


@router.post(
    "/otp/verify",
    response_model=ApiResponse[bool],
    summary="Verify Received OTP (Compat)",
)
async def verify_otp_compat(
    payload: OtpVerifyRequest,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
) -> ApiResponse[bool]:
    client_ip = request.client.host if request.client else None
    target_phone = payload.mobile_number or payload.phone
    await auth_service.verify_mobile_otp(
        mobile_number=target_phone,
        otp=payload.otp,
        client_ip=client_ip,
    )
    return ApiResponse.ok(data=True, message="Phone number successfully verified.")
