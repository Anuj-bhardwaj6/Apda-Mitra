from fastapi import APIRouter, Depends, Request
from app.api.deps import get_auth_service, get_current_user, get_current_user_token_payload
from app.models.user import User
from app.schemas.base import ApiResponse
from app.services.auth_service import AuthService

router = APIRouter()


@router.post(
    "/logout",
    response_model=ApiResponse[bool],
    summary="Logout and Invalidate Session",
    description="Revokes access token JTI and all user refresh tokens across all sessions.",
)
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    token_payload: dict = Depends(get_current_user_token_payload),
    auth_service: AuthService = Depends(get_auth_service),
) -> ApiResponse[bool]:
    client_ip = request.client.host if request.client else None
    await auth_service.logout(
        current_user=current_user,
        token_payload=token_payload,
        client_ip=client_ip,
    )
    return ApiResponse.ok(data=True, message="Session logged out successfully.")
