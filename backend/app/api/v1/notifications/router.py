from typing import List, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from app.api.deps import get_current_user, get_user_repository, require_roles
from app.core.roles import UserRole
from app.db.models.user import User
from app.db.repositories.user_repository import UserRepository
from app.schemas.base import ApiResponse
from app.services.external.firebase import FirebaseNotificationService

router = APIRouter(prefix="/notifications", tags=["Emergency Broadcasts & Push Alerts"])


class BroadcastRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=128)
    message: str = Field(..., min_length=5, max_length=512)
    district: str = Field(..., max_length=64)
    alert_level: str = Field(default="RED", pattern="^(RED|ORANGE|YELLOW|GREEN)$")


class RegisterTokenRequest(BaseModel):
    fcm_token: str = Field(..., min_length=10, max_length=512)


@router.post(
    "/broadcast",
    response_model=ApiResponse[dict],
    summary="Dispatch Emergency Cell Broadcast to District (Officers Only)",
)
async def dispatch_broadcast(
    payload: BroadcastRequest,
    officer: User = Depends(
        require_roles(UserRole.DISTRICT_OFFICER, UserRole.STATE_OFFICER, UserRole.NDMA_ADMIN)
    ),
) -> ApiResponse[dict]:
    result = await FirebaseNotificationService.send_emergency_broadcast(
        title=payload.title,
        body=payload.message,
        district=payload.district,
        alert_level=payload.alert_level,
    )
    return ApiResponse.ok(
        data=result,
        message=f"Emergency broadcast transmitted across {payload.district} mobile towers.",
    )


@router.post(
    "/register-token",
    response_model=ApiResponse[bool],
    summary="Register Device Token for Cell Broadcast Push Notifications",
)
async def register_fcm_token(
    payload: RegisterTokenRequest,
    current_user: User = Depends(get_current_user),
    user_repo: UserRepository = Depends(get_user_repository),
) -> ApiResponse[bool]:
    await user_repo.update_fcm_token(current_user.id, payload.fcm_token)
    return ApiResponse.ok(data=True, message="Device registered for severe disaster alerts.")
