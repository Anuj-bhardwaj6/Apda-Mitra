import uuid
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator
from app.core.roles import UserRole
from app.core.security import validate_password_strength


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    mobile_number: Optional[str] = None
    phone: Optional[str] = None
    role: str = UserRole.CITIZEN.value
    assigned_district: Optional[str] = None
    assigned_state: Optional[str] = None


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    is_active: bool = True
    is_verified: bool = False
    is_email_verified: bool = False
    is_mobile_verified: bool = False
    failed_login_attempts: int = 0
    last_login_at: Optional[datetime] = None
    last_latitude: Optional[float] = None
    last_longitude: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    @field_validator("is_active", mode="before")
    @classmethod
    def default_active(cls, v: Any) -> bool:
        return bool(v) if v is not None else True

    @field_validator("is_verified", "is_email_verified", "is_mobile_verified", mode="before")
    @classmethod
    def default_bool_flags(cls, v: Any) -> bool:
        return bool(v) if v is not None else False

    @field_validator("failed_login_attempts", mode="before")
    @classmethod
    def default_failed_attempts(cls, v: Any) -> int:
        return int(v) if v is not None else 0


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=128)
    mobile_number: Optional[str] = Field(default=None, pattern=r"^\+?[0-9]{10,15}$")
    phone: Optional[str] = Field(default=None, pattern=r"^\+?[0-9]{10,15}$")
    assigned_district: Optional[str] = None
    assigned_state: Optional[str] = None
    fcm_token: Optional[str] = None

    @model_validator(mode="after")
    def sync_phones(self) -> "UserUpdate":
        if self.phone and not self.mobile_number:
            self.mobile_number = self.phone
        elif self.mobile_number and not self.phone:
            self.phone = self.mobile_number
        return self


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., min_length=1, description="Existing account password")
    new_password: str = Field(..., min_length=8, max_length=128, description="Strong new password")

    @field_validator("new_password")
    @classmethod
    def check_password_strength(cls, v: str) -> str:
        validate_password_strength(v)
        return v


class UserSettingsUpdate(BaseModel):
    notifications_enabled: Optional[bool] = True
    sms_alerts_enabled: Optional[bool] = True
    emergency_broadcasts_enabled: Optional[bool] = True
    language_preference: Optional[str] = "en"


class UserRoleUpdate(BaseModel):
    role: UserRole


class TelemetryUpdate(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
