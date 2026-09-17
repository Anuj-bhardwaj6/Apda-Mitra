import uuid
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class TokenUserSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    mobile_number: Optional[str] = None
    phone: Optional[str] = None
    full_name: str
    role: str
    assigned_district: Optional[str] = None
    assigned_state: Optional[str] = None
    is_verified: bool = False
    is_email_verified: bool = False
    is_mobile_verified: bool = False


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: TokenUserSummary


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., min_length=10, description="Valid rotating JWT refresh token")


class TokenPayload(BaseModel):
    sub: str
    role: str
    exp: int
    iat: int
    jti: str
    type: str
