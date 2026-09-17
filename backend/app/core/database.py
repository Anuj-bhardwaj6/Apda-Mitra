import logging
from typing import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from app.core.config import settings

logger = logging.getLogger("apda_mitra.database")

# --- Async Database Engine with Enterprise Connection Pooling ---
engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_recycle=settings.DB_POOL_RECYCLE,
    pool_pre_ping=True,  # Automatic connection liveness validation
)

# --- Thread-Safe Async Session Factory ---
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency yielding an async database session with automatic
    rollback on uncaught exceptions and guaranteed session closure.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            try:
                await session.commit()
            except Exception:
                pass
        except Exception as ex:
            try:
                await session.rollback()
            except Exception:
                pass
            logger.warning("Database transaction warning: %s", str(ex))
            raise
        finally:
            try:
                await session.close()
            except Exception:
                pass



async def check_database_health() -> dict:
    """
    Validates database connectivity and PostGIS spatial extension availability.
    """
    try:
        async with AsyncSessionLocal() as session:
            # Check basic query connectivity
            result = await session.execute(text("SELECT 1;"))
            ping = result.scalar() == 1

            # Check PostGIS extension
            postgis_res = await session.execute(text("SELECT PostGIS_Version();"))
            postgis_version = postgis_res.scalar()

            return {
                "status": "healthy" if ping else "unhealthy",
                "connected": ping,
                "postgis_installed": bool(postgis_version),
                "postgis_version": str(postgis_version) if postgis_version else "not_installed",
            }
    except Exception as exc:
        logger.error("Database health check probe failed: %s", str(exc))
        return {
            "status": "unhealthy",
            "connected": False,
            "error": str(exc),
        }


async def close_db_connections() -> None:
    """Gracefully terminates connection pool upon application shutdown."""
    logger.info("Terminating database connection pool...")
    await engine.dispose()
    logger.info("Database connection pool closed.")
