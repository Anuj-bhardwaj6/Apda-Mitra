import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="session")
def client():
    """Synchronous test client fixture for standard route testing."""
    with TestClient(app) as test_client:
        yield test_client
