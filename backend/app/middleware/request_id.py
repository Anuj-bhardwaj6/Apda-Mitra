import uuid
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response
from app.core.logger import request_id_context


class RequestIdMiddleware(BaseHTTPMiddleware):
    """
    Ensures every inbound request has a unique correlation ID (X-Request-ID).
    Binds the ID to async contextvars for structured log tagging.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        req_id = request.headers.get("X-Request-ID") or f"REQ-{uuid.uuid4().hex[:12].upper()}"
        token = request_id_context.set(req_id)

        try:
            # Store on request.state for convenient access inside route handlers
            request.state.request_id = req_id
            response = await call_next(request)
            response.headers["X-Request-ID"] = req_id
            return response
        finally:
            request_id_context.reset(token)
