from typing import List, Optional
from geoalchemy2 import Geometry
from sqlalchemy import Boolean, Float, Index, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class DisasterIncident(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Official disaster bulletins, cyclone corridors, flood stages, and alert perimeters.
    """
    __tablename__ = "disaster_incidents"

    bulletin_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(32), index=True, nullable=False)  # CYCLONE, FLOOD, etc.
    severity: Mapped[str] = mapped_column(String(16), index=True, nullable=False)  # CRITICAL, HIGH, MODERATE, LOW
    alert_level: Mapped[str] = mapped_column(String(16), index=True, nullable=False)  # RED, ORANGE, YELLOW, GREEN
    issued_by: Mapped[str] = mapped_column(String(32), nullable=False)  # NDMA, IMD, CWC, INCOIS, SDMA

    headline: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    affected_districts: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    state: Mapped[str] = mapped_column(String(64), index=True, nullable=False)

    # Standard WGS84 point coordinates
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)

    # PostGIS Spatial Geometries
    location_geom = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=True)
    hazard_polygon = mapped_column(Geometry(geometry_type="POLYGON", srid=4326), nullable=True)

    radius_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    evacuation_status: Mapped[str] = mapped_column(String(32), default="NONE", nullable=False)
    safe_corridor_route: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    recommended_actions: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    active_helpline: Mapped[str] = mapped_column(String(32), default="112", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True, nullable=False)

    __table_args__ = (
        Index("idx_incident_spatial", "latitude", "longitude"),
        Index("idx_incident_category_severity", "category", "severity"),
    )
