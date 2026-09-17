import json
import logging
from typing import Any, Optional
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger("apda_mitra.redis")

# Global async Redis client instance
redis_client: Optional[aioredis.Redis] = None


_fallback_cache: dict[str, Any] = {}


def get_redis_client() -> aioredis.Redis:
    """Returns the shared Redis client or initializes a new connection pool."""
    global redis_client
    if redis_client is None:
        redis_client = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            encoding="utf-8",
            max_connections=50,
            socket_timeout=1,
            socket_connect_timeout=1,
        )
    return redis_client


class RedisCacheService:
    """
    Enterprise Redis caching service managing telemetry, predictions,
    geocodes, authentication sessions, and OTP state with in-memory fallback.
    """

    @classmethod
    async def get(cls, key: str) -> Optional[Any]:
        try:
            client = get_redis_client()
            val = await client.get(key)
            if val is not None:
                return json.loads(val)
        except Exception as err:
            logger.debug("Redis GET fallback for '%s': %s", key, str(err))
            return _fallback_cache.get(key)
        return None

    @classmethod
    async def set(cls, key: str, value: Any, ttl_seconds: int = 300) -> bool:
        _fallback_cache[key] = value
        try:
            client = get_redis_client()
            serialized = json.dumps(value, default=str)
            await client.set(key, serialized, ex=ttl_seconds)
            return True
        except Exception as err:
            logger.debug("Redis SET fallback for '%s': %s", key, str(err))
            return True

    @classmethod
    async def delete(cls, key: str) -> bool:
        _fallback_cache.pop(key, None)
        try:
            client = get_redis_client()
            await client.delete(key)
            return True
        except Exception as err:
            logger.debug("Redis DELETE fallback for '%s': %s", key, str(err))
            return True

    # --- Domain-Specific Helpers ---

    @classmethod
    async def get_weather(cls, lat: float, lon: float) -> Optional[dict]:
        key = f"weather:{round(lat, 2)}:{round(lon, 2)}"
        return await cls.get(key)

    @classmethod
    async def set_weather(cls, lat: float, lon: float, data: dict) -> bool:
        key = f"weather:{round(lat, 2)}:{round(lon, 2)}"
        return await cls.set(key, data, ttl_seconds=settings.WEATHER_CACHE_TTL_SECONDS)

    @classmethod
    async def get_prediction(cls, hazard_type: str, district: str) -> Optional[dict]:
        key = f"prediction:{hazard_type.lower()}:{district.lower()}"
        return await cls.get(key)

    @classmethod
    async def set_prediction(cls, hazard_type: str, district: str, data: dict) -> bool:
        key = f"prediction:{hazard_type.lower()}:{district.lower()}"
        return await cls.set(key, data, ttl_seconds=settings.PREDICTION_CACHE_TTL_SECONDS)

    @classmethod
    async def get_geocode(cls, query: str) -> Optional[list]:
        key = f"geocode:{query.strip().lower()}"
        return await cls.get(key)

    @classmethod
    async def set_geocode(cls, query: str, data: list) -> bool:
        key = f"geocode:{query.strip().lower()}"
        return await cls.set(key, data, ttl_seconds=settings.LOCATION_CACHE_TTL_SECONDS)

    @classmethod
    async def set_otp(cls, phone: str, otp: str) -> bool:
        key = f"otp:{phone.strip()}"
        return await cls.set(key, {"otp": otp, "verified": False}, ttl_seconds=settings.OTP_TTL_SECONDS)

    @classmethod
    async def verify_otp(cls, phone: str, candidate_otp: str) -> bool:
        key = f"otp:{phone.strip()}"
        cached = await cls.get(key)
        if cached and cached.get("otp") == candidate_otp:
            await cls.delete(key)
            return True
        return False

    @classmethod
    async def blacklist_token(cls, jti: str, expire_seconds: int) -> bool:
        key = f"blacklist_token:{jti}"
        return await cls.set(key, {"revoked": True}, ttl_seconds=expire_seconds)

    @classmethod
    async def is_token_blacklisted(cls, jti: str) -> bool:
        key = f"blacklist_token:{jti}"
        return (await cls.get(key)) is not None


async def check_redis_health() -> dict:
    """Verifies Redis ping latency and readiness."""
    try:
        client = get_redis_client()
        pong = await client.ping()
        return {
            "status": "healthy" if pong else "unhealthy",
            "connected": bool(pong),
        }
    except Exception as exc:
        logger.error("Redis health check failed: %s", str(exc))
        return {
            "status": "unhealthy",
            "connected": False,
            "error": str(exc),
        }


async def close_redis() -> None:
    """Closes Redis connections during application teardown."""
    global redis_client
    if redis_client:
        logger.info("Closing Redis connection pool...")
        if hasattr(redis_client, "aclose"):
            await redis_client.aclose()
        else:
            await redis_client.close()
        redis_client = None
        logger.info("Redis connection pool closed.")
