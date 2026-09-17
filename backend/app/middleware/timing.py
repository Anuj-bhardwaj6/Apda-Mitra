import time
import logging
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("apda_mitra.access")


class TimingMiddleware(BaseHTTPMiddleware):
    """
    Measures endpoint execution latency and appends X-Process-Time header in milliseconds.
    Logs HTTP access records with duration.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        start_time = time.perf_counter()
        response = await call_next(request)
        process_time = (time.perf_counter() - start_time) * 1000  # in ms

        response.headers["X-Process-Time"] = f"{process_time:.2f}ms"

        # Log access event if not health check spam
        if not request.url.path.endswith("/health"):
            logger.info(
                "%s %s - %d - %.2fms",
                request.method,
                request.url.path,
                response.status_code,
                process_time,
            )

        return response
