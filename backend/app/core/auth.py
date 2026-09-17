from typing import Callable, List
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.database import get_db
from app.core.redis import RedisCacheService
from app.core.roles import UserRole, is_role_authorized
from app.core.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False,
)


async def get_current_user_token_payload(
    token: str = Depends(oauth2_scheme),
) -> dict:
    """Extracts and validates JWT token claims and checks Redis blacklist."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please refresh session.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check token revocation in Redis
    jti = payload.get("jti")
    if jti and await RedisCacheService.is_token_blacklisted(jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been revoked or logged out",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type provided for resource authorization",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload


async def get_current_user(
    payload: dict = Depends(get_current_user_token_payload),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves full authenticated User model from database using the token subject.
    Deferred import of UserRepository to avoid circular imports.
    """
    from app.db.repositories.user_repository import UserRepository

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject identity",
        )

    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account no longer exists",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Contact district administration.",
        )

    return user


async def get_optional_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    """Optional user dependency allowing anonymous citizens to report emergencies."""
    if not token:
        return None
    try:
        from app.db.repositories.user_repository import UserRepository
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            return None
        repo = UserRepository(db)
        return await repo.get_by_id(user_id)
    except Exception:
        return None


def require_roles(*allowed_roles: UserRole) -> Callable:
    """
    FastAPI dependency factory enforcing Role-Based Access Control (RBAC).
    Usage: Depends(require_roles(UserRole.DISTRICT_OFFICER, UserRole.NDMA_ADMIN))
    """
    async def role_checker(current_user=Depends(get_current_user)):
        if not is_role_authorized(current_user.role, list(allowed_roles)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action prohibited. Requires one of: {[r.value for r in allowed_roles]}",
            )
        return current_user

    return role_checker

