"""Initial APDA MITRA PostGIS Schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-05 18:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import geoalchemy2

revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Enable PostGIS Extension
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis;")

    # 2. Users Table
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, index=True),
        sa.Column("email", sa.String(255), unique=True, index=True, nullable=False),
        sa.Column("phone", sa.String(32), unique=True, index=True, nullable=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(128), nullable=False),
        sa.Column("role", sa.String(32), default="Citizen", index=True, nullable=False),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("is_verified", sa.Boolean(), default=False, nullable=False),
        sa.Column("assigned_district", sa.String(64), nullable=True, index=True),
        sa.Column("assigned_state", sa.String(64), nullable=True, index=True),
        sa.Column("fcm_token", sa.String(512), nullable=True),
        sa.Column("last_latitude", sa.Float(), nullable=True),
        sa.Column("last_longitude", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # 3. Disaster Incidents Table
    op.create_table(
        "disaster_incidents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, index=True),
        sa.Column("bulletin_id", sa.String(64), unique=True, index=True, nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("category", sa.String(32), index=True, nullable=False),
        sa.Column("severity", sa.String(16), index=True, nullable=False),
        sa.Column("alert_level", sa.String(16), index=True, nullable=False),
        sa.Column("issued_by", sa.String(32), nullable=False),
        sa.Column("headline", sa.String(512), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("affected_districts", sa.JSON(), nullable=False),
        sa.Column("state", sa.String(64), index=True, nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("location_geom", geoalchemy2.Geometry(geometry_type="POINT", srid=4326), nullable=True),
        sa.Column("hazard_polygon", geoalchemy2.Geometry(geometry_type="POLYGON", srid=4326), nullable=True),
        sa.Column("radius_km", sa.Float(), nullable=True),
        sa.Column("evacuation_status", sa.String(32), default="NONE", nullable=False),
        sa.Column("safe_corridor_route", sa.String(255), nullable=True),
        sa.Column("recommended_actions", sa.JSON(), nullable=False),
        sa.Column("active_helpline", sa.String(32), default="112", nullable=False),
        sa.Column("is_active", sa.Boolean(), default=True, index=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("idx_incident_spatial", "disaster_incidents", ["latitude", "longitude"])
    op.create_index("idx_incident_category_severity", "disaster_incidents", ["category", "severity"])

    # 4. Citizen Reports Table
    op.create_table(
        "citizen_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, index=True),
        sa.Column("incident_ref", sa.String(32), unique=True, index=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("category", sa.String(32), index=True, nullable=False),
        sa.Column("urgency", sa.String(32), index=True, nullable=False),
        sa.Column("landmark", sa.String(255), nullable=False),
        sa.Column("contact_number", sa.String(32), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("location_geom", geoalchemy2.Geometry(geometry_type="POINT", srid=4326), nullable=True),
        sa.Column("photo_url", sa.String(512), nullable=True),
        sa.Column("status", sa.String(32), default="PENDING_VERIFICATION", index=True, nullable=False),
        sa.Column("verified_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("verification_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("idx_citizen_report_spatial", "citizen_reports", ["latitude", "longitude"])
    op.create_index("idx_citizen_report_urgency_status", "citizen_reports", ["urgency", "status"])

    # 5. Shelters Table
    op.create_table(
        "shelters",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, index=True),
        sa.Column("shelter_code", sa.String(32), unique=True, index=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("type", sa.String(32), index=True, nullable=False),
        sa.Column("address", sa.String(255), nullable=False),
        sa.Column("district", sa.String(64), index=True, nullable=False),
        sa.Column("state", sa.String(64), index=True, nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("location_geom", geoalchemy2.Geometry(geometry_type="POINT", srid=4326), nullable=True),
        sa.Column("total_capacity", sa.Integer(), nullable=False),
        sa.Column("current_occupancy", sa.Integer(), default=0, nullable=False),
        sa.Column("contact_person", sa.String(128), nullable=False),
        sa.Column("contact_number", sa.String(32), nullable=False),
        sa.Column("is_open", sa.Boolean(), default=True, index=True, nullable=False),
        sa.Column("facilities", sa.JSON(), nullable=False),
        sa.Column("medical_officer_on_duty", sa.Boolean(), default=False, nullable=False),
        sa.Column("power_backup", sa.Boolean(), default=True, nullable=False),
        sa.Column("drinking_water_litres", sa.Integer(), default=10000, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("idx_shelter_spatial", "shelters", ["latitude", "longitude"])
    op.create_index("idx_shelter_district_type", "shelters", ["district", "type"])

    # 6. Weather Telemetry Table
    op.create_table(
        "weather_telemetry",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, index=True),
        sa.Column("station_code", sa.String(32), index=True, nullable=False),
        sa.Column("station_name", sa.String(128), nullable=False),
        sa.Column("state", sa.String(64), index=True, nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("temperature_c", sa.Float(), nullable=False),
        sa.Column("feels_like_c", sa.Float(), nullable=False),
        sa.Column("wind_speed_kmh", sa.Float(), nullable=False),
        sa.Column("wind_gust_kmh", sa.Float(), nullable=False),
        sa.Column("wind_direction", sa.String(8), nullable=False),
        sa.Column("precipitation_mm", sa.Float(), nullable=False),
        sa.Column("humidity_percent", sa.Float(), nullable=False),
        sa.Column("aqi_value", sa.Integer(), default=50, nullable=False),
        sa.Column("imd_warning_color", sa.String(16), default="Green", index=True, nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), index=True, nullable=False),
    )

    # 7. Audit Logs Table
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, index=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("action", sa.String(64), index=True, nullable=False),
        sa.Column("resource_type", sa.String(64), nullable=False),
        sa.Column("resource_id", sa.String(64), nullable=True),
        sa.Column("client_ip", sa.String(45), nullable=True),
        sa.Column("details", sa.JSON(), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), index=True, nullable=False),
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("weather_telemetry")
    op.drop_table("shelters")
    op.drop_table("citizen_reports")
    op.drop_table("disaster_incidents")
    op.drop_table("users")
