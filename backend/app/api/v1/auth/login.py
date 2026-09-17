from fastapi import APIRouter, Depends, Request
from app.api.deps import get_auth_service
from app.schemas.auth import LoginRequest
from app.schemas.base import ApiResponse
from app.schemas.token import TokenResponse
from app.services.auth_service import AuthService

router = APIRouter()


@router.post(
    "/login",
    response_model=ApiResponse[TokenResponse],
    summary="User Login & Token Generation",
    description="Authenticates via email or mobile number with automatic account locking after 5 failed attempts.",
)
async def login(
    payload: LoginRequest,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
) -> ApiResponse[TokenResponse]:
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    tokens = await auth_service.login(
        payload=payload,
        client_ip=client_ip,
        user_agent=user_agent,
    )
    return ApiResponse.ok(data=tokens, message="Login successful.")
