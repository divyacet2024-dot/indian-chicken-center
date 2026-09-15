from decimal import Decimal
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.models.order import Order
from app.models.trip import Trip, TripStockLoad
from app.models.wastage import Wastage

CURRENT_TRIP_STATUSES = ("active", "distributing", "returning", "stopped_delayed")
ZERO_KG = Decimal("0.000")


def _decimal(value: Any) -> Decimal:
    return Decimal(str(value)) if value is not None else ZERO_KG


def get_trip_stock(
    db: Session,
    trip_id: str,
    business_id: Optional[str] = None,
) -> Dict[str, Any]:
    query = db.query(Trip).filter(Trip.id == trip_id)
    if business_id is not None:
        query = query.filter(Trip.business_id == business_id)
    trip = query.first()
    if not trip:
        raise ValueError("Trip not found")

    stock_load = db.query(TripStockLoad).filter(TripStockLoad.trip_id == trip.id).first()
    loaded_kg = _decimal(stock_load.loaded_quantity_kg) if stock_load else ZERO_KG
    cost_per_kg = _decimal(stock_load.purchase_price_per_kg) if stock_load else Decimal("0.00")

    orders = db.query(Order).filter(
        Order.trip_id == trip.id,
        Order.status != "cancelled",
    ).all()
    reserved_kg = sum((_decimal(order.quantity_kg) for order in orders), ZERO_KG)
    delivered_kg = sum(
        (_decimal(order.quantity_kg) for order in orders if order.status == "delivered"),
        ZERO_KG,
    )

    wastage_kg = sum(
        (_decimal(record.quantity_kg) for record in db.query(Wastage).filter(Wastage.trip_id == trip.id).all()),
        ZERO_KG,
    )

    return {
        "trip_id": trip.id,
        "truck_id": trip.truck_id,
        "status": trip.status,
        "loaded_kg": loaded_kg,
        "reserved_kg": reserved_kg,
        "ordered_kg": reserved_kg,
        "delivered_kg": delivered_kg,
        "wastage_kg": wastage_kg,
        "remaining_kg": max(ZERO_KG, loaded_kg - reserved_kg - wastage_kg),
        "cost_per_kg": cost_per_kg,
        "wastage_cost": wastage_kg * cost_per_kg,
    }


def get_current_stock_summary(db: Session, business_id: str) -> Dict[str, Any]:
    trips = db.query(Trip).filter(
        Trip.business_id == business_id,
        Trip.status.in_(CURRENT_TRIP_STATUSES),
    ).all()

    totals = {
        "loaded_kg": ZERO_KG,
        "reserved_kg": ZERO_KG,
        "delivered_kg": ZERO_KG,
        "wastage_kg": ZERO_KG,
        "remaining_kg": ZERO_KG,
    }
    trip_summaries = []
    for trip in trips:
        summary = get_trip_stock(db, trip.id, business_id)
        trip_summaries.append(summary)
        for key in totals:
            totals[key] += summary[key]

    totals["trip_count"] = len(trip_summaries)
    totals["trip_summaries"] = trip_summaries
    return totals
