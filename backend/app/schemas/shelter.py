import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ShelterBase(BaseModel):
    shelter_code: str
    name: str
    type: str  # CYCLONE_SHELTER, RELIEF_CAMP, DISTRICT_HOSPITAL, NDRF_BASE
    address: str
    district: str
    state: str
    latitude: float
    longitude: float
    total_capacity: int = Field(gt=0)
    current_occupancy: int = Field(default=0, ge=0)
    contact_person: str
    contact_number: str
    is_open: bool = True
    facilities: List[str] = Field(default_factory=list)
    medical_officer_on_duty: bool = False
    power_backup: bool = True
    drinking_water_litres: int = Field(default=10000, ge=0)


class ShelterCreate(ShelterBase):
    pass


class ShelterRead(ShelterBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class NearbyShelterResponse(BaseModel):
    shelter: ShelterRead
    distance_km: float


class ShelterOccupancyUpdate(BaseModel):
    current_occupancy: int = Field(ge=0)
    is_open: Optional[bool] = None
    drinking_water_litres: Optional[int] = None
