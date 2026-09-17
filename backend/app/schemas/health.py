from typing import Any, Dict
from pydantic import BaseModel


class HealthCheckResponse(BaseModel):
    status: str
    database: Dict[str, Any]
    redis: Dict[str, Any]
    external_services: Dict[str, Any]
    version: str
    uptime_seconds: float
    environment: str
