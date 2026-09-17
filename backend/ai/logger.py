"""
APDA MITRA — AI Pipeline Structured Logger
Provides structured JSON logging with context binding for the entire AI subsystem.
Compatible with both local development and production log aggregators (ELK, CloudWatch).
"""

from __future__ import annotations

import logging
import sys
from typing import Any

# Use standard logging (structlog as optional enhancement)
_LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
_DATE_FORMAT = "%Y-%m-%dT%H:%M:%S"


def get_logger(name: str) -> logging.Logger:
    """
    Returns a named logger pre-configured for the AI subsystem.

    Usage:
        from ai.logger import get_logger
        log = get_logger(__name__)
        log.info("Training started", extra={"n_samples": 5000})
    """
    logger = logging.getLogger(f"apda_mitra.ai.{name}")

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(
            logging.Formatter(fmt=_LOG_FORMAT, datefmt=_DATE_FORMAT)
        )
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        logger.propagate = False

    return logger


class PipelineLogger:
    """
    Context-aware pipeline logger that prefixes log lines with pipeline stage name.
    Enables clean, structured log output across long-running ML pipelines.
    """

    def __init__(self, stage: str) -> None:
        self._log = get_logger(stage)
        self._stage = stage

    def _fmt(self, msg: str, **ctx: Any) -> str:
        if ctx:
            ctx_str = " | ".join(f"{k}={v}" for k, v in ctx.items())
            return f"[{self._stage}] {msg} | {ctx_str}"
        return f"[{self._stage}] {msg}"

    def info(self, msg: str, **ctx: Any) -> None:
        self._log.info(self._fmt(msg, **ctx))

    def warning(self, msg: str, **ctx: Any) -> None:
        self._log.warning(self._fmt(msg, **ctx))

    def error(self, msg: str, **ctx: Any) -> None:
        self._log.error(self._fmt(msg, **ctx))

    def debug(self, msg: str, **ctx: Any) -> None:
        self._log.debug(self._fmt(msg, **ctx))

    def critical(self, msg: str, **ctx: Any) -> None:
        self._log.critical(self._fmt(msg, **ctx))
