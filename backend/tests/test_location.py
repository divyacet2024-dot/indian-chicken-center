import pytest
from app.models.customer import Customer
from app.models.order import Order
from app.services.location_service import calculate_haversine_distance

def test_haversine_distance_calculation():
    # Bangalore Central (12.9716, 77.5946) to Hassan (13.0072, 76.1010)
    # Approx distance is ~165-170 km
    dist = calculate_haversine_distance(12.9716, 77.5946, 13.0072, 76.1010)
    assert 160.0 <= dist <= 175.0

def test_location_record_and_retrieval(auth_client, db_session):
    # Setup truck & trip
    truck_resp = auth_client.post("/api/trucks", json={"registration_number": "KA-19-EA-9999", "status": "available"})
    assert truck_resp.status_code == 201
    truck_id = truck_resp.json()["id"]

    trip_resp = auth_client.post(
        "/api/trips",
        json={
            "truck_id": truck_id,
            "starting_location": "Mangalore Yard",
            "destination": "Bangalore",
            "stock_load": {
                "loaded_quantity_kg": 1500.0,
                "purchase_price_per_kg": 110.0,
            }
        }
    )
    assert trip_resp.status_code == 201
    trip_id = trip_resp.json()["id"]

    # Record Location
    loc_resp = auth_client.post(
        f"/api/trips/{trip_id}/location",
        json={
            "latitude": 12.9716,
            "longitude": 77.5946,
            "location_name": "Bangalore Toll Gate",
            "status": "distributing"
        }
    )
    assert loc_resp.status_code == 201
    loc_data = loc_resp.json()
    assert loc_data["latitude"] == 12.9716
    assert loc_data["longitude"] == 77.5946

    # Fetch Latest Location
    get_loc = auth_client.get(f"/api/trips/{trip_id}/location")
    assert get_loc.status_code == 200
    assert get_loc.json()["location_name"] == "Bangalore Toll Gate"

def test_invalid_coordinates_validation(auth_client, db_session):
    # Setup trip
    truck_resp = auth_client.post("/api/trucks", json={"registration_number": "KA-19-EA-8888", "status": "available"})
    truck_id = truck_resp.json()["id"]
    trip_resp = auth_client.post("/api/trips", json={"truck_id": truck_id, "starting_location": "Yard", "destination": "City"})
    trip_id = trip_resp.json()["id"]

    # Invalid latitude > 90
    bad_lat = auth_client.post(
        f"/api/trips/{trip_id}/location",
        json={"latitude": 120.0, "longitude": 77.5946}
    )
    assert bad_lat.status_code == 422

    # Invalid longitude < -180
    bad_lng = auth_client.post(
        f"/api/trips/{trip_id}/location",
        json={"latitude": 12.97, "longitude": -200.0}
    )
    assert bad_lng.status_code == 422

def test_nearby_pending_order_detection(auth_client, db_session):
    # Create Customer near Bangalore with coordinates (12.9720, 77.5950)
    cust_resp = auth_client.post(
        "/api/customers",
        json={
            "shop_name": "Bangalore Fresh Chicken",
            "customer_name": "Rajesh",
            "contact_number": "9845012345",
            "address": "Indiranagar, Bangalore",
            "opening_balance": 0.00,
            "latitude": 12.9720,
            "longitude": 77.5950
        }
    )
    assert cust_resp.status_code == 201
    cust_id = cust_resp.json()["id"]

    # Create Trip
    truck_resp = auth_client.post("/api/trucks", json={"registration_number": "KA-19-EA-7777", "status": "available"})
    truck_id = truck_resp.json()["id"]
    trip_resp = auth_client.post(
        "/api/trips",
        json={
            "truck_id": truck_id,
            "starting_location": "Mangalore",
            "destination": "Bangalore",
            "stock_load": {"loaded_quantity_kg": 2000.0, "purchase_price_per_kg": 115.0}
        }
    )
    trip_id = trip_resp.json()["id"]

    # Create Order for Customer
    order_resp = auth_client.post(
        "/api/orders",
        json={
            "trip_id": trip_id,
            "customer_id": cust_id,
            "quantity_kg": 300.0,
            "selling_price_per_kg": 150.0
        }
    )
    assert order_resp.status_code == 201

    # Record Truck Location near Bangalore (12.9716, 77.5946)
    auth_client.post(
        f"/api/trips/{trip_id}/location",
        json={"latitude": 12.9716, "longitude": 77.5946, "location_name": "Bangalore City"}
    )

    # Query Nearby Orders
    nearby_resp = auth_client.get(f"/api/trips/{trip_id}/nearby-orders?radius_km=50.0")
    assert nearby_resp.status_code == 200
    nearby_list = nearby_resp.json()
    assert len(nearby_list) >= 1
    assert nearby_list[0]["shop_name"] == "Bangalore Fresh Chicken"
    assert nearby_list[0]["distance_km"] < 2.0  # Within 2 km
