from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.auth import get_current_user, get_optional_user, get_current_user_token_payload, require_roles
from app.core.database import get_db
from app.core.roles import UserRole
from app.db.repositories.incident_repository import IncidentRepository
from app.db.repositories.report_repository import ReportRepository
from app.db.repositories.shelter_repository import ShelterRepository
from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService
from app.services.otp_service import OtpService
from app.services.token_service import TokenService
from app.services.user_service import UserService


def get_user_repository(db: AsyncSession = Depends(get_db)) -> UserRepository:
    return UserRepository(db)


def get_incident_repository(db: AsyncSession = Depends(get_db)) -> IncidentRepository:
    return IncidentRepository(db)


def get_report_repository(db: AsyncSession = Depends(get_db)) -> ReportRepository:
    return ReportRepository(db)


def get_shelter_repository(db: AsyncSession = Depends(get_db)) -> ShelterRepository:
    return ShelterRepository(db)


def get_token_service(
    user_repo: UserRepository = Depends(get_user_repository),
) -> TokenService:
    session = getattr(user_repo, "session", None)
    return TokenService(session=session, user_repo=user_repo)


def get_otp_service() -> OtpService:
    return OtpService()


def get_auth_service(
    user_repo: UserRepository = Depends(get_user_repository),
    token_service: TokenService = Depends(get_token_service),
    otp_service: OtpService = Depends(get_otp_service),
) -> AuthService:
    session = getattr(user_repo, "session", None)
    return AuthService(
        session=session,
        user_repo=user_repo,
        token_service=token_service,
        otp_service=otp_service,
    )


def get_user_service(
    user_repo: UserRepository = Depends(get_user_repository),
) -> UserService:
    session = getattr(user_repo, "session", None)
    return UserService(session=session, user_repo=user_repo)


__all__ = [
    "get_db",
    "get_current_user",
    "get_current_user_token_payload",
    "require_roles",
    "UserRole",
    "get_user_repository",
    "get_incident_repository",
    "get_report_repository",
    "get_shelter_repository",
    "get_token_service",
    "get_otp_service",
    "get_auth_service",
    "get_user_service",
]
