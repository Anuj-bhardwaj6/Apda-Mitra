"""
APDA MITRA — Multi-Tier Telemetry Cache Service (Redis + SQLite Fallback)
========================================================================
Supports Redis for high-speed in-memory caching with graceful, seamless
fallback to local persistent SQLite if Redis is offline or unreachable.

TTLs per source:
- NASA GPM IMERG Rainfall: 10 minutes (600s)
- NASA LHASA Hazard: 30 minutes (1800s)
- NASA COOLR Landslides: 30 minutes (1800s)
- NASA SMAP Soil Moisture: 6 hours (21600s)
- Copernicus DEM Terrain: 30 days (2592000s)
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
import sqlite3
import time
from typing import Any, Optional

logger = logging.getLogger("apda_mitra.cache_service")

# TTL Constants (seconds)
TTL_RAINFALL = 600       # 10 minutes
TTL_LHASA = 1800         # 30 minutes
TTL_COOLR = 1800         # 30 minutes
TTL_SOIL_MOISTURE = 21600 # 6 hours
TTL_TERRAIN = 2592000    # 30 days

CACHE_DIR = Path(__file__).resolve().parents[3] / "ml" / "data" / "cache"
CACHE_DB_PATH = CACHE_DIR / "telemetry_cache.sqlite"


class TelemetryCacheService:
    def __init__(self, redis_url: str = "redis://localhost:6379/0"):
        self.redis_client = None
        self._init_redis(redis_url)
        self._init_sqlite()

    def _init_redis(self, redis_url: str) -> None:
        try:
            import redis
            client = redis.Redis.from_url(redis_url, socket_timeout=0.8, socket_connect_timeout=0.8)
            client.ping()
            self.redis_client = client
            logger.info("Connected to Redis cache at %s", redis_url)
        except Exception as e:
            logger.info("Redis cache not available (%s); utilizing persistent SQLite cache.", e)
            self.redis_client = None

    def _init_sqlite(self) -> None:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(str(CACHE_DB_PATH), timeout=15.0) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS telemetry_kv_cache (
                    cache_key TEXT PRIMARY KEY,
                    data_json TEXT NOT NULL,
                    expires_at REAL NOT NULL,
                    created_at REAL NOT NULL,
                    source_tag TEXT NOT NULL
                );
                """
            )
            conn.execute("CREATE INDEX IF NOT EXISTS idx_expires ON telemetry_kv_cache(expires_at);")
            conn.commit()

    def get(self, key: str) -> Optional[dict]:
        # 1. Try Redis
        if self.redis_client:
            try:
                raw = self.redis_client.get(key)
                if raw:
                    return json.loads(raw)
            except Exception as e:
                logger.debug("Redis get error for %s: %s", key, e)

        # 2. Fallback to SQLite
        try:
            now = time.time()
            with sqlite3.connect(str(CACHE_DB_PATH), timeout=10.0) as conn:
                cur = conn.cursor()
                cur.execute(
                    "SELECT data_json, expires_at FROM telemetry_kv_cache WHERE cache_key = ?",
                    (key,)
                )
                row = cur.fetchone()
                if row:
                    data_json, expires_at = row
                    if expires_at > now:
                        return json.loads(data_json)
                    else:
                        # Expired, clean up
                        cur.execute("DELETE FROM telemetry_kv_cache WHERE cache_key = ?", (key,))
                        conn.commit()
        except Exception as e:
            logger.warning("SQLite get error for %s: %s", key, e)

        return None

    def set(self, key: str, value: Any, ttl_seconds: int, source_tag: str = "generic") -> None:
        data_str = json.dumps(value)
        now = time.time()
        expires_at = now + ttl_seconds

        # 1. Try Redis
        if self.redis_client:
            try:
                self.redis_client.setex(key, ttl_seconds, data_str)
            except Exception as e:
                logger.debug("Redis set error for %s: %s", key, e)

        # 2. Persist in SQLite
        try:
            with sqlite3.connect(str(CACHE_DB_PATH), timeout=10.0) as conn:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO telemetry_kv_cache
                    (cache_key, data_json, expires_at, created_at, source_tag)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (key, data_str, expires_at, now, source_tag)
                )
                conn.commit()
        except Exception as e:
            logger.warning("SQLite set error for %s: %s", key, e)


# Global singleton
cache_service = TelemetryCacheService()
