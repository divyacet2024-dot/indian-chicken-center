import pytest
from app.models.business import Business
from app.models.user import User
from app.models.nearby_business import NearbyBusiness
from app.services.auth_service import get_password_hash, create_access_token

def test_create_and_list_nearby_business(auth_client):
    # Create potential nearby business
    resp = auth_client.post(
        "/api/nearby-businesses",
        json={
            "shop_name": "Empire Hotel & Restaurant",
            "business_type": "restaurant",
            "contact_number": "9845077112",
            "address": "MG Road, Bangalore",
            "latitude": 12.9725,
            "longitude": 77.5955,
            "notes": "Prefers 100+ kg daily delivery"
        }
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["shop_name"] == "Empire Hotel & Restaurant"
    assert data["business_type"] == "restaurant"
    assert data["latitude"] == 12.9725

    # List nearby businesses
    list_resp = auth_client.get("/api/nearby-businesses")
    assert list_resp.status_code == 200
    items = list_resp.json()
    assert len(items) >= 1

def test_find_nearby_businesses_near_trip(auth_client):
    # Setup truck & trip
    truck_resp = auth_client.post("/api/trucks", json={"registration_number": "KA-19-EA-3333", "status": "available"})
    truck_id = truck_resp.json()["id"]

    trip_resp = auth_client.post(
        "/api/trips",
        json={
            "truck_id": truck_id,
            "starting_location": "Mangalore",
            "destination": "Bangalore",
            "stock_load": {"loaded_quantity_kg": 2500.0, "purchase_price_per_kg": 112.0}
        }
    )
    trip_id = trip_resp.json()["id"]

    # Record Truck GPS location near Bangalore (12.9716, 77.5946)
    auth_client.post(
        f"/api/trips/{trip_id}/location",
        json={"latitude": 12.9716, "longitude": 77.5946, "location_name": "Bangalore Highway"}
    )

    # Query nearby businesses near trip
    near_resp = auth_client.get(f"/api/nearby-businesses/near-trip/{trip_id}?radius_km=50.0")
    assert near_resp.status_code == 200
    buyers = near_resp.json()
    assert len(buyers) >= 1
    assert buyers[0]["shop_name"] == "Empire Hotel & Restaurant"
    assert buyers[0]["distance_km"] < 2.0  # Within 2 km

def test_business_data_isolation(client, db_session):
    # Create Business B & User B
    biz_b = Business(business_name="Other Distributor", owner_name="Owner B", contact_details="9990001111")
    db_session.add(biz_b)
    db_session.flush()

    user_b = User(
        business_id=biz_b.id,
        email_or_phone="user_b@test.com",
        password_hash=get_password_hash("pass1234"),
        role="owner",
        is_active=True
    )
    db_session.add(user_b)
    db_session.commit()

    token_b = create_access_token(data={"sub": user_b.id, "business_id": biz_b.id})

    # User B lists potential buyers — should see 0 items (isolated from Business A)
    list_b = client.get(
        "/api/nearby-businesses",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert list_b.status_code == 200
    assert len(list_b.json()) == 0

def test_convert_nearby_buyer_to_customer_and_order(auth_client):
    # Create customer from nearby buyer
    cust_resp = auth_client.post(
        "/api/customers",
        json={
            "shop_name": "Highway Chicken Stall",
            "customer_name": "Suresh",
            "contact_number": "9845099112",
            "address": "Hassan Bypass",
            "opening_balance": 0.00,
            "latitude": 13.0072,
            "longitude": 76.1010
        }
    )
    assert cust_resp.status_code == 201
    cust_id = cust_resp.json()["id"]

    # Start Trip with 500 kg chicken
    truck_resp = auth_client.post("/api/trucks", json={"registration_number": "KA-19-EA-2222", "status": "available"})
    truck_id = truck_resp.json()["id"]
    trip_resp = auth_client.post(
        "/api/trips",
        json={
            "truck_id": truck_id,
            "starting_location": "Yard",
            "destination": "Hassan",
            "stock_load": {"loaded_quantity_kg": 500.0, "purchase_price_per_kg": 110.0}
        }
    )
    trip_id = trip_resp.json()["id"]

    # Place Order for 200 kg (Valid)
    order_resp = auth_client.post(
        "/api/orders",
        json={
            "trip_id": trip_id,
            "customer_id": cust_id,
            "quantity_kg": 200.0,
            "selling_price_per_kg": 145.0
        }
    )
    assert order_resp.status_code == 201
    order_data = order_resp.json()
    assert float(order_data["total_amount"]) == 29000.00  # 200 * 145 = 29,000

def test_stock_limit_protection_rejects_overorder(auth_client):
    # Setup trip with 100 kg stock
    truck_resp = auth_client.post("/api/trucks", json={"registration_number": "KA-19-EA-1111", "status": "available"})
    truck_id = truck_resp.json()["id"]
    trip_resp = auth_client.post(
        "/api/trips",
        json={
            "truck_id": truck_id,
            "starting_location": "Yard",
            "destination": "Route",
            "stock_load": {"loaded_quantity_kg": 100.0, "purchase_price_per_kg": 110.0}
        }
    )
    trip_id = trip_resp.json()["id"]

    cust_resp = auth_client.post(
        "/api/customers",
        json={
            "shop_name": "Overorder Stall",
            "customer_name": "Buyer",
            "contact_number": "9845000000",
            "opening_balance": 0.00
        }
    )
    cust_id = cust_resp.json()["id"]

    # Attempt to order 150 kg (greater than 100 kg remaining) -> Must fail with HTTP 400
    over_order = auth_client.post(
        "/api/orders",
        json={
            "trip_id": trip_id,
            "customer_id": cust_id,
            "quantity_kg": 150.0,
            "selling_price_per_kg": 140.0
        }
    )
    assert over_order.status_code == 400
    assert "remaining on active trip" in over_order.json()["detail"]
