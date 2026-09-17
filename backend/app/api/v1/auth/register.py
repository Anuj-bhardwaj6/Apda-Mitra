from fastapi import APIRouter, Depends, Request, status
from app.api.deps import get_auth_service
from app.schemas.auth import RegisterRequest
from app.schemas.base import ApiResponse
from app.schemas.token import TokenResponse
from app.services.auth_service import AuthService

router = APIRouter()


@router.post(
    "/register",
    response_model=ApiResponse[TokenResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Register New User Account",
    description="Registers a new citizen, volunteer, or officer with encrypted password and audit logging.",
)
async def register(
    payload: RegisterRequest,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
) -> ApiResponse[TokenResponse]:
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    tokens = await auth_service.register(
        payload=payload,
        client_ip=client_ip,
        user_agent=user_agent,
    )
    return ApiResponse.ok(data=tokens, message="Account created successfully.")
