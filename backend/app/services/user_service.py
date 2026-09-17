import logging
import uuid
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.roles import UserRole
from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import (
    PasswordChangeRequest,
    UserRead,
    UserSettingsUpdate,
    UserUpdate,
)

logger = logging.getLogger("apda.user_service")


class UserService:
    """
    Enterprise User profile and account lifecycle service.
    Handles profile updates, credential changes, account deactivation,
    and role management with audit trail integrity.
    """

    def __init__(
        self,
        session: Optional[AsyncSession] = None,
        user_repo: Optional[UserRepository] = None,
    ):
        self.session = session
        self.user_repo = user_repo if user_repo is not None else (UserRepository(session) if session else None)

    async def get_profile(self, user: User) -> UserRead:
        """Retrieves verified user profile representation."""
        return UserRead.model_validate(user)

    async def update_profile(
        self,
        user: User,
        payload: UserUpdate,
        client_ip: Optional[str] = None,
    ) -> UserRead:
        """Updates user demographic, contact, and notification preferences."""
        update_data = payload.model_dump(exclude_unset=True)

        # If phone/mobile_number is changing, check uniqueness
        new_phone = update_data.get("mobile_number") or update_data.get("phone")
        if new_phone and new_phone != getattr(user, "mobile_number", None):
            get_phone_fn = getattr(self.user_repo, "get_by_mobile", None) or getattr(self.user_repo, "get_by_phone", None)
            if get_phone_fn:
                existing = await get_phone_fn(new_phone)
                if existing and str(existing.id) != str(user.id):
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="This phone number is already registered to another account.",
                    )
            user.mobile_number = new_phone
            user.phone = new_phone
            user.is_mobile_verified = False  # requires re-verification

        if "full_name" in update_data and update_data["full_name"]:
            user.full_name = update_data["full_name"].strip()

        if "assigned_district" in update_data:
            user.assigned_district = update_data["assigned_district"]

        if "assigned_state" in update_data:
            user.assigned_state = update_data["assigned_state"]

        if "fcm_token" in update_data:
            user.fcm_token = update_data["fcm_token"]

        if self.user_repo and hasattr(self.user_repo, "update"):
            await self.user_repo.update(user, **update_data)
        elif self.session:
            self.session.add(user)
            await self.session.flush()

        if self.user_repo and hasattr(self.user_repo, "record_audit_log"):
            await self.user_repo.record_audit_log(
                action="PROFILE_UPDATED",
                resource_type="USER",
                user_id=getattr(user, "id", None),
                resource_id=str(getattr(user, "id", "")),
                client_ip=client_ip,
                status="SUCCESS",
                details={"updated_fields": list(update_data.keys())},
            )

        return UserRead.model_validate(user)

    async def change_password(
        self,
        user: User,
        payload: PasswordChangeRequest,
        client_ip: Optional[str] = None,
    ) -> bool:
        """
        Validates existing password, hashes new password, updates DB,
        revokes all active refresh tokens for session invalidation,
        and logs audit event.
        """
        current_pw_hash = getattr(user, "password_hash", None) or getattr(user, "hashed_password", None)
        if not current_pw_hash or not verify_password(payload.current_password, current_pw_hash):
            if self.user_repo and hasattr(self.user_repo, "record_audit_log"):
                await self.user_repo.record_audit_log(
                    action="PASSWORD_CHANGE_FAILED",
                    resource_type="USER",
                    user_id=getattr(user, "id", None),
                    client_ip=client_ip,
                    status="FAILURE",
                    details={"reason": "Invalid current password"},
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect.",
            )

        new_hash = get_password_hash(payload.new_password)
        if self.user_repo and hasattr(self.user_repo, "update"):
            await self.user_repo.update(user, password_hash=new_hash, hashed_password=new_hash)
        else:
            user.password_hash = new_hash
            if hasattr(user, "hashed_password"):
                user.hashed_password = new_hash
            if self.session:
                self.session.add(user)
                await self.session.flush()

        # Invalidate all active refresh tokens across devices
        if self.user_repo and hasattr(self.user_repo, "revoke_all_user_refresh_tokens"):
            await self.user_repo.revoke_all_user_refresh_tokens(user.id)

        if self.user_repo and hasattr(self.user_repo, "record_audit_log"):
            await self.user_repo.record_audit_log(
                action="PASSWORD_CHANGED",
                resource_type="USER",
                user_id=getattr(user, "id", None),
                resource_id=str(getattr(user, "id", "")),
                client_ip=client_ip,
                status="SUCCESS",
            )
        return True

    async def update_settings(
        self,
        user: User,
        payload: UserSettingsUpdate,
        client_ip: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Updates user account notification and alert preferences."""
        settings_dict = payload.model_dump(exclude_unset=True)

        if self.user_repo and hasattr(self.user_repo, "record_audit_log"):
            await self.user_repo.record_audit_log(
                action="SETTINGS_UPDATED",
                resource_type="USER",
                user_id=getattr(user, "id", None),
                client_ip=client_ip,
                status="SUCCESS",
                details=settings_dict,
            )
        return settings_dict

    async def deactivate_account(
        self,
        user: User,
        client_ip: Optional[str] = None,
    ) -> bool:
        """Soft-deletes user and revokes all active tokens."""
        if self.user_repo and hasattr(self.user_repo, "soft_delete"):
            await self.user_repo.soft_delete(user.id)
        if self.user_repo and hasattr(self.user_repo, "revoke_all_user_refresh_tokens"):
            await self.user_repo.revoke_all_user_refresh_tokens(user.id)

        if self.user_repo and hasattr(self.user_repo, "record_audit_log"):
            await self.user_repo.record_audit_log(
                action="ACCOUNT_DEACTIVATED",
                resource_type="USER",
                user_id=getattr(user, "id", None),
                resource_id=str(getattr(user, "id", "")),
                client_ip=client_ip,
                status="SUCCESS",
            )
        return True

    async def update_user_role(
        self,
        target_user_id: uuid.UUID,
        new_role: UserRole,
        admin_user: User,
        client_ip: Optional[str] = None,
    ) -> UserRead:
        """Promotes or reassigns user role (requires NDMA Admin)."""
        target = await self.user_repo.get_by_id(target_user_id)
        if not target:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target user account not found.",
            )

        old_role = target.role
        role_val = new_role.value if hasattr(new_role, "value") else str(new_role)
        if self.user_repo and hasattr(self.user_repo, "update"):
            await self.user_repo.update(target, role=role_val)
        else:
            target.role = role_val
            if self.session:
                self.session.add(target)
                await self.session.flush()

        if self.user_repo and hasattr(self.user_repo, "record_audit_log"):
            await self.user_repo.record_audit_log(
                action="ROLE_ASSIGNED",
                resource_type="USER",
                user_id=target.id,
                resource_id=str(target.id),
                client_ip=client_ip,
                status="SUCCESS",
                details={
                    "assigned_by": str(getattr(admin_user, "id", "")),
                    "old_role": old_role,
                    "new_role": role_val,
                },
            )
        return UserRead.model_validate(target)

    async def list_users(self, role: str, district: str) -> List[UserRead]:
        """Lists registered personnel by district and role."""
        users = []
        if self.user_repo and hasattr(self.user_repo, "get_by_role_and_district"):
            users = await self.user_repo.get_by_role_and_district(role, district)
        return [UserRead.model_validate(u) for u in users]

    async def update_telemetry(self, user: User, latitude: float, longitude: float) -> bool:
        """Updates user GPS telemetry coordinates for geospatial response."""
        if self.user_repo and hasattr(self.user_repo, "update_telemetry_coordinates"):
            await self.user_repo.update_telemetry_coordinates(
                user_id=user.id,
                latitude=latitude,
                longitude=longitude,
            )
        return True
