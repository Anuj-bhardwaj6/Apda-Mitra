from fastapi import APIRouter, Depends, Request
from app.api.deps import get_auth_service
from app.schemas.auth import RefreshTokenRequest
from app.schemas.base import ApiResponse
from app.schemas.token import TokenResponse
from app.services.auth_service import AuthService

router = APIRouter()


@router.post(
    "/refresh",
    response_model=ApiResponse[TokenResponse],
    summary="Rotate JWT Access and Refresh Tokens",
    description="Refreshes access token and rotates refresh token. Protects against token reuse attacks.",
)
async def refresh_session(
    payload: RefreshTokenRequest,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
) -> ApiResponse[TokenResponse]:
    client_ip = request.client.host if request.client else None
    tokens = await auth_service.refresh_session(
        payload=payload,
        client_ip=client_ip,
    )
    return ApiResponse.ok(data=tokens, message="Token pair rotated successfully.")
