import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple
from fastapi import HTTPException, status
import jwt
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.redis import RedisCacheService
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.token import TokenResponse, TokenUserSummary


class TokenService:
    """
    Enterprise token lifecycle service managing access & refresh tokens,
    cryptographic hashing, rotation with replay attack detection, and revocation.
    """

    def __init__(
        self,
        session: Optional[AsyncSession] = None,
        user_repo: Optional[UserRepository] = None,
    ):
        self.session = session
        self.user_repo = user_repo if user_repo is not None else (UserRepository(session) if session else None)

    @staticmethod
    def _hash_token(token: str) -> str:
        """Returns SHA-256 digest of token string for secondary storage indexing."""
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    async def issue_token_pair(self, user: User) -> TokenResponse:
        """
        Issues a new short-lived access token (15m) and a 7-day rotating refresh token.
        Stores the refresh token record in PostgreSQL and Redis for dual-layer revocation tracking.
        """
        access_token = create_access_token(
            subject=str(user.id),
            role=user.role,
            extra_claims={"email": user.email},
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        )

        refresh_token, jti, exp_seconds = create_refresh_token(
            subject=str(user.id),
            role=user.role,
            expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )

        token_hash = self._hash_token(refresh_token)
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=exp_seconds)

        # Persist refresh token in database for audit & rotation lineage if repo supports it
        if self.user_repo and hasattr(self.user_repo, "save_refresh_token"):
            try:
                user_id_val = user.id if isinstance(user.id, uuid.UUID) else uuid.UUID(str(user.id))
            except Exception:
                user_id_val = user.id

            await self.user_repo.save_refresh_token(
                user_id=user_id_val,
                jti=jti,
                token_hash=token_hash,
                expires_at=expires_at,
            )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=TokenUserSummary.model_validate(user),
        )

    async def rotate_refresh_token(self, refresh_token_str: str) -> TokenResponse:
        """
        Validates the incoming refresh token and issues a new pair.
        Enforces Refresh Token Rotation (RTR):
        - If a revoked token is presented, treats it as a token theft/replay attack and revokes all user sessions.
        - Blacklists the old token JTI in Redis and marks it revoked in PostgreSQL.
        """
        try:
            payload = decode_token(refresh_token_str)
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has expired. Please log in again.",
            )
        except jwt.PyJWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token signature.",
            )

        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provided token is not a refresh token.",
            )

        jti = payload.get("jti")
        user_id_str = payload.get("sub")

        if not jti or not user_id_str:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Malformed token claims.",
            )

        # 1. Check Redis blacklist for instantaneous revocation lookup
        if await RedisCacheService.is_token_blacklisted(jti):
            if self.user_repo:
                try:
                    user_uuid = uuid.UUID(user_id_str)
                    if hasattr(self.user_repo, "revoke_all_user_refresh_tokens"):
                        await self.user_repo.revoke_all_user_refresh_tokens(user_uuid)
                    if hasattr(self.user_repo, "record_audit_log"):
                        await self.user_repo.record_audit_log(
                            action="TOKEN_REUSE_DETECTED",
                            resource_type="AUTH",
                            user_id=user_uuid,
                            status="CRITICAL",
                            details={"reused_jti": jti},
                        )
                except Exception:
                    pass

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Security alert: Token reuse detected. All sessions have been revoked.",
            )

        # 2. Check Database Record if persistent store available
        if self.user_repo and hasattr(self.user_repo, "get_refresh_token"):
            db_token = await self.user_repo.get_refresh_token(jti)
            if db_token and (db_token.is_revoked or db_token.is_expired()):
                if hasattr(self.user_repo, "revoke_all_user_refresh_tokens"):
                    try:
                        await self.user_repo.revoke_all_user_refresh_tokens(db_token.user_id)
                    except Exception:
                        pass
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Refresh token is revoked, expired, or invalid.",
                )

        # 3. Verify user account state
        user = None
        if self.user_repo:
            user = await self.user_repo.get_by_id(user_id_str)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User associated with token no longer active.",
            )

        if getattr(user, "is_active", True) is False or getattr(user, "is_deleted", False) is True:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is inactive or disabled.",
            )

        # 4. Generate new token pair
        new_access = create_access_token(
            subject=str(user.id),
            role=user.role,
            extra_claims={"email": user.email},
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        )

        new_refresh, new_jti, exp_seconds = create_refresh_token(
            subject=str(user.id),
            role=user.role,
            expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )

        # 5. Revoke old token in DB and record replacement lineage
        if self.user_repo and hasattr(self.user_repo, "revoke_refresh_token"):
            await self.user_repo.revoke_refresh_token(jti, replaced_by=new_jti)

        # 6. Blacklist old JTI in Redis for remaining refresh lifetime
        await RedisCacheService.blacklist_token(
            jti,
            expire_seconds=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        )

        # 7. Save new refresh token in DB
        if self.user_repo and hasattr(self.user_repo, "save_refresh_token"):
            new_token_hash = self._hash_token(new_refresh)
            new_expires_at = datetime.now(timezone.utc) + timedelta(seconds=exp_seconds)
            try:
                user_id_val = user.id if isinstance(user.id, uuid.UUID) else uuid.UUID(str(user.id))
            except Exception:
                user_id_val = user.id

            await self.user_repo.save_refresh_token(
                user_id=user_id_val,
                jti=new_jti,
                token_hash=new_token_hash,
                expires_at=new_expires_at,
            )

        return TokenResponse(
            access_token=new_access,
            refresh_token=new_refresh,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=TokenUserSummary.model_validate(user),
        )

    async def revoke_session(self, jti: Optional[str] = None, user_id: Optional[Any] = None) -> None:
        """Revokes a session by blacklisting the access token JTI and DB refresh token."""
        if jti:
            await RedisCacheService.blacklist_token(
                jti,
                expire_seconds=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
            )
            if self.user_repo and hasattr(self.user_repo, "revoke_refresh_token"):
                await self.user_repo.revoke_refresh_token(jti)

        if user_id and self.user_repo and hasattr(self.user_repo, "revoke_all_user_refresh_tokens"):
            try:
                user_uuid = user_id if isinstance(user_id, uuid.UUID) else uuid.UUID(str(user_id))
                await self.user_repo.revoke_all_user_refresh_tokens(user_uuid)
            except Exception:
                pass
