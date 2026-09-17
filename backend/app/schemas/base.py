from datetime import datetime, timezone
from typing import Generic, List, Optional, TypeVar
from pydantic import BaseModel, ConfigDict, Field
from app.core.logger import request_id_context

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """
    Standard enterprise envelope returned by all APDA MITRA endpoints.
    Guarantees consistent payload parsing across mobile, web, and external GIS consumers.
    """
    model_config = ConfigDict(arbitrary_types_allowed=True)

    success: bool = Field(default=True, description="Indicates call outcome")
    message: str = Field(default="Operation completed successfully.", description="Human-readable status")
    data: Optional[T] = Field(default=None, description="Typed business payload")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="ISO 8601 UTC timestamp",
    )
    requestId: str = Field(
        default_factory=lambda: request_id_context.get(),
        description="Correlation ID for audit tracing",
    )

    @classmethod
    def ok(cls, data: T, message: str = "Success") -> "ApiResponse[T]":
        return cls(success=True, message=message, data=data)

    @classmethod
    def fail(cls, message: str, data: Optional[T] = None) -> "ApiResponse[T]":
        return cls(success=False, message=message, data=data)


class PaginationParams(BaseModel):
    """Query parameter validation for paginated requests."""
    page: int = Field(default=1, ge=1, description="1-indexed page number")
    limit: int = Field(default=20, ge=1, le=100, description="Items per page")

    @property
    def skip(self) -> int:
        return (self.page - 1) * self.limit


class PaginatedData(BaseModel, Generic[T]):
    """Payload container for paginated record sets."""
    items: List[T]
    total: int
    page: int
    limit: int
    total_pages: int
