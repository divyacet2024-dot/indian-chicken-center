import math
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.order import Order
from app.models.customer import Customer
from app.models.trip import Trip, TripLocation
from app.models.nearby_business import NearbyBusiness

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates great-circle distance between two GPS coordinates in kilometers
    using the Haversine formula.
    """
    R = 6371.0  # Earth radius in kilometers

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2.0) ** 2)

    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)

def find_nearby_pending_orders(
    db: Session,
    business_id: str,
    truck_lat: float,
    truck_lng: float,
    max_radius_km: float = 100.0
) -> List[Dict[str, Any]]:
    """
    Finds active/pending customer orders belonging to the business near the specified coordinates.
    Returns list sorted by nearest distance in kilometers.
    """
    pending_orders = db.query(Order).filter(
        Order.business_id == business_id,
        Order.status.in_(["new", "pending", "confirmed", "out_for_delivery"])
    ).all()

    results = []
    for order in pending_orders:
        cust = db.query(Customer).filter(
            Customer.id == order.customer_id,
            Customer.business_id == business_id,
        ).first()
        if cust and cust.latitude is not None and cust.longitude is not None:
            c_lat = float(cust.latitude)
            c_lng = float(cust.longitude)
            dist = calculate_haversine_distance(truck_lat, truck_lng, c_lat, c_lng)

            if dist <= max_radius_km:
                results.append({
                    "order_id": order.id,
                    "customer_id": cust.id,
                    "shop_name": cust.shop_name,
                    "customer_name": cust.customer_name,
                    "contact_number": cust.contact_number,
                    "address": cust.address,
                    "quantity_kg": float(order.quantity_kg),
                    "selling_price_per_kg": float(order.selling_price_per_kg),
                    "total_amount": float(order.total_amount),
                    "status": order.status,
                    "distance_km": dist,
                    "customer_latitude": c_lat,
                    "customer_longitude": c_lng,
                })

    results.sort(key=lambda x: x["distance_km"])
    return results

def find_nearby_potential_businesses(
    db: Session,
    business_id: str,
    truck_lat: float,
    truck_lng: float,
    max_radius_km: float = 50.0
) -> List[Dict[str, Any]]:
    """
    Finds potential nearby buyers (chicken shops, meat shops, restaurants, hotels)
    belonging to the business near the truck's GPS location.
    Returns list sorted by nearest distance in kilometers.
    """
    potential_buyers = db.query(NearbyBusiness).filter(
        NearbyBusiness.business_id == business_id
    ).all()

    results = []
    for b in potential_buyers:
        b_lat = float(b.latitude)
        b_lng = float(b.longitude)
        dist = calculate_haversine_distance(truck_lat, truck_lng, b_lat, b_lng)

        if dist <= max_radius_km:
            results.append({
                "id": b.id,
                "business_id": b.business_id,
                "shop_name": b.shop_name,
                "business_type": b.business_type,
                "contact_number": b.contact_number,
                "address": b.address,
                "latitude": b_lat,
                "longitude": b_lng,
                "notes": b.notes,
                "created_at": b.created_at,
                "updated_at": b.updated_at,
                "distance_km": dist,
            })

    results.sort(key=lambda x: x["distance_km"])
    return results
