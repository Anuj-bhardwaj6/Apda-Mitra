import json
import logging
import sys
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any, Dict
from app.core.config import settings

# Context variable to correlate log lines across async execution
request_id_context: ContextVar[str] = ContextVar("request_id", default="SYSTEM")


class StructuredJsonFormatter(logging.Formatter):
    """
    Serializes standard log records into structured JSON format
    for production ingestion (ELK, Datadog, CloudWatch).
    """

    def format(self, record: logging.LogRecord) -> str:
        log_obj: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "requestId": request_id_context.get(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_obj)


class StandardFormatter(logging.Formatter):
    """Human-readable formatted log output for local development."""

    def format(self, record: logging.LogRecord) -> str:
        req_id = request_id_context.get()
        time_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        prefix = f"{time_str} [{record.levelname:<7}] [{req_id}] {record.name}:{record.lineno}"
        msg = f"{prefix} - {record.getMessage()}"
        if record.exc_info:
            msg += f"\n{self.formatException(record.exc_info)}"
        return msg


def setup_logging() -> None:
    """Configures application-wide logging handlers and formatters."""
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    # Root Logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Clear existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)

    if settings.ENVIRONMENT == "production":
        console_handler.setFormatter(StructuredJsonFormatter())
    else:
        console_handler.setFormatter(StandardFormatter())

    root_logger.addHandler(console_handler)

    # Silence noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("asyncpg").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)


logger = logging.getLogger("apda_mitra")
