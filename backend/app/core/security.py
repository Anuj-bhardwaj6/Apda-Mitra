import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Union
import jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
pw_context = pwd_context  # backward compatibility alias

SPECIAL_CHARS_PATTERN = r"[!@#$%^&*(),.?\":{}|<>_\-+=\[\]\\/`~]"


def validate_password_strength(password: str) -> None:
    """
    Enforces enterprise-grade password complexity:
    - Minimum 8 characters
    - At least one uppercase letter (A-Z)
    - At least one lowercase letter (a-z)
    - At least one decimal digit (0-9)
    - At least one special character (!@#$%^&*...)
    Raises ValueError with descriptive policy reason if check fails.
    """
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long.")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain at least one lowercase letter.")
    if not re.search(r"\d", password):
        raise ValueError("Password must contain at least one numeric digit.")
    if not re.search(SPECIAL_CHARS_PATTERN, password):
        raise ValueError("Password must contain at least one special character (!@#$%^&* etc.).")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies candidate plaintext password against BCrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generates a salted BCrypt hash from plaintext password."""
    return pwd_context.hash(password)


def _get_jwt_secret() -> str:
    return getattr(settings, "JWT_SECRET", getattr(settings, "SECRET_KEY", "apda-mitra-secret-key-2026"))


def create_access_token(
    subject: Union[str, Any],
    role: str = "citizen",
    extra_claims: Optional[Dict[str, Any]] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Creates a signed cryptographically-secure JWT access token with JTI.
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=getattr(settings, "ACCESS_TOKEN_EXPIRE_MINUTES", 60 * 24 * 7))

    jti = str(uuid.uuid4())
    to_encode: Dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "jti": jti,
        "type": "access",
    }

    if extra_claims:
        to_encode.update(extra_claims)

    secret = _get_jwt_secret()
    algorithm = getattr(settings, "ALGORITHM", "HS256")
    encoded_jwt = jwt.encode(to_encode, secret, algorithm=algorithm)
    return encoded_jwt


def create_refresh_token(
    subject: Union[str, Any],
    role: str = "citizen",
    expires_delta: Optional[timedelta] = None,
) -> tuple[str, str, int]:
    """
    Creates a rotating JWT refresh token with unique JTI.
    Returns: (token_string, jti, expire_seconds)
    """
    refresh_days = getattr(settings, "REFRESH_TOKEN_EXPIRE_DAYS", 7)
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
        expire_seconds = int(expires_delta.total_seconds())
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=refresh_days)
        expire_seconds = refresh_days * 86400

    jti = str(uuid.uuid4())
    to_encode: Dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "jti": jti,
        "type": "refresh",
    }

    secret = _get_jwt_secret()
    algorithm = getattr(settings, "ALGORITHM", "HS256")
    encoded_jwt = jwt.encode(to_encode, secret, algorithm=algorithm)
    return encoded_jwt, jti, expire_seconds


def decode_token(token: str) -> Dict[str, Any]:
    """
    Decodes and validates signature and expiration of JWT token.
    Raises jwt.PyJWTError on invalid or expired token.
    """
    secret = _get_jwt_secret()
    algorithm = getattr(settings, "ALGORITHM", "HS256")
    return jwt.decode(
        token,
        secret,
        algorithms=[algorithm],
        options={"require": ["sub", "exp"]},
    )


def decode_access_token(token: str) -> Optional[dict]:
    """Decodes JWT access token safely, returning payload or None on error."""
    try:
        secret = _get_jwt_secret()
        algorithm = getattr(settings, "ALGORITHM", "HS256")
        payload = jwt.decode(token, secret, algorithms=[algorithm])
        return payload
    except jwt.PyJWTError:
        return None
