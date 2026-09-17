from enum import Enum
from typing import List, Set


class UserRole(str, Enum):
    """
    Hierarchical Role-Based Access Control (RBAC) definitions for APDA MITRA.
    """
    CITIZEN = "Citizen"
    VOLUNTEER = "Volunteer"
    DISTRICT_OFFICER = "District Officer"
    STATE_OFFICER = "State Officer"
    NDMA_ADMIN = "NDMA Admin"


# Role permission inheritance map: higher roles inherit capabilities of subordinate roles
ROLE_HIERARCHY: dict[UserRole, Set[UserRole]] = {
    UserRole.CITIZEN: {UserRole.CITIZEN},
    UserRole.VOLUNTEER: {UserRole.CITIZEN, UserRole.VOLUNTEER},
    UserRole.DISTRICT_OFFICER: {
        UserRole.CITIZEN,
        UserRole.VOLUNTEER,
        UserRole.DISTRICT_OFFICER,
    },
    UserRole.STATE_OFFICER: {
        UserRole.CITIZEN,
        UserRole.VOLUNTEER,
        UserRole.DISTRICT_OFFICER,
        UserRole.STATE_OFFICER,
    },
    UserRole.NDMA_ADMIN: {
        UserRole.CITIZEN,
        UserRole.VOLUNTEER,
        UserRole.DISTRICT_OFFICER,
        UserRole.STATE_OFFICER,
        UserRole.NDMA_ADMIN,
    },
}


def is_role_authorized(user_role: str, permitted_roles: List[UserRole]) -> bool:
    """
    Determines if user role satisfies any of the required role levels via hierarchy.
    """
    try:
        role_enum = UserRole(user_role)
    except ValueError:
        return False

    effective_roles = ROLE_HIERARCHY.get(role_enum, set())
    return any(p in effective_roles for p in permitted_roles)
