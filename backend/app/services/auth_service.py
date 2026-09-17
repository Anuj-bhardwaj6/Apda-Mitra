import logging
import uuid
from typing import Any, Dict, Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    ResetPasswordRequest,
)
from app.schemas.token import TokenResponse
from app.services.otp_service import OtpService
from app.services.token_service import TokenService

logger = logging.getLogger("apda.auth_service")


class AuthService:
    """
    Enterprise Authentication Service orchestrating registration, multi-factor verification,
    dual-identifier login, brute-force defenses, token management, and audit logging.
    """

    def __init__(
        self,
        session: Optional[AsyncSession] = None,
        user_repo: Optional[UserRepository] = None,
        token_service: Optional[TokenService] = None,
        otp_service: Optional[OtpService] = None,
    ):
        self.session = session
        self.user_repo = user_repo if user_repo is not None else (UserRepository(session) if session else None)
        self.token_service = token_service or TokenService(session=session, user_repo=self.user_repo)
        self.otp_service = otp_service or OtpService()

    async def register(
        self,
        payload: RegisterRequest,
        client_ip: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> TokenResponse:
        """
        Registers a new user with strong password verification, checks uniqueness
        of email and phone, persists user, issues token pair, and writes an audit log.
        """
        clean_email = payload.email.strip().lower()
        if hasattr(self.user_repo, "get_by_email"):
            existing_email = await self.user_repo.get_by_email(clean_email)
            if existing_email:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="An account is already registered with this email address.",
                )

        phone_target = payload.mobile_number or payload.phone
        if phone_target:
            clean_phone = phone_target.strip()
            get_phone_fn = getattr(self.user_repo, "get_by_mobile", None) or getattr(self.user_repo, "get_by_phone", None)
            if get_phone_fn:
                existing_phone = await get_phone_fn(clean_phone)
                if existing_phone:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="An account is already registered with this phone number.",
                    )
        else:
            clean_phone = None

        password_hash = get_password_hash(payload.password)

        new_user = await self.user_repo.create(
            email=clean_email,
            mobile_number=clean_phone,
            phone=clean_phone,
            password_hash=password_hash,
            hashed_password=password_hash,
            full_name=payload.full_name.strip(),
            role=payload.role.value if hasattr(payload.role, "value") else str(payload.role),
            assigned_district=payload.assigned_district,
            assigned_state=payload.assigned_state,
            is_active=True,
            is_verified=False,
            is_email_verified=False,
            is_mobile_verified=False,
            is_deleted=False,
            failed_login_attempts=0,
        )

        tokens = await self.token_service.issue_token_pair(new_user)

        # Audit Log if repository supports it
        if hasattr(self.user_repo, "record_audit_log"):
            try:
                user_uuid = new_user.id if isinstance(new_user.id, uuid.UUID) else uuid.UUID(str(new_user.id))
            except Exception:
                user_uuid = None

            await self.user_repo.record_audit_log(
                action="USER_REGISTERED",
                resource_type="AUTH",
                user_id=user_uuid,
                resource_id=str(new_user.id),
                client_ip=client_ip,
                user_agent=user_agent,
                status="SUCCESS",
                details={
                    "email": clean_email,
                    "role": getattr(new_user, "role", ""),
                    "district": getattr(new_user, "assigned_district", None),
                },
            )

        return tokens

    async def login(
        self,
        payload: LoginRequest,
        client_ip: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> TokenResponse:
        """
        Authenticates user using email OR mobile number.
        Enforces account lockout policy after 5 failed attempts.
        """
        identifier = payload.email or payload.mobile_number or payload.username
        if not identifier:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Login identifier (email or mobile) is required.",
            )

        clean_id = str(identifier).strip()
        user = None

        if hasattr(self.user_repo, "get_by_identifier"):
            user = await self.user_repo.get_by_identifier(clean_id)
        elif hasattr(self.user_repo, "get_by_email"):
            user = await self.user_repo.get_by_email(clean_id)
            if not user and hasattr(self.user_repo, "get_by_phone"):
                user = await self.user_repo.get_by_phone(clean_id)
            elif not user and hasattr(self.user_repo, "get_by_mobile"):
                user = await self.user_repo.get_by_mobile(clean_id)

        if not user:
            if hasattr(self.user_repo, "record_audit_log"):
                await self.user_repo.record_audit_log(
                    action="LOGIN_FAILED",
                    resource_type="AUTH",
                    client_ip=client_ip,
                    user_agent=user_agent,
                    status="FAILURE",
                    details={"identifier": clean_id, "reason": "User not found"},
                )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email/phone or password combination.",
            )

        # Check soft delete or disabled account
        is_active = getattr(user, "is_active", True)
        is_deleted = getattr(user, "is_deleted", False)
        if not is_active or is_deleted:
            if hasattr(self.user_repo, "record_audit_log"):
                await self.user_repo.record_audit_log(
                    action="LOGIN_BLOCKED",
                    resource_type="AUTH",
                    user_id=getattr(user, "id", None),
                    client_ip=client_ip,
                    user_agent=user_agent,
                    status="BLOCKED",
                    details={"reason": "Account deactivated or deleted"},
                )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated. Contact district administration.",
            )

        # Check account lockout
        if hasattr(user, "is_locked") and user.is_locked():
            if hasattr(self.user_repo, "record_audit_log"):
                await self.user_repo.record_audit_log(
                    action="LOGIN_LOCKED",
                    resource_type="AUTH",
                    user_id=getattr(user, "id", None),
                    client_ip=client_ip,
                    user_agent=user_agent,
                    status="LOCKED",
                    details={"locked_until": str(getattr(user, "locked_until", None))},
                )
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail="Account is temporarily locked due to repeated failed login attempts. Try again later.",
            )

        # Validate password
        user_pw_hash = getattr(user, "password_hash", None) or getattr(user, "hashed_password", None)
        if not user_pw_hash or not verify_password(payload.password, user_pw_hash):
            attempts = 1
            if hasattr(self.user_repo, "increment_failed_attempts"):
                attempts = await self.user_repo.increment_failed_attempts(user)

            if attempts >= settings.MAX_FAILED_LOGIN_ATTEMPTS:
                if hasattr(self.user_repo, "record_audit_log"):
                    await self.user_repo.record_audit_log(
                        action="ACCOUNT_LOCKED",
                        resource_type="AUTH",
                        user_id=getattr(user, "id", None),
                        client_ip=client_ip,
                        user_agent=user_agent,
                        status="LOCKED",
                        details={"consecutive_failures": attempts},
                    )
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail=f"Account locked for {settings.ACCOUNT_LOCKOUT_MINUTES} minutes due to {settings.MAX_FAILED_LOGIN_ATTEMPTS} failed attempts.",
                )

            if hasattr(self.user_repo, "record_audit_log"):
                await self.user_repo.record_audit_log(
                    action="LOGIN_FAILED",
                    resource_type="AUTH",
                    user_id=getattr(user, "id", None),
                    client_ip=client_ip,
                    user_agent=user_agent,
                    status="FAILURE",
                    details={"failed_attempt_count": attempts},
                )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email/phone or password combination.",
            )

        # Credentials valid - reset failed attempts and log in
        if hasattr(self.user_repo, "reset_failed_attempts"):
            await self.user_repo.reset_failed_attempts(user)

        tokens = await self.token_service.issue_token_pair(user)

        if hasattr(self.user_repo, "record_audit_log"):
            await self.user_repo.record_audit_log(
                action="LOGIN_SUCCESS",
                resource_type="AUTH",
                user_id=getattr(user, "id", None),
                client_ip=client_ip,
                user_agent=user_agent,
                status="SUCCESS",
                details={"email": getattr(user, "email", ""), "role": getattr(user, "role", "")},
            )

        return tokens

    async def refresh_session(
        self,
        payload: RefreshTokenRequest,
        client_ip: Optional[str] = None,
    ) -> TokenResponse:
        """Rotates refresh token and returns a new access/refresh token pair."""
        tokens = await self.token_service.rotate_refresh_token(payload.refresh_token)
        return tokens

    async def logout(
        self,
        current_user: User,
        token_payload: Dict[str, Any],
        client_ip: Optional[str] = None,
    ) -> bool:
        """Revokes the current access token JTI and all user refresh tokens."""
        jti = token_payload.get("jti")
        await self.token_service.revoke_session(jti=jti, user_id=getattr(current_user, "id", None))

        if hasattr(self.user_repo, "record_audit_log"):
            await self.user_repo.record_audit_log(
                action="LOGOUT",
                resource_type="AUTH",
                user_id=getattr(current_user, "id", None),
                client_ip=client_ip,
                status="SUCCESS",
                details={"jti": jti},
            )
        return True

    async def forgot_password(
        self,
        payload: ForgotPasswordRequest,
        client_ip: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Sends password reset instructions via email or SMS.
        Always returns success to prevent account enumeration.
        """
        identifier = payload.email or payload.mobile_number
        if identifier and self.user_repo:
            clean_str = str(identifier).strip()
            user = None
            if hasattr(self.user_repo, "get_by_identifier"):
                user = await self.user_repo.get_by_identifier(clean_str)
            elif hasattr(self.user_repo, "get_by_email"):
                user = await self.user_repo.get_by_email(clean_str)

            if user:
                if payload.email and hasattr(user, "email"):
                    await self.otp_service.send_email_token(user.email, purpose="password_reset")
                elif hasattr(user, "mobile_number") and user.mobile_number:
                    await self.otp_service.send_mobile_otp(user.mobile_number, purpose="password_reset")

                if hasattr(self.user_repo, "record_audit_log"):
                    await self.user_repo.record_audit_log(
                        action="PASSWORD_RESET_REQUESTED",
                        resource_type="AUTH",
                        user_id=getattr(user, "id", None),
                        client_ip=client_ip,
                        status="SUCCESS",
                    )

        return {
            "message": "If the account exists, instructions have been sent to reset your password.",
        }

    async def reset_password(
        self,
        payload: ResetPasswordRequest,
        client_ip: Optional[str] = None,
    ) -> bool:
        """Verifies the reset token, updates password, and revokes all active sessions."""
        email = await self.otp_service.verify_email_token(payload.token, purpose="password_reset")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid, expired, or previously consumed password reset token.",
            )

        user = await self.user_repo.get_by_email(email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Associated user account not found.",
            )

        new_hash = get_password_hash(payload.new_password)
        if hasattr(self.user_repo, "update"):
            await self.user_repo.update(user, password_hash=new_hash, hashed_password=new_hash)
        else:
            user.password_hash = new_hash
            if hasattr(user, "hashed_password"):
                user.hashed_password = new_hash

        # Revoke all existing sessions for security
        if hasattr(self.user_repo, "revoke_all_user_refresh_tokens"):
            await self.user_repo.revoke_all_user_refresh_tokens(user.id)

        if hasattr(self.user_repo, "record_audit_log"):
            await self.user_repo.record_audit_log(
                action="PASSWORD_RESET_COMPLETED",
                resource_type="AUTH",
                user_id=getattr(user, "id", None),
                client_ip=client_ip,
                status="SUCCESS",
            )
        return True

    async def send_email_verification(
        self,
        email: str,
        client_ip: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Dispatches an email verification token."""
        user = await self.user_repo.get_by_email(email.strip().lower())
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User account not found.",
            )

        token = await self.otp_service.send_email_token(user.email, purpose="email_verification")
        return {"email": user.email, "message": "Verification email dispatched."}

    async def verify_email(
        self,
        token: str,
        client_ip: Optional[str] = None,
    ) -> bool:
        """Verifies email token and marks user email as verified."""
        email = await self.otp_service.verify_email_token(token, purpose="email_verification")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification link is invalid or expired.",
            )

        user = await self.user_repo.get_by_email(email)
        if user:
            if hasattr(self.user_repo, "update"):
                await self.user_repo.update(user, is_email_verified=True, is_verified=True)
            else:
                user.is_email_verified = True
                user.is_verified = True

            if hasattr(self.user_repo, "record_audit_log"):
                await self.user_repo.record_audit_log(
                    action="EMAIL_VERIFIED",
                    resource_type="AUTH",
                    user_id=getattr(user, "id", None),
                    client_ip=client_ip,
                    status="SUCCESS",
                )
            return True
        return False

    async def send_mobile_otp(
        self,
        mobile_number: str,
        client_ip: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Dispatches a mobile phone OTP."""
        return await self.otp_service.send_mobile_otp(mobile_number, purpose="mobile_verification")

    async def verify_mobile_otp(
        self,
        mobile_number: str,
        otp: str,
        client_ip: Optional[str] = None,
    ) -> bool:
        """Verifies phone OTP and marks phone as verified."""
        is_valid = await self.otp_service.verify_mobile_otp(
            mobile_number=mobile_number,
            otp=otp,
            purpose="mobile_verification",
        )
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provided OTP is incorrect or has expired.",
            )

        get_phone_fn = getattr(self.user_repo, "get_by_mobile", None) or getattr(self.user_repo, "get_by_phone", None)
        if get_phone_fn:
            user = await get_phone_fn(mobile_number)
            if user:
                if hasattr(self.user_repo, "update"):
                    await self.user_repo.update(user, is_mobile_verified=True, is_verified=True)
                else:
                    user.is_mobile_verified = True
                    user.is_verified = True

                if hasattr(self.user_repo, "record_audit_log"):
                    await self.user_repo.record_audit_log(
                        action="MOBILE_VERIFIED",
                        resource_type="AUTH",
                        user_id=getattr(user, "id", None),
                        client_ip=client_ip,
                        status="SUCCESS",
                    )

        return True
