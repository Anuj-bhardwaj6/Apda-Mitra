import uuid
from typing import Optional
from geoalchemy2 import Geometry
from sqlalchemy import Float, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class CitizenReport(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Citizen and Aapda Mitra field emergency reports with GPS geocoding and verification triage.
    """
    __tablename__ = "citizen_reports"

    incident_ref: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)

    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    category: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    urgency: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    landmark: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_number: Mapped[str] = mapped_column(String(32), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # Coordinates
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    location_geom = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=True)

    photo_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    status: Mapped[str] = mapped_column(
        String(32),
        default="PENDING_VERIFICATION",
        index=True,
        nullable=False,
    )

    # Verification Officer Tracking
    verified_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    verification_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    reporter: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[user_id],
        back_populates="reports",
    )

    __table_args__ = (
        Index("idx_citizen_report_spatial", "latitude", "longitude"),
        Index("idx_citizen_report_urgency_status", "urgency", "status"),
    )
