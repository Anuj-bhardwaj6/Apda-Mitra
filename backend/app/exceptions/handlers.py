import logging
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from app.core.logger import request_id_context
from app.exceptions.app_exceptions import AppException

logger = logging.getLogger("apda_mitra.exceptions")


def format_error_response(message: str, status_code: int, data: any = None) -> JSONResponse:
    """Standardizes all application errors to the APDA MITRA envelope format."""
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "message": message,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "requestId": request_id_context.get(),
        },
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Registers all global exception handlers onto the FastAPI application instance."""

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        logger.warning("Domain exception [%d]: %s", exc.status_code, exc.message)
        return format_error_response(exc.message, exc.status_code, exc.data)

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        logger.warning("HTTPException [%d]: %s", exc.status_code, exc.detail)
        return format_error_response(str(exc.detail), exc.status_code)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        # Format Pydantic v2 error list into user-friendly field descriptions
        formatted_errors = []
        for error in exc.errors():
            loc = " -> ".join([str(l) for l in error.get("loc", [])])
            formatted_errors.append({
                "field": loc,
                "issue": error.get("msg"),
                "type": error.get("type"),
            })

        logger.info("Request validation failed on %s: %s", request.url.path, formatted_errors)
        return format_error_response(
            message="Input data validation failed. Check parameters.",
            status_code=422,
            data={"errors": formatted_errors},
        )

    @app.exception_handler(SQLAlchemyError)
    async def database_exception_handler(request: Request, exc: SQLAlchemyError):
        logger.error("Database constraint or query error: %s", str(exc), exc_info=True)
        return format_error_response(
            message="Database transaction failed. Integrity constraints preserved.",
            status_code=500,
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        logger.critical("Uncaught server exception: %s", str(exc), exc_info=True)
        return format_error_response(
            message="An unexpected disaster intelligence system error occurred.",
            status_code=500,
        )
