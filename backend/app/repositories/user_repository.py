import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Union
from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.repositories.base import BaseRepository
from app.models.audit_log import AuditLog
from app.models.refresh_token import RefreshToken
from app.models.user import User


class UserRepository(BaseRepository[User]):
    """
    Production-grade Data Access Repository for User identity, credentials,
    refresh token rotation, brute-force defenses, and compliance audit logging.
    """

    def __init__(self, session: AsyncSession):
        super().__init__(User, session)

    async def get_by_id(self, user_id: Any, include_deleted: bool = False) -> Optional[User]:
        """Fetch user by primary key, filtering out soft-deleted accounts by default."""
        if isinstance(user_id, str):
            try:
                user_id = uuid.UUID(user_id)
            except ValueError:
                return None

        stmt = select(User).where(User.id == user_id)
        if not include_deleted:
            stmt = stmt.where(User.is_deleted.is_(False))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str, include_deleted: bool = False) -> Optional[User]:
        """Case-insensitive exact email query."""
        if not email:
            return None
        stmt = select(User).where(func.lower(User.email) == email.strip().lower())
        if not include_deleted:
            stmt = stmt.where(User.is_deleted.is_(False))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_mobile(self, mobile_number: str, include_deleted: bool = False) -> Optional[User]:
        """Find user by mobile number."""
        if not mobile_number:
            return None
        cleaned = mobile_number.strip()
        stmt = select(User).where(User.mobile_number == cleaned)
        if not include_deleted:
            stmt = stmt.where(User.is_deleted.is_(False))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_phone(self, phone: str, include_deleted: bool = False) -> Optional[User]:
        """Backward-compatible alias for get_by_mobile."""
        return await self.get_by_mobile(phone, include_deleted=include_deleted)

    async def get_by_identifier(self, identifier: str, include_deleted: bool = False) -> Optional[User]:
        """Find user by either email OR mobile phone number."""
        if not identifier:
            return None
        cleaned = identifier.strip()
        user = await self.get_by_email(cleaned, include_deleted=include_deleted)
        if not user:
            user = await self.get_by_mobile(cleaned, include_deleted=include_deleted)
        return user

    async def increment_failed_attempts(self, user: User) -> int:
        """
        Increments failed login counter.
        Locks account for ACCOUNT_LOCKOUT_MINUTES when threshold is exceeded.
        """
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= settings.MAX_FAILED_LOGIN_ATTEMPTS:
            user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCOUNT_LOCKOUT_MINUTES)
        self.session.add(user)
        await self.session.flush()
        return user.failed_login_attempts

    async def reset_failed_attempts(self, user: User) -> None:
        """Resets failed login attempts and updates last_login_at timestamp upon successful authentication."""
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login_at = datetime.now(timezone.utc)
        self.session.add(user)
        await self.session.flush()

    async def soft_delete(self, user_id: Any) -> bool:
        """Soft-deletes a user by marking is_deleted = True and deactivating."""
        user = await self.get_by_id(user_id, include_deleted=False)
        if not user:
            return False
        user.is_deleted = True
        user.is_active = False
        self.session.add(user)
        await self.session.flush()
        return True

    async def get_by_role_and_district(self, role: str, district: str) -> List[User]:
        stmt = select(User).where(
            User.role == role,
            User.assigned_district == district,
            User.is_deleted.is_(False),
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def update_telemetry_coordinates(self, user_id: Any, latitude: float, longitude: float) -> Optional[User]:
        user = await self.get_by_id(user_id)
        if user:
            user.last_latitude = latitude
            user.last_longitude = longitude
            self.session.add(user)
            await self.session.flush()
        return user

    async def update_fcm_token(self, user_id: Any, token: str) -> Optional[User]:
        user = await self.get_by_id(user_id)
        if user:
            user.fcm_token = token
            self.session.add(user)
            await self.session.flush()
        return user

    # --- Refresh Token Management ---

    async def save_refresh_token(
        self,
        user_id: uuid.UUID,
        jti: str,
        token_hash: str,
        expires_at: datetime,
    ) -> RefreshToken:
        """Persists a new refresh token for tracking and rotation."""
        record = RefreshToken(
            user_id=user_id,
            jti=jti,
            token_hash=token_hash,
            expires_at=expires_at,
            is_revoked=False,
        )
        self.session.add(record)
        await self.session.flush()
        return record

    async def get_refresh_token(self, jti: str) -> Optional[RefreshToken]:
        """Finds refresh token metadata by unique JTI."""
        stmt = select(RefreshToken).where(RefreshToken.jti == jti)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def revoke_refresh_token(self, jti: str, replaced_by: Optional[str] = None) -> bool:
        """Revokes a specific refresh token by JTI and records replacement JTI."""
        record = await self.get_refresh_token(jti)
        if record:
            record.is_revoked = True
            record.revoked_at = datetime.now(timezone.utc)
            if replaced_by:
                record.replaced_by = replaced_by
            self.session.add(record)
            await self.session.flush()
            return True
        return False

    async def revoke_all_user_refresh_tokens(self, user_id: uuid.UUID) -> int:
        """Revokes all active refresh tokens for a user (e.g. on password change or breach)."""
        stmt = (
            update(RefreshToken)
            .where(
                RefreshToken.user_id == user_id,
                RefreshToken.is_revoked.is_(False),
            )
            .values(
                is_revoked=True,
                revoked_at=datetime.now(timezone.utc),
            )
        )
        res = await self.session.execute(stmt)
        await self.session.flush()
        return res.rowcount

    # --- Audit Logging ---

    async def record_audit_log(
        self,
        action: str,
        resource_type: str,
        user_id: Optional[uuid.UUID] = None,
        resource_id: Optional[str] = None,
        client_ip: Optional[str] = None,
        user_agent: Optional[str] = None,
        status: str = "SUCCESS",
        details: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """Appends an immutable audit log record to the compliance ledger."""
        log = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            client_ip=client_ip,
            user_agent=user_agent,
            status=status,
            details=details or {},
            timestamp=datetime.now(timezone.utc),
        )
        self.session.add(log)
        await self.session.flush()
        return log
