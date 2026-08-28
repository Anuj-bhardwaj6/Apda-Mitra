from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseHazardModule(ABC):
    """
    Abstract interface for all Apda Mitra Hazard Modules (Landslide, Flood, Cyclone, etc.)
    Ensures unified contract across the entire platform.
    """
    @property
    @abstractmethod
    def hazard_type(self) -> str:
        pass

    @abstractmethod
    async def evaluate(self, lat: float, lon: float, weather_data: Dict[str, Any], location_name: str) -> Dict[str, Any]:
        pass
