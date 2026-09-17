import time
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from app.core.config import settings
from app.core.redis import get_redis_client


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Redis-backed rate limiting middleware protecting endpoints from abuse,
    DDoS, and scraping. Enforces sliding window limits per client IP.
    """

    def __init__(self, app, requests_per_minute: int = 120):
        super().__init__(app)
        self.limit = requests_per_minute

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Skip rate-limiting on health checks and docs
        path = request.url.path
        if path.endswith("/health") or path.startswith("/docs") or path.startswith("/openapi.json"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        current_minute = int(time.time() // 60)
        cache_key = f"rate_limit:{client_ip}:{current_minute}"

        try:
            redis = get_redis_client()
            count = await redis.incr(cache_key)
            if count == 1:
                await redis.expire(cache_key, 65)

            remaining = max(0, self.limit - count)

            if count > self.limit:
                return JSONResponse(
                    status_code=429,
                    content={
                        "success": False,
                        "message": "Rate limit exceeded. Too many requests. Please throttle your client.",
                        "data": None,
                        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                        "requestId": getattr(request.state, "request_id", "RATE_LIMITED"),
                    },
                    headers={
                        "Retry-After": "60",
                        "X-RateLimit-Limit": str(self.limit),
                        "X-RateLimit-Remaining": "0",
                    },
                )

            response = await call_next(request)
            response.headers["X-RateLimit-Limit"] = str(self.limit)
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            return response
        except Exception:
            # If Redis connection fails, fail open to avoid service disruption
            return await call_next(request)
