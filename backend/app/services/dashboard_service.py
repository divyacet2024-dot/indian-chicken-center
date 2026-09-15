from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, Tuple

from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.expense import Expense
from app.models.order import Order
from app.models.trip import Trip
from app.models.truck import Truck
from app.models.wastage import Wastage
from app.services.ledger_service import get_customer_ledger_summary
from app.services.profit_service import calculate_business_overall_profit
from app.services.stock_service import CURRENT_TRIP_STATUSES, get_current_stock_summary


def get_today_bounds(now: datetime | None = None) -> Tuple[datetime, datetime]:
    current = now or datetime.now(timezone.utc)
    if current.tzinfo is not None:
        current = current.astimezone(timezone.utc).replace(tzinfo=None)
    start = current.replace(hour=0, minute=0, second=0, microsecond=0)
    return start, start + timedelta(days=1)


def calculate_dashboard_summary(db: Session, business_id: str) -> Dict[str, Any]:
    start_of_today, start_of_tomorrow = get_today_bounds()

    delivered_orders = db.query(Order).filter(
        Order.business_id == business_id,
        Order.status == "delivered",
        Order.delivered_at >= start_of_today,
        Order.delivered_at < start_of_tomorrow,
    ).all()
    today_sales = sum((Decimal(str(order.total_amount)) for order in delivered_orders), Decimal("0.00"))

    today_expenses = sum((
        Decimal(str(expense.amount))
        for expense in db.query(Expense).filter(
            Expense.business_id == business_id,
            Expense.expense_date >= start_of_today,
            Expense.expense_date < start_of_tomorrow,
        ).all()
    ), Decimal("0.00"))

    current_trips = db.query(Trip).filter(
        Trip.business_id == business_id,
        Trip.status.in_(CURRENT_TRIP_STATUSES),
    ).all()
    current_trip_ids = [trip.id for trip in current_trips]
    today_loss_kg = Decimal("0.000")
    if current_trip_ids:
        today_loss_kg = sum((
            Decimal(str(record.quantity_kg))
            for record in db.query(Wastage).filter(
                Wastage.trip_id.in_(current_trip_ids),
                Wastage.recorded_at >= start_of_today,
                Wastage.recorded_at < start_of_tomorrow,
            ).all()
        ), Decimal("0.000"))

    customers = db.query(Customer).filter(Customer.business_id == business_id).all()
    outstanding_total = Decimal("0.00")
    for customer in customers:
        balance = get_customer_ledger_summary(db, customer.id, business_id)["current_balance"]
        if balance > Decimal("0.00"):
            outstanding_total += balance

    active_trips_count = db.query(Trip).filter(
        Trip.business_id == business_id,
        Trip.status == "active",
    ).count()
    active_trucks_count = db.query(Truck).filter(
        Truck.business_id == business_id,
        Truck.status.in_(("available", "on_trip", "returning")),
    ).count()
    stock = get_current_stock_summary(db, business_id)
    today_profit = calculate_business_overall_profit(
        db,
        business_id,
        start_at=start_of_today,
        end_at=start_of_tomorrow,
    )

    return {
        "today_sales": today_sales,
        "today_expenses": today_expenses,
        "today_profit": today_profit["net_profit"],
        "available_stock_kg": stock["remaining_kg"],
        "today_loss_kg": today_loss_kg,
        "outstanding_balance_total": outstanding_total,
        "active_trips_count": active_trips_count,
        "active_trucks_count": active_trucks_count,
        "today_orders_count": len(delivered_orders),
    }
