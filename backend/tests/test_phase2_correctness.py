from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest

from app.models.business import Business
from app.models.customer import Customer
from app.models.expense import Expense
from app.models.order import Order
from app.models.payment import Payment
from app.models.trip import Trip, TripLocation, TripStockLoad
from app.models.truck import Truck
from app.models.wastage import Wastage
from app.services.ai_service import find_nearby_businesses, get_truck_location
from app.services.dashboard_service import calculate_dashboard_summary
from app.services.ledger_service import get_customer_ledger_summary
from app.services.profit_service import calculate_trip_profitability
from app.services.stock_service import get_current_stock_summary, get_trip_stock


def _utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _business(db_session, name):
    business = Business(business_name=name, owner_name="Owner")
    db_session.add(business)
    db_session.flush()
    return business


def _trip(db_session, business, status="active", loaded="1000.000", cost="100.00"):
    truck = Truck(
        business_id=business.id,
        registration_number=f"KA-{business.id[:6]}-{len(db_session.new)}",
        status="on_trip" if status != "completed" else "available",
    )
    db_session.add(truck)
    db_session.flush()
    trip = Trip(
        business_id=business.id,
        truck_id=truck.id,
        starting_location="Yard",
        destination="City",
        status=status,
    )
    db_session.add(trip)
    db_session.flush()
    db_session.add(TripStockLoad(
        trip_id=trip.id,
        loaded_quantity_kg=Decimal(loaded),
        purchase_price_per_kg=Decimal(cost),
        purchase_total=Decimal(loaded) * Decimal(cost),
    ))
    db_session.flush()
    return trip, truck


def test_dashboard_uses_today_boundaries_and_active_stock(db_session):
    business = _business(db_session, "Today Metrics")
    trip, _ = _trip(db_session, business)
    completed_trip, _ = _trip(db_session, business, status="completed", loaded="500.000")
    now = _utc_now()
    today = now.replace(hour=10, minute=0, second=0, microsecond=0)
    yesterday = today - timedelta(days=1)
    tomorrow = today + timedelta(days=1)

    customer = Customer(
        business_id=business.id,
        shop_name="Today Shop",
        customer_name="Today Customer",
        contact_number="9000000000",
    )
    db_session.add(customer)
    db_session.flush()

    for quantity, status, delivered_at in [
        ("100.000", "delivered", today),
        ("200.000", "out_for_delivery", None),
        ("50.000", "cancelled", None),
        ("40.000", "delivered", yesterday),
        ("30.000", "delivered", tomorrow),
    ]:
        db_session.add(Order(
            business_id=business.id,
            trip_id=trip.id,
            customer_id=customer.id,
            quantity_kg=Decimal(quantity),
            selling_price_per_kg=Decimal("150.00"),
            total_amount=Decimal(quantity) * Decimal("150.00"),
            status=status,
            ordered_at=delivered_at or today,
            delivered_at=delivered_at,
        ))

    db_session.add(Wastage(trip_id=trip.id, quantity_kg=Decimal("50.000"), reason="transit_loss", recorded_at=today))
    db_session.add(Wastage(trip_id=completed_trip.id, quantity_kg=Decimal("25.000"), reason="transit_loss", recorded_at=today))
    db_session.add(Expense(business_id=business.id, trip_id=trip.id, category="fuel", amount=Decimal("1000.00"), expense_date=today))
    db_session.add(Expense(business_id=business.id, trip_id=trip.id, category="fuel", amount=Decimal("2000.00"), expense_date=yesterday))
    db_session.add(Expense(business_id=business.id, trip_id=trip.id, category="fuel", amount=Decimal("3000.00"), expense_date=tomorrow))
    db_session.commit()

    summary = calculate_dashboard_summary(db_session, business.id)

    assert summary["today_sales"] == Decimal("15000.00")
    assert summary["today_expenses"] == Decimal("1000.00")
    assert summary["today_loss_kg"] == Decimal("50.000")
    assert summary["today_orders_count"] == 1
    assert summary["available_stock_kg"] == Decimal("580.000")
    assert summary["today_profit"] == Decimal("-3500.00")


def test_active_truck_count_excludes_maintenance(db_session):
    business = _business(db_session, "Truck Statuses")
    statuses = ["available", "on_trip", "returning", "maintenance"]
    for index, status in enumerate(statuses):
        db_session.add(Truck(
            business_id=business.id,
            registration_number=f"STATUS-{index}",
            status=status,
        ))
    db_session.commit()

    assert calculate_dashboard_summary(db_session, business.id)["active_trucks_count"] == 3


def test_stock_tracks_reservations_delivery_wastage_and_excludes_completed(db_session):
    business = _business(db_session, "Stock Rules")
    active_trip, _ = _trip(db_session, business, loaded="1000.000")
    _trip(db_session, business, status="completed", loaded="500.000")
    customer = Customer(
        business_id=business.id,
        shop_name="Stock Shop",
        customer_name="Stock Customer",
        contact_number="9111111111",
    )
    db_session.add(customer)
    db_session.flush()
    db_session.add_all([
        Order(
            business_id=business.id,
            trip_id=active_trip.id,
            customer_id=customer.id,
            quantity_kg=Decimal("100.000"),
            selling_price_per_kg=Decimal("150.00"),
            total_amount=Decimal("15000.00"),
            status="delivered",
        ),
        Order(
            business_id=business.id,
            trip_id=active_trip.id,
            customer_id=customer.id,
            quantity_kg=Decimal("200.000"),
            selling_price_per_kg=Decimal("150.00"),
            total_amount=Decimal("30000.00"),
            status="out_for_delivery",
        ),
        Order(
            business_id=business.id,
            trip_id=active_trip.id,
            customer_id=customer.id,
            quantity_kg=Decimal("50.000"),
            selling_price_per_kg=Decimal("150.00"),
            total_amount=Decimal("7500.00"),
            status="cancelled",
        ),
    ])
    db_session.add(Wastage(trip_id=active_trip.id, quantity_kg=Decimal("50.000"), reason="damaged_stock"))
    db_session.commit()

    trip_stock = get_trip_stock(db_session, active_trip.id, business.id)
    total_stock = get_current_stock_summary(db_session, business.id)

    assert trip_stock["loaded_kg"] == Decimal("1000.000")
    assert trip_stock["reserved_kg"] == Decimal("300.000")
    assert trip_stock["delivered_kg"] == Decimal("100.000")
    assert trip_stock["wastage_kg"] == Decimal("50.000")
    assert trip_stock["remaining_kg"] == Decimal("650.000")
    assert total_stock["loaded_kg"] == Decimal("1000.000")
    assert total_stock["remaining_kg"] == Decimal("650.000")


def test_profit_counts_wastage_once_and_calculates_margin(db_session):
    business = _business(db_session, "Profit Rules")
    trip, _ = _trip(db_session, business, loaded="1000.000", cost="100.00")
    customer = Customer(
        business_id=business.id,
        shop_name="Profit Shop",
        customer_name="Profit Customer",
        contact_number="9222222222",
    )
    db_session.add(customer)
    db_session.flush()
    now = _utc_now()
    db_session.add(Order(
        business_id=business.id,
        trip_id=trip.id,
        customer_id=customer.id,
        quantity_kg=Decimal("100.000"),
        selling_price_per_kg=Decimal("150.00"),
        total_amount=Decimal("15000.00"),
        status="delivered",
        delivered_at=now,
    ))
    db_session.add(Wastage(trip_id=trip.id, quantity_kg=Decimal("50.000"), reason="transit_loss", recorded_at=now))
    db_session.add(Expense(business_id=business.id, trip_id=trip.id, category="fuel", amount=Decimal("1000.00"), expense_date=now))
    db_session.commit()

    result = calculate_trip_profitability(db_session, trip.id)

    assert result["purchase_cost"] == Decimal("10000.00")
    assert result["wastage_cost"] == Decimal("5000.00")
    assert result["net_profit"] == Decimal("-1000.00")
    assert result["profit_margin"] == Decimal("-6.67")


def test_ledger_rejects_customer_from_another_business(db_session):
    business_a = _business(db_session, "Ledger A")
    business_b = _business(db_session, "Ledger B")
    customer_b = Customer(
        business_id=business_b.id,
        shop_name="Private Shop",
        customer_name="Private Customer",
        contact_number="9333333333",
    )
    db_session.add(customer_b)
    db_session.flush()
    db_session.add(Payment(
        business_id=business_b.id,
        customer_id=customer_b.id,
        amount=Decimal("100.00"),
        payment_method="cash",
    ))
    db_session.commit()

    with pytest.raises(ValueError, match="Customer not found"):
        get_customer_ledger_summary(db_session, customer_b.id, business_a.id)


def test_ai_trip_location_paths_and_no_location_case(db_session):
    business = _business(db_session, "AI Location")
    trip, _ = _trip(db_session, business)

    no_location = get_truck_location(db_session, trip.id, business.id)
    assert no_location["has_location"] is False
    with pytest.raises(ValueError, match="No GPS location"):
        find_nearby_businesses(db_session, business.id, trip.id)

    db_session.add(TripLocation(
        trip_id=trip.id,
        latitude=Decimal("12.9716000"),
        longitude=Decimal("77.5946000"),
        location_name="Bangalore",
    ))
    db_session.commit()

    location = get_truck_location(db_session, trip.id, business.id)
    nearby = find_nearby_businesses(db_session, business.id, trip.id)
    assert location["has_location"] is True
    assert location["location_name"] == "Bangalore"
    assert nearby["mode"] == "trip"
