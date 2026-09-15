import os
import sys
import pytest

# Ensure backend root is on Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from fastapi.testclient import TestClient
from app.database import Base, get_db
from app.main import app

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_indian_chicken_center.db"

# Clean up test database file before running tests to ensure fresh state
_test_db_path = os.path.join(os.path.dirname(__file__), "test_indian_chicken_center.db")
if os.path.exists(_test_db_path):
    os.remove(_test_db_path)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=NullPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    if os.path.exists(_test_db_path):
        os.remove(_test_db_path)

@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture
def auth_client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        # Create a unique test business account via activation for each test
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        activate_resp = c.post(
            "/api/auth/activate",
            json={
                "owner_name": "Test Owner",
                "business_name": "Test Business",
                "mobile_number": f"test_owner_{unique_id}@test.com",
                "password": "testpass123",
                "confirm_password": "testpass123"
            },
        )
        assert activate_resp.status_code == 201, f"Failed to activate test user: {activate_resp.text}"

        # Login to obtain a valid JWT token
        login_resp = c.post(
            "/api/auth/login",
            json={
                "email_or_phone": f"test_owner_{unique_id}@test.com",
                "password": "testpass123"
            },
        )
        assert login_resp.status_code == 200, f"Failed to login for test setup: {login_resp.text}"
        token = login_resp.json()["access_token"]
        c.headers = {"Authorization": f"Bearer {token}"}
        yield c
    app.dependency_overrides.clear()
