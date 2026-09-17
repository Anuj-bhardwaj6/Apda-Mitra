import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.roles import UserRole
from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.db.models.report import CitizenReport
    from app.models.refresh_token import RefreshToken


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Core User entity for APDA MITRA.
    Supports Citizens, Volunteers, District Officers, State Officers, and NDMA Admins.
    Includes enterprise security controls: account lockout, soft-delete, and verification flags.
    """
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    mobile_number: Mapped[Optional[str]] = mapped_column(String(32), unique=True, index=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(128), nullable=False)

    role: Mapped[str] = mapped_column(
        String(32),
        default=UserRole.CITIZEN.value,
        index=True,
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_mobile_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Security & Brute-Force Defense
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    locked_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Jurisdictional attributes
    assigned_district: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    assigned_state: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)

    # Push Notification Device Token (FCM)
    fcm_token: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    # GPS Telemetry Coordinates
    last_latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    last_longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Relationships
    reports: Mapped[List["CitizenReport"]] = relationship(
        "CitizenReport",
        foreign_keys="[CitizenReport.user_id]",
        back_populates="reporter",
        cascade="all, delete-orphan",
    )

    refresh_tokens: Mapped[List["RefreshToken"]] = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    # Synonyms / Properties for backward-compatibility with existing modules
    @property
    def phone(self) -> Optional[str]:
        return self.mobile_number

    @phone.setter
    def phone(self, value: Optional[str]) -> None:
        self.mobile_number = value

    @property
    def hashed_password(self) -> str:
        return self.password_hash

    @hashed_password.setter
    def hashed_password(self, value: str) -> None:
        self.password_hash = value

    @property
    def district(self) -> Optional[str]:
        return self.assigned_district

    @district.setter
    def district(self, value: Optional[str]) -> None:
        self.assigned_district = value

    @property
    def state(self) -> Optional[str]:
        return self.assigned_state

    @state.setter
    def state(self, value: Optional[str]) -> None:
        self.assigned_state = value

    def is_locked(self) -> bool:
        """Returns True if the account is currently locked due to failed attempts."""
        if self.locked_until:
            return datetime.now(timezone.utc) < self.locked_until
        return False
