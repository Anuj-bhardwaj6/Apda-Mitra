import uuid
from datetime import datetime, timezone
from app.main import app
from app.api.deps import get_user_repository
from app.core.auth import get_current_user
from app.db.models.user import User


class MockUserRepository:
    """Hermetic in-memory repository for offline test suite verification."""
    def __init__(self):
        self.users = {}

    async def get_by_email(self, email: str):
        for u in self.users.values():
            if u.email.lower() == email.lower().strip():
                return u
        return None

    async def get_by_phone(self, phone: str):
        for u in self.users.values():
            if u.phone == phone.strip():
                return u
        return None

    async def get_by_id(self, user_id):
        return self.users.get(str(user_id))

    async def create(self, **kwargs):
        user = User(**kwargs)
        user.id = str(uuid.uuid4())
        user.created_at = datetime.now(timezone.utc)
        user.updated_at = datetime.now(timezone.utc)
        self.users[str(user.id)] = user
        return user


def test_auth_registration_and_login_flow(client):
    mock_repo = MockUserRepository()
    app.dependency_overrides[get_user_repository] = lambda: mock_repo

    async def mock_get_current_user():
        return list(mock_repo.users.values())[0]

    app.dependency_overrides[get_current_user] = mock_get_current_user

    try:
        email = "test_volunteer@apdamitra.gov.in"
        password = "StrongPassword@2026!"

        # 1. Register
        reg_payload = {
            "email": email,
            "phone": "+919876543210",
            "password": password,
            "full_name": "Ramesh Chandra Nayak",
            "role": "Volunteer",
            "assigned_district": "Balasore",
            "assigned_state": "Odisha",
        }
        reg_res = client.post("/api/v1/auth/register", json=reg_payload)
        assert reg_res.status_code == 201
        reg_body = reg_res.json()
        assert reg_body["success"] is True
        assert "access_token" in reg_body["data"]
        assert "refresh_token" in reg_body["data"]
        assert reg_body["data"]["user"]["role"] == "Volunteer"

        # 2. Login
        login_payload = {"email": email, "password": password}
        login_res = client.post("/api/v1/auth/login", json=login_payload)
        assert login_res.status_code == 200
        login_body = login_res.json()
        access_token = login_body["data"]["access_token"]
        refresh_token = login_body["data"]["refresh_token"]

        # 3. Protected /auth/me
        headers = {"Authorization": f"Bearer {access_token}"}
        me_res = client.get("/api/v1/auth/me", headers=headers)
        assert me_res.status_code == 200
        assert me_res.json()["data"]["email"] == email

        # 4. Refresh token rotation
        refresh_res = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
        assert refresh_res.status_code == 200
        assert "access_token" in refresh_res.json()["data"]

    finally:
        app.dependency_overrides.clear()


def test_otp_flow(client):
    phone = "+919123456780"
    req_res = client.post("/api/v1/auth/otp/request", json={"phone": phone})
    assert req_res.status_code == 200
    assert req_res.json()["success"] is True
