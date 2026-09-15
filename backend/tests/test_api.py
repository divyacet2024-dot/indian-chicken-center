def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "Indian Chicken Center" in data["service"]

def test_auth_me_with_token(client):
    client.post(
        "/api/auth/activate",
        json={
            "owner_name": "Test Owner",
            "business_name": "Test Business Me",
            "mobile_number": "test_me@test.com",
            "password": "testpass123",
            "confirm_password": "testpass123"
        }
    )

    login_resp = client.post(
        "/api/auth/login",
        json={
            "email_or_phone": "test_me@test.com",
            "password": "testpass123"
        }
    )
    token = login_resp.json()["access_token"]

    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email_or_phone"] == "test_me@test.com"
    assert data["business"]["business_name"] == "Test Business Me"

def test_create_and_list_trucks(auth_client):
    response = auth_client.post(
        "/api/trucks",
        json={"registration_number": "KA-19-EA-5555", "status": "available"}
    )
    assert response.status_code == 201
    truck_data = response.json()
    assert truck_data["registration_number"] == "KA-19-EA-5555"

    list_resp = auth_client.get("/api/trucks")
    assert list_resp.status_code == 200
    trucks = list_resp.json()
    assert len(trucks) >= 1

def test_negative_validation_error(auth_client):
    # Try adding a customer with negative opening balance
    bad_customer_resp = auth_client.post(
        "/api/customers",
        json={
            "shop_name": "Bad Shop",
            "customer_name": "Test",
            "contact_number": "12345",
            "opening_balance": -500.00
        }
    )
    assert bad_customer_resp.status_code == 422  # Pydantic validation error

def test_create_customer_and_ledger(auth_client):
    cust_resp = auth_client.post(
        "/api/customers",
        json={
            "shop_name": "City Bakery",
            "customer_name": "Suresh Kumar",
            "contact_number": "9741288990",
            "address": "Karkala",
            "opening_balance": 1500.00
        }
    )
    assert cust_resp.status_code == 201
    cust_id = cust_resp.json()["id"]

    ledger_resp = auth_client.get(f"/api/customers/{cust_id}/ledger")
    assert ledger_resp.status_code == 200
    ledger_data = ledger_resp.json()
    assert float(ledger_data["current_balance"]) == 1500.00

def test_dashboard_summary_endpoint(auth_client):
    dash_resp = auth_client.get("/api/dashboard/summary")
    assert dash_resp.status_code == 200
    summary = dash_resp.json()
    assert "today_sales" in summary
    assert "today_profit" in summary
    assert "available_stock_kg" in summary
