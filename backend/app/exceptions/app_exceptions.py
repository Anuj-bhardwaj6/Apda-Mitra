from typing import Any, Optional


class AppException(Exception):
    """Base application exception for APDA MITRA domain errors."""

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        data: Optional[Any] = None,
    ):
        self.message = message
        self.status_code = status_code
        self.data = data
        super().__init__(message)


class NotFoundError(AppException):
    """Raised when a requested database or spatial entity is not found."""

    def __init__(self, resource: str, identifier: Any):
        super().__init__(
            message=f"{resource} identified by '{identifier}' was not found.",
            status_code=404,
        )


class AuthenticationError(AppException):
    """Raised on authentication credentials failure."""

    def __init__(self, message: str = "Invalid credentials or expired session."):
        super().__init__(message=message, status_code=401)


class AuthorizationError(AppException):
    """Raised when user role lacks required jurisdiction or authority."""

    def __init__(self, message: str = "Permission denied for this disaster management operation."):
        super().__init__(message=message, status_code=403)


class ConflictError(AppException):
    """Raised on duplicate unique constraints (email, phone, bulletin code)."""

    def __init__(self, message: str):
        super().__init__(message=message, status_code=409)


class ExternalAPIError(AppException):
    """Raised when external satellite/weather/GIS services fail."""

    def __init__(self, provider: str, detail: str):
        super().__init__(
            message=f"External provider '{provider}' error: {detail}",
            status_code=502,
        )
