import uuid
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator
from app.core.roles import UserRole
from app.core.security import validate_password_strength
from app.schemas.token import TokenResponse, TokenUserSummary


class UserSummary(TokenUserSummary):
    """User summary representation for auth responses."""
    pass


class RegisterRequest(BaseModel):
    email: EmailStr
    mobile_number: Optional[str] = Field(default=None, pattern=r"^\+?[0-9]{10,15}$")
    phone: Optional[str] = Field(default=None, pattern=r"^\+?[0-9]{10,15}$")
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=128)
    role: UserRole = Field(default=UserRole.CITIZEN)
    assigned_district: Optional[str] = Field(default=None, max_length=64)
    assigned_state: Optional[str] = Field(default=None, max_length=64)

    @field_validator("password")
    @classmethod
    def check_password_strength(cls, v: str) -> str:
        validate_password_strength(v)
        return v

    @model_validator(mode="after")
    def sync_phone_mobile(self) -> "RegisterRequest":
        if not self.mobile_number and self.phone:
            self.mobile_number = self.phone
        elif not self.phone and self.mobile_number:
            self.phone = self.mobile_number
        return self


class LoginRequest(BaseModel):
    email: Optional[EmailStr] = None
    mobile_number: Optional[str] = None
    username: Optional[str] = None
    password: str = Field(min_length=1, max_length=128)

    @model_validator(mode="after")
    def validate_identifier_present(self) -> "LoginRequest":
        if not self.email and not self.mobile_number and not self.username:
            raise ValueError("Must provide either email, mobile_number, or username to log in.")
        return self


class ForgotPasswordRequest(BaseModel):
    email: Optional[EmailStr] = None
    mobile_number: Optional[str] = None

    @model_validator(mode="after")
    def validate_target_present(self) -> "ForgotPasswordRequest":
        if not self.email and not self.mobile_number:
            raise ValueError("Must provide an email or mobile number to request a password reset.")
        return self


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=6, description="Reset token or OTP")
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def check_new_password_strength(cls, v: str) -> str:
        validate_password_strength(v)
        return v


class SendEmailVerificationRequest(BaseModel):
    email: EmailStr


class VerifyEmailRequest(BaseModel):
    token: str = Field(..., min_length=6)


class SendOtpRequest(BaseModel):
    mobile_number: Optional[str] = Field(default=None, pattern=r"^\+?[0-9]{10,15}$")
    phone: Optional[str] = Field(default=None, pattern=r"^\+?[0-9]{10,15}$")

    @model_validator(mode="after")
    def check_number(self) -> "SendOtpRequest":
        target = self.mobile_number or self.phone
        if not target:
            raise ValueError("Mobile number or phone is required.")
        self.mobile_number = target
        self.phone = target
        return self


# Backward-compatible alias
class OtpRequest(SendOtpRequest):
    pass


class VerifyOtpRequest(BaseModel):
    mobile_number: Optional[str] = Field(default=None, pattern=r"^\+?[0-9]{10,15}$")
    phone: Optional[str] = Field(default=None, pattern=r"^\+?[0-9]{10,15}$")
    otp: str = Field(min_length=6, max_length=6, pattern=r"^[0-9]{6}$")

    @model_validator(mode="after")
    def check_number(self) -> "VerifyOtpRequest":
        target = self.mobile_number or self.phone
        if not target:
            raise ValueError("Mobile number or phone is required.")
        self.mobile_number = target
        self.phone = target
        return self


# Backward-compatible alias
class OtpVerifyRequest(VerifyOtpRequest):
    pass


from app.schemas.token import RefreshTokenRequest
