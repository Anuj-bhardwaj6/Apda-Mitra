from typing import List
from geoalchemy2 import Geometry
from sqlalchemy import Boolean, Float, Index, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Shelter(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Designated multi-purpose cyclone shelters, relief camps, trauma centers, and staging bases.
    """
    __tablename__ = "shelters"

    shelter_code: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(32), index=True, nullable=False)  # CYCLONE_SHELTER, RELIEF_CAMP, etc.
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    district: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    state: Mapped[str] = mapped_column(String(64), index=True, nullable=False)

    # Coordinates
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    location_geom = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=True)

    total_capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    current_occupancy: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    contact_person: Mapped[str] = mapped_column(String(128), nullable=False)
    contact_number: Mapped[str] = mapped_column(String(32), nullable=False)
    is_open: Mapped[bool] = mapped_column(Boolean, default=True, index=True, nullable=False)

    # Critical Infrastructure Amenities
    facilities: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    medical_officer_on_duty: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    power_backup: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    drinking_water_litres: Mapped[int] = mapped_column(Integer, default=10000, nullable=False)

    __table_args__ = (
        Index("idx_shelter_spatial", "latitude", "longitude"),
        Index("idx_shelter_district_type", "district", "type"),
    )
