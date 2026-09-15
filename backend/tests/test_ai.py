import pytest
from fastapi.testclient import TestClient
from app.services.auth_service import get_password_hash, create_access_token
from app.models.business import Business
from app.models.user import User


def test_ai_chat_unauthorized(client):
    response = client.post(
        "/api/ai/chat",
        json={"message": "How much profit did I make?"},
    )
    assert response.status_code == 401


def test_ai_chat_dashboard_summary(auth_client):
    response = auth_client.post(
        "/api/ai/chat",
        json={"message": "Give me a business overview"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert data["tool_used"] == "get_dashboard_summary"
    assert data["data_source"] == "database"


def test_ai_chat_profit(auth_client):
    response = auth_client.post(
        "/api/ai/chat",
        json={"message": "How much profit did I make?"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert data["tool_used"] == "get_profit_report"
    assert "₹" in data["answer"] or "Net Profit" in data["answer"]


def test_ai_chat_expenses_today(auth_client):
    response = auth_client.post(
        "/api/ai/chat",
        json={"message": "What did I spend today?"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["tool_used"] == "get_expenses"
    assert "answer" in data


def test_ai_chat_pending_orders(auth_client):
    response = auth_client.post(
        "/api/ai/chat",
        json={"message": "What orders are pending?"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["tool_used"] == "get_pending_orders"
    assert "answer" in data


def test_ai_chat_active_trucks(auth_client):
    response = auth_client.post(
        "/api/ai/chat",
        json={"message": "Show active trucks"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["tool_used"] == "get_active_trips"
    assert "answer" in data


def test_ai_chat_wastage(auth_client):
    response = auth_client.post(
        "/api/ai/chat",
        json={"message": "How much wastage happened?"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["tool_used"] == "get_wastage"
    assert "answer" in data


def test_ai_chat_pending_payments(auth_client):
    response = auth_client.post(
        "/api/ai/chat",
        json={"message": "Who owes me money?"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["tool_used"] == "get_customers_with_pending_payments"
    assert "answer" in data


def test_ai_chat_nearby_businesses(auth_client):
    response = auth_client.post(
        "/api/ai/chat",
        json={"message": "Find nearby shops"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["tool_used"] == "find_nearby_businesses"
    assert "answer" in data


def test_ai_chat_business_isolation(client, db_session):
    # Create Business B and User B
    biz_b = Business(business_name="Other Distributor", owner_name="Owner B", contact_details="9990001111")
    db_session.add(biz_b)
    db_session.flush()

    user_b = User(
        business_id=biz_b.id,
        email_or_phone="ai_owner_b@test.com",
        password_hash=get_password_hash("passwordB123"),
        role="owner",
        is_active=True,
    )
    db_session.add(user_b)
    db_session.commit()

    token_b = create_access_token(data={"sub": user_b.id, "business_id": biz_b.id})

    # User B asks about profit — should see their own business only
    response = client.post(
        "/api/ai/chat",
        json={"message": "How much profit did I make?"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "Net Profit" in data["answer"] or "profit" in data["answer"]


def test_ai_chat_empty_message(auth_client):
    response = auth_client.post(
        "/api/ai/chat",
        json={"message": ""},
    )
    assert response.status_code == 422
