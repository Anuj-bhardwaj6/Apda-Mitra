from fastapi import APIRouter, Depends, Request
from app.api.deps import get_auth_service
from app.schemas.auth import SendOtpRequest, VerifyOtpRequest
from app.schemas.base import ApiResponse
from app.services.auth_service import AuthService

router = APIRouter()


@router.post(
    "/verify-mobile/send",
    response_model=ApiResponse[dict],
    summary="Request Mobile Phone OTP",
    description="Dispatches 6-digit OTP code to registered mobile number for two-factor/identity verification.",
)
async def send_mobile_otp(
    payload: SendOtpRequest,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
) -> ApiResponse[dict]:
    client_ip = request.client.host if request.client else None
    target_phone = payload.mobile_number or payload.phone
    result = await auth_service.send_mobile_otp(mobile_number=target_phone, client_ip=client_ip)
    return ApiResponse.ok(data=result, message="OTP dispatched via Government SMS Gateway.")


@router.post(
    "/verify-mobile",
    response_model=ApiResponse[bool],
    summary="Verify Mobile Phone OTP",
    description="Validates received 6-digit code against Redis cache and updates verification state.",
)
async def verify_mobile_otp(
    payload: VerifyOtpRequest,
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
    return ApiResponse.ok(data=True, message="Mobile phone number successfully verified.")
