import pytest
from app.models.user import User
from app.models.business import Business
from app.services.auth_service import get_password_hash, create_access_token

def test_account_activation(client):
    response = client.post(
        "/api/auth/activate",
        json={
            "owner_name": "Umarabba Setup",
            "business_name": "Indian Chicken Center South",
            "mobile_number": "9845099000",
            "password": "securepassword123",
            "confirm_password": "securepassword123"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "owner"
    assert data["email_or_phone"] == "9845099000"

def test_duplicate_activation_rejection(client):
    # Try registering duplicate phone/email
    response = client.post(
        "/api/auth/activate",
        json={
            "owner_name": "Duplicate Owner",
            "business_name": "Indian Chicken Center Duplicate",
            "mobile_number": "9845099000",
            "password": "anotherpassword123",
            "confirm_password": "anotherpassword123"
        }
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]

def test_login_success(client):
    # First activate an account
    client.post(
        "/api/auth/activate",
        json={
            "owner_name": "Login Test Owner",
            "business_name": "Login Test Business",
            "mobile_number": "login_test@test.com",
            "password": "securepassword123",
            "confirm_password": "securepassword123"
        }
    )

    login_resp = client.post(
        "/api/auth/login",
        json={
            "email_or_phone": "login_test@test.com",
            "password": "securepassword123"
        }
    )
    assert login_resp.status_code == 200
    data = login_resp.json()
    assert "access_token" in data
    assert data["email_or_phone"] == "login_test@test.com"

def test_login_incorrect_password_rejection(client):
    # First activate an account
    client.post(
        "/api/auth/activate",
        json={
            "owner_name": "Bad Login Owner",
            "business_name": "Bad Login Business",
            "mobile_number": "bad_login@test.com",
            "password": "correctpassword123",
            "confirm_password": "correctpassword123"
        }
    )

    bad_login = client.post(
        "/api/auth/login",
        json={
            "email_or_phone": "bad_login@test.com",
            "password": "wrongpassword"
        }
    )
    assert bad_login.status_code == 401

def test_get_current_user_me(client):
    # First activate an account
    client.post(
        "/api/auth/activate",
        json={
            "owner_name": "Me Test Owner",
            "business_name": "Me Test Business",
            "mobile_number": "me_test@test.com",
            "password": "securepassword123",
            "confirm_password": "securepassword123"
        }
    )

    # Login to get token
    login_resp = client.post(
        "/api/auth/login",
        json={
            "email_or_phone": "me_test@test.com",
            "password": "securepassword123"
        }
    )
    token = login_resp.json()["access_token"]

    me_resp = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["email_or_phone"] == "me_test@test.com"
    assert me_data["business"]["owner_name"] == "Me Test Owner"
    assert me_data["preferred_language"] == "en"

    preference_resp = client.patch(
        "/api/auth/preferences",
        headers={"Authorization": f"Bearer {token}"},
        json={"preferred_language": "kn"},
    )
    assert preference_resp.status_code == 200
    assert preference_resp.json()["preferred_language"] == "kn"
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).json()["preferred_language"] == "kn"

def test_business_data_isolation(client, db_session):
    # Create Business B and User B
    biz_b = Business(business_name="Other Wholesale Chicken", owner_name="Owner B", contact_details="9998887770")
    db_session.add(biz_b)
    db_session.flush()

    user_b = User(
        business_id=biz_b.id,
        email_or_phone="owner_b@test.com",
        password_hash=get_password_hash("passwordB123"),
        role="owner",
        is_active=True
    )
    db_session.add(user_b)
    db_session.commit()

    token_b = create_access_token(data={"sub": user_b.id, "business_id": biz_b.id})

    # User B lists customers — should see 0 customers initially (isolated from Business A)
    cust_resp = client.get(
        "/api/customers",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert cust_resp.status_code == 200
    assert len(cust_resp.json()) == 0
