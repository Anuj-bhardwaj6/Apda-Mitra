import uuid
from datetime import datetime, timedelta, timezone
import pytest
from app.api.deps import get_current_user, get_user_repository
from app.core.config import settings
from app.core.roles import UserRole
from app.main import app
from app.models.refresh_token import RefreshToken
from app.models.user import User


class FullMockUserRepository:
    """Comprehensive hermetic in-memory repository for full Auth & IAM verification."""

    def __init__(self):
        self.users: dict[str, User] = {}
        self.refresh_tokens: dict[str, RefreshToken] = {}
        self.audit_logs: list[dict] = []

    async def get_by_id(self, user_id, include_deleted: bool = False):
        uid_str = str(user_id)
        user = self.users.get(uid_str)
        if user and not include_deleted and getattr(user, "is_deleted", False):
            return None
        return user

    async def get_by_email(self, email: str, include_deleted: bool = False):
        if not email:
            return None
        clean = email.strip().lower()
        for u in self.users.values():
            if u.email.lower() == clean:
                if not include_deleted and getattr(u, "is_deleted", False):
                    return None
                return u
        return None

    async def get_by_mobile(self, mobile: str, include_deleted: bool = False):
        if not mobile:
            return None
        clean = mobile.strip()
        for u in self.users.values():
            if getattr(u, "mobile_number", None) == clean or getattr(u, "phone", None) == clean:
                if not include_deleted and getattr(u, "is_deleted", False):
                    return None
                return u
        return None

    async def get_by_phone(self, phone: str, include_deleted: bool = False):
        return await self.get_by_mobile(phone, include_deleted=include_deleted)

    async def get_by_identifier(self, identifier: str, include_deleted: bool = False):
        user = await self.get_by_email(identifier, include_deleted=include_deleted)
        if not user:
            user = await self.get_by_mobile(identifier, include_deleted=include_deleted)
        return user

    async def create(self, **kwargs):
        user = User()
        for k, v in kwargs.items():
            setattr(user, k, v)
        if not getattr(user, "id", None):
            user.id = uuid.uuid4()
        user.created_at = datetime.now(timezone.utc)
        user.updated_at = datetime.now(timezone.utc)
        if not hasattr(user, "failed_login_attempts"):
            user.failed_login_attempts = 0
        if not hasattr(user, "locked_until"):
            user.locked_until = None
        self.users[str(user.id)] = user
        return user

    async def update(self, user: User, **kwargs):
        for k, v in kwargs.items():
            if hasattr(user, k) and v is not None:
                setattr(user, k, v)
        user.updated_at = datetime.now(timezone.utc)
        self.users[str(user.id)] = user
        return user

    async def soft_delete(self, user_id):
        user = await self.get_by_id(user_id)
        if user:
            user.is_deleted = True
            user.is_active = False
            return True
        return False

    async def increment_failed_attempts(self, user: User):
        user.failed_login_attempts = getattr(user, "failed_login_attempts", 0) + 1
        if user.failed_login_attempts >= settings.MAX_FAILED_LOGIN_ATTEMPTS:
            user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCOUNT_LOCKOUT_MINUTES)
        return user.failed_login_attempts

    async def reset_failed_attempts(self, user: User):
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login_at = datetime.now(timezone.utc)

    async def save_refresh_token(self, user_id, jti: str, token_hash: str, expires_at: datetime):
        token = RefreshToken()
        token.id = uuid.uuid4()
        token.user_id = user_id if isinstance(user_id, uuid.UUID) else uuid.UUID(str(user_id))
        token.jti = jti
        token.token_hash = token_hash
        token.expires_at = expires_at
        token.is_revoked = False
        token.revoked_at = None
        token.replaced_by = None
        self.refresh_tokens[jti] = token
        return token

    async def get_refresh_token(self, jti: str):
        return self.refresh_tokens.get(jti)

    async def revoke_refresh_token(self, jti: str, replaced_by: str = None):
        tok = self.refresh_tokens.get(jti)
        if tok:
            tok.is_revoked = True
            tok.revoked_at = datetime.now(timezone.utc)
            tok.replaced_by = replaced_by
            return True
        return False

    async def revoke_all_user_refresh_tokens(self, user_id):
        uid_val = user_id if isinstance(user_id, uuid.UUID) else uuid.UUID(str(user_id))
        count = 0
        for tok in self.refresh_tokens.values():
            if tok.user_id == uid_val and not tok.is_revoked:
                tok.is_revoked = True
                tok.revoked_at = datetime.now(timezone.utc)
                count += 1
        return count

    async def record_audit_log(self, action: str, resource_type: str, user_id=None, **kwargs):
        self.audit_logs.append({
            "action": action,
            "resource_type": resource_type,
            "user_id": str(user_id) if user_id else None,
            "timestamp": datetime.now(timezone.utc),
            "details": kwargs.get("details", {}),
        })

    async def get_by_role_and_district(self, role: str, district: str):
        matches = []
        for u in self.users.values():
            if getattr(u, "is_deleted", False):
                continue
            if u.role == role and getattr(u, "assigned_district", None) == district:
                matches.append(u)
        return matches

    async def update_telemetry_coordinates(self, user_id, latitude: float, longitude: float):
        user = await self.get_by_id(user_id)
        if user:
            user.last_latitude = latitude
            user.last_longitude = longitude
        return user


@pytest.fixture
def auth_test_context(client):
    repo = FullMockUserRepository()
    app.dependency_overrides[get_user_repository] = lambda: repo
    yield client, repo
    app.dependency_overrides.clear()


# ==========================================
# 1. Password Strength Validation Tests
# ==========================================

def test_password_strength_enforcement(auth_test_context):
    client, _ = auth_test_context

    weak_passwords = [
        ("short1!", "at least 8 characters"),
        ("nouppercase123!", "uppercase letter"),
        ("NOLOWERCASE123!", "lowercase letter"),
        ("NoNumbersHere!", "numeric digit"),
        ("NoSpecialChar123", "special character"),
    ]

    for weak_pw, expected_reason in weak_passwords:
        res = client.post(
            "/api/v1/auth/register",
            json={
                "email": f"test_{uuid.uuid4().hex[:6]}@apdamitra.gov.in",
                "password": weak_pw,
                "full_name": "Test Citizen",
                "role": "Citizen",
            },
        )
        assert res.status_code == 422, f"Expected 422 for password: {weak_pw}"
        errors = res.text
        assert expected_reason in errors, f"Expected '{expected_reason}' in validation error: {errors}"


# ==========================================
# 2. Registration & Dual-Identifier Login Tests
# ==========================================

def test_registration_and_dual_identifier_login(auth_test_context):
    client, repo = auth_test_context
    email = "officer.sharma@apdamitra.gov.in"
    mobile = "+919876500001"
    password = "SecurePassword#2026"

    # Register
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "mobile_number": mobile,
            "password": password,
            "full_name": "Vikram Sharma",
            "role": "District Officer",
            "assigned_district": "Cuttack",
            "assigned_state": "Odisha",
        },
    )
    assert reg_res.status_code == 201
    body = reg_res.json()
    assert body["success"] is True
    assert "access_token" in body["data"]
    assert "refresh_token" in body["data"]
    assert body["data"]["expires_in"] == 900  # 15 minutes = 900 seconds
    assert body["data"]["user"]["role"] == "District Officer"

    # Verify Audit log was recorded
    assert any(log["action"] == "USER_REGISTERED" for log in repo.audit_logs)

    # Login via Email
    login_email_res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_email_res.status_code == 200
    assert login_email_res.json()["data"]["user"]["email"] == email

    # Login via Mobile Number
    login_mobile_res = client.post(
        "/api/v1/auth/login",
        json={"mobile_number": mobile, "password": password},
    )
    assert login_mobile_res.status_code == 200
    assert login_mobile_res.json()["data"]["user"]["email"] == email

    # Login via Username (providing mobile)
    login_username_res = client.post(
        "/api/v1/auth/login",
        json={"username": mobile, "password": password},
    )
    assert login_username_res.status_code == 200


# ==========================================
# 3. Brute Force Protection & Lockout Tests
# ==========================================

def test_account_lockout_after_failed_logins(auth_test_context):
    client, repo = auth_test_context
    email = "victim@apdamitra.gov.in"
    correct_password = "CorrectPass#2026"
    wrong_password = "WrongPassword#1"

    # Register user
    client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": correct_password,
            "full_name": "Target Account",
            "role": "Citizen",
        },
    )

    # 4 Failed Login Attempts (should not lock yet)
    for attempt in range(1, 5):
        fail_res = client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": wrong_password},
        )
        assert fail_res.status_code == 401

    # 5th Failed Login Attempt (triggers account lockout)
    lock_res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": wrong_password},
    )
    assert lock_res.status_code == 423
    lock_msg = lock_res.json().get("message") or lock_res.json().get("detail") or ""
    assert "locked" in lock_msg.lower()

    # Even with the CORRECT password, account is locked
    subsequent_res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": correct_password},
    )
    assert subsequent_res.status_code == 423
    sub_msg = subsequent_res.json().get("message") or subsequent_res.json().get("detail") or ""
    assert "locked" in sub_msg.lower()


# ==========================================
# 4. Refresh Token Rotation & Replay Attack Defense
# ==========================================

def test_refresh_token_rotation_and_reuse_detection(auth_test_context):
    client, repo = auth_test_context
    email = "rotator@apdamitra.gov.in"
    password = "RotatingSecret#2026"

    # Register
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "full_name": "Rotator User",
            "role": "Citizen",
        },
    )
    refresh_token_1 = reg_res.json()["data"]["refresh_token"]

    # 1. Rotate token pair
    rot_res = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token_1})
    assert rot_res.status_code == 200
    refresh_token_2 = rot_res.json()["data"]["refresh_token"]
    assert refresh_token_2 != refresh_token_1

    # 2. Attempt to reuse old token (refresh_token_1) - Replay attack detection
    reuse_res = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token_1})
    assert reuse_res.status_code == 401
    reuse_msg = reuse_res.json().get("message") or reuse_res.json().get("detail") or ""
    assert "revoked" in reuse_msg.lower() or "reuse" in reuse_msg.lower() or "invalid" in reuse_msg.lower()


# ==========================================
# 5. Logout & Session Invalidation Tests
# ==========================================

def test_logout_session_invalidation(auth_test_context):
    client, repo = auth_test_context
    email = "logout_test@apdamitra.gov.in"
    password = "LogoutPass#2026"

    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "full_name": "Logout User",
            "role": "Citizen",
        },
    )
    access_token = reg_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    # Override get_current_user to return this registered user
    user = list(repo.users.values())[0]
    app.dependency_overrides[get_current_user] = lambda: user

    # Logout
    logout_res = client.post("/api/v1/auth/logout", headers=headers)
    assert logout_res.status_code == 200
    assert logout_res.json()["success"] is True

    # Audit log verification
    assert any(log["action"] == "LOGOUT" for log in repo.audit_logs)


# ==========================================
# 6. User Profile & Password Change Tests
# ==========================================

def test_user_profile_and_password_change(auth_test_context):
    client, repo = auth_test_context
    email = "profile_user@apdamitra.gov.in"
    old_password = "OldPassword#2026"
    new_password = "NewComplexPass#2026"

    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": old_password,
            "full_name": "Profile User",
            "role": "Citizen",
        },
    )
    user = list(repo.users.values())[0]
    access_token = reg_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    app.dependency_overrides[get_current_user] = lambda: user

    # 1. Get Profile
    prof_res = client.get("/api/v1/users/me", headers=headers)
    assert prof_res.status_code == 200
    assert prof_res.json()["data"]["email"] == email

    # 2. Update Profile
    update_res = client.put(
        "/api/v1/users/me",
        headers=headers,
        json={"full_name": "Updated Profile User", "assigned_district": "Khurda"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["data"]["full_name"] == "Updated Profile User"

    # 3. Change Password
    pw_res = client.put(
        "/api/v1/users/change-password",
        headers=headers,
        json={"current_password": old_password, "new_password": new_password},
    )
    assert pw_res.status_code == 200

    # 4. Attempt login with old password (must fail)
    old_login = client.post("/api/v1/auth/login", json={"email": email, "password": old_password})
    assert old_login.status_code == 401

    # 5. Attempt login with new password (must succeed)
    new_login = client.post("/api/v1/auth/login", json={"email": email, "password": new_password})
    assert new_login.status_code == 200


# ==========================================
# 7. Role-Based Access Control (RBAC) Tests
# ==========================================

def test_rbac_authorization_hierarchy(auth_test_context):
    client, repo = auth_test_context

    # Create Citizen
    citizen = User(
        email="citizen@apdamitra.gov.in",
        full_name="Regular Citizen",
        role=UserRole.CITIZEN.value,
        password_hash="fake",
        is_active=True,
    )
    citizen.id = uuid.uuid4()
    citizen.created_at = datetime.now(timezone.utc)
    citizen.updated_at = datetime.now(timezone.utc)
    repo.users[str(citizen.id)] = citizen

    # Create District Officer
    officer = User(
        email="officer@apdamitra.gov.in",
        full_name="District Officer",
        role=UserRole.DISTRICT_OFFICER.value,
        password_hash="fake",
        assigned_district="Puri",
        is_active=True,
    )
    officer.id = uuid.uuid4()
    officer.created_at = datetime.now(timezone.utc)
    officer.updated_at = datetime.now(timezone.utc)
    repo.users[str(officer.id)] = officer

    # Create NDMA Admin
    admin = User(
        email="admin@apdamitra.gov.in",
        full_name="NDMA Super Admin",
        role=UserRole.NDMA_ADMIN.value,
        password_hash="fake",
        is_active=True,
    )
    admin.id = uuid.uuid4()
    admin.created_at = datetime.now(timezone.utc)
    admin.updated_at = datetime.now(timezone.utc)
    repo.users[str(admin.id)] = admin

    # 1. Citizen tries to view Officer Roster -> HTTP 403 Forbidden
    app.dependency_overrides[get_current_user] = lambda: citizen
    roster_res = client.get("/api/v1/users/list?district=Puri")
    assert roster_res.status_code == 403

    # 2. District Officer views Officer Roster -> HTTP 200 OK
    app.dependency_overrides[get_current_user] = lambda: officer
    roster_res_officer = client.get("/api/v1/users/list?district=Puri")
    assert roster_res_officer.status_code == 200

    # 3. Officer tries to promote a user to Admin -> HTTP 403 Forbidden (requires NDMA Admin)
    promote_res_officer = client.put(
        f"/api/v1/users/{citizen.id}/role",
        json={"role": "District Officer"},
    )
    assert promote_res_officer.status_code == 403

    # 4. NDMA Admin promotes user -> HTTP 200 OK
    app.dependency_overrides[get_current_user] = lambda: admin
    promote_res_admin = client.put(
        f"/api/v1/users/{citizen.id}/role",
        json={"role": "District Officer"},
    )
    assert promote_res_admin.status_code == 200
    assert promote_res_admin.json()["data"]["role"] == "District Officer"


# ==========================================
# 8. Password Reset & Verification Flow Tests
# ==========================================

def test_password_reset_and_otp_flows(auth_test_context):
    client, repo = auth_test_context
    phone = "+919437012345"

    # Send mobile OTP
    otp_req = client.post("/api/v1/auth/verify-mobile/send", json={"mobile_number": phone})
    assert otp_req.status_code == 200
    assert otp_req.json()["success"] is True

    # Forgot password request
    forgot_res = client.post("/api/v1/auth/forgot-password", json={"email": "nonexistent@apdamitra.gov.in"})
    assert forgot_res.status_code == 200
    assert forgot_res.json()["success"] is True
