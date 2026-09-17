import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class IncidentBase(BaseModel):
    bulletin_id: str
    title: str
    category: str
    severity: str
    alert_level: str
    issued_by: str
    headline: str
    description: str
    affected_districts: List[str]
    state: str
    latitude: float
    longitude: float
    radius_km: Optional[float] = None
    evacuation_status: str = "NONE"
    safe_corridor_route: Optional[str] = None
    recommended_actions: List[str] = Field(default_factory=list)
    active_helpline: str = "112"


class IncidentCreate(IncidentBase):
    pass


class DisasterIncidentRead(IncidentBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime


class IncidentFilter(BaseModel):
    category: Optional[str] = None
    severity: Optional[str] = None
    alert_level: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
