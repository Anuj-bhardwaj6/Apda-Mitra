import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class CitizenReportCreate(BaseModel):
    category: str = Field(..., description="E.g. URBAN_WATERLOGGING, FLOOD, LANDSLIDE")
    urgency: str = Field(..., description="LIFE_THREATENING, URGENT_ASSISTANCE, PROPERTY_HAZARD, INFORMATION_ONLY")
    landmark: str = Field(..., min_length=2, max_length=255)
    contact_number: str = Field(..., min_length=10, max_length=15)
    description: str = Field(..., min_length=5)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    photo_url: Optional[str] = None


class CitizenReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    incident_ref: str
    user_id: Optional[uuid.UUID] = None
    category: str
    urgency: str
    landmark: str
    contact_number: str
    description: str
    latitude: float
    longitude: float
    photo_url: Optional[str] = None
    status: str
    verified_by_id: Optional[uuid.UUID] = None
    verification_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ReportVerificationRequest(BaseModel):
    status: str = Field(..., pattern="^(VERIFIED|REJECTED|DISPATCHED)$")
    verification_notes: Optional[str] = None
