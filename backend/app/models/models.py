from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    role = Column(String, default="citizen") # citizen, tourist, field_officer, district_officer, state_officer, super_admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)

    saved_places = relationship("SavedPlace", back_populates="owner", cascade="all, delete-orphan")
    reports = relationship("CitizenReport", back_populates="reporter")

class SavedPlace(Base):
    __tablename__ = "saved_places"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False) # e.g. "Home", "Parents' House", "School", "Office", "Farm"
    place_type = Column(String, default="home")
    address = Column(String, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    last_risk_level = Column(String, default="Low")
    last_risk_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    owner = relationship("User", back_populates="saved_places")

class HazardRiskLog(Base):
    __tablename__ = "hazard_risk_logs"

    id = Column(Integer, primary_key=True, index=True)
    hazard_type = Column(String, default="landslide")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_name = Column(String, nullable=True)
    risk_score = Column(Float, nullable=False) # 0-100
    risk_level = Column(String, nullable=False) # Low, Moderate, High, Severe
    confidence = Column(Float, nullable=False) # e.g. 0.91
    xai_reasons = Column(JSON, nullable=False) # list of string reasons
    recommendations = Column(JSON, nullable=False) # list of string recommendations
    timeline = Column(JSON, nullable=False) # forecast dict
    created_at = Column(DateTime, default=utc_now)

class CitizenReport(Base):
    __tablename__ = "citizen_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reporter_name = Column(String, default="Anonymous Citizen")
    category = Column(String, nullable=False) # Landslide, Rockfall, Tree Fall, Road Block, Flood, Other
    description = Column(Text, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_name = Column(String, nullable=True)
    photo_url = Column(String, nullable=True)
    status = Column(String, default="Pending") # Pending, Verified, Resolved, Dismissed
    created_at = Column(DateTime, default=utc_now)

    reporter = relationship("User", back_populates="reports")

class ShelterResource(Base):
    __tablename__ = "shelter_resources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    facility_type = Column(String, nullable=False) # Shelter, Hospital, Control Room, NDRF Base
    address = Column(String, nullable=False)
    district = Column(String, nullable=False)
    state = Column(String, default="India")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    capacity = Column(Integer, default=500)
    current_occupancy = Column(Integer, default=0)
    contact_phone = Column(String, nullable=True)
    is_operational = Column(Boolean, default=True)

class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"

    id = Column(Integer, primary_key=True, index=True)
    service_name = Column(String, nullable=False)
    category = Column(String, nullable=False) # Police, Fire, Ambulance, NDRF, Helpline, EOC
    phone = Column(String, nullable=False)
    description = Column(String, nullable=True)
    sort_order = Column(Integer, default=0)

class AlertAdvisory(Base):
    __tablename__ = "alert_advisories"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    district = Column(String, nullable=False)
    hazard_type = Column(String, default="landslide")
    severity = Column(String, nullable=False) # Red Alert, Amber Watch, Yellow Advisory
    summary = Column(Text, nullable=False)
    action_guidance = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    issued_at = Column(DateTime, default=utc_now)
