import os
import json
import logging
from decimal import Decimal
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, Depends
from app.config import settings
from app.models.user import User
from app.models.business import Business
from app.models.truck import Truck
from app.models.trip import Trip, TripStockLoad, TripLocation
from app.models.order import Order
from app.models.expense import Expense
from app.models.wastage import Wastage
from app.models.customer import Customer
from app.models.payment import Payment
from app.models.nearby_business import NearbyBusiness
from app.services.profit_service import calculate_business_overall_profit
from app.services.ledger_service import get_customer_ledger_summary
from app.services.location_service import find_nearby_pending_orders, find_nearby_potential_businesses
from app.services.dashboard_service import calculate_dashboard_summary
from app.services.stock_service import get_trip_stock as calculate_trip_stock
from app.services.multilingual_nlp import (
    SUPPORTED_LANGUAGES,
    detect_intent,
    detect_language,
    extract_entities,
    get_conversation_context,
)

logger = logging.getLogger("indian_chicken_center")
MAX_TOOL_ITERATIONS = 5
SUPPORTED_PERIODS = {"all", "today", "yesterday", "tomorrow", "week", "month"}
SUPPORTED_CATEGORIES = {"fuel", "labour", "maintenance", "food", "other"}

INTENT_TO_TOOL = {
    "DASHBOARD_SUMMARY": "get_dashboard_summary",
    "PROFIT_REPORT": "get_profit_report",
    "SALES_REPORT": "get_profit_report",
    "EXPENSE_REPORT": "get_expenses",
    "WASTAGE_REPORT": "get_wastage",
    "STOCK_STATUS": "get_dashboard_summary",
    "ACTIVE_TRIPS": "get_active_trips",
    "TRIP_STOCK": "get_trip_stock",
    "PENDING_ORDERS": "get_pending_orders",
    "ORDER_DETAILS": "get_order_details",
    "CUSTOMER_BALANCE": "get_customer_balance_info",
    "PENDING_PAYMENTS": "get_customers_with_pending_payments",
    "CUSTOMER_LIST": "list_customers",
    "TRUCK_STATUS": "get_active_trips",
    "TRUCK_LOCATION": "get_truck_location",
    "NEAREST_PURCHASER": "get_nearest_purchaser",
    "DUE_DELIVERIES": "get_due_deliveries",
    "NEARBY_BUSINESSES": "find_nearby_businesses",
    "GENERAL_BUSINESS_QUERY": "get_dashboard_summary",
}

# -----------------------
# Business AI Tools
# -----------------------

def _to_float(val) -> float:
    if val is None:
        return 0.0
    if isinstance(val, Decimal):
        return float(val)
    return float(val)


def get_dashboard_summary(db: Session, business_id: str) -> Dict[str, Any]:
    return calculate_dashboard_summary(db, business_id)


def get_active_trips(db: Session, business_id: str) -> List[Dict[str, Any]]:
    trips = db.query(Trip).filter(Trip.business_id == business_id, Trip.status == "active").order_by(Trip.started_at.desc()).all()
    results = []
    for trip in trips:
        stock_load = db.query(TripStockLoad).filter(TripStockLoad.trip_id == trip.id).first()
        loaded_kg = _to_float(stock_load.loaded_quantity_kg) if stock_load else 0.0
        cost_per_kg = _to_float(stock_load.purchase_price_per_kg) if stock_load else 0.0

        orders = db.query(Order).filter(Order.trip_id == trip.id, Order.status != "cancelled").all()
        ordered_kg = sum(_to_float(o.quantity_kg) for o in orders)
        wastage_kg = sum(_to_float(w.quantity_kg) for w in db.query(Wastage).filter(Wastage.trip_id == trip.id).all())
        remaining_kg = max(0.0, loaded_kg - ordered_kg - wastage_kg)

        truck = db.query(Truck).filter(Truck.id == trip.truck_id, Truck.business_id == business_id).first()

        results.append({
            "id": trip.id,
            "truck_registration": truck.registration_number if truck else "Unknown",
            "starting_location": trip.starting_location,
            "destination": trip.destination,
            "status": trip.status,
            "stock_loaded_kg": loaded_kg,
            "ordered_kg": ordered_kg,
            "wastage_kg": wastage_kg,
            "remaining_kg": remaining_kg,
            "cost_per_kg": cost_per_kg,
            "started_at": trip.started_at.isoformat() if trip.started_at else None,
        })
    return results


def get_trip_stock(db: Session, trip_id: str, business_id: str) -> Dict[str, Any]:
    result = calculate_trip_stock(db, trip_id, business_id)
    return {
        key: _to_float(value) if isinstance(value, Decimal) else value
        for key, value in result.items()
    }


def get_pending_orders(db: Session, business_id: str) -> List[Dict[str, Any]]:
    orders = db.query(Order).filter(
        Order.business_id == business_id,
        Order.status.in_(["new", "pending", "confirmed", "out_for_delivery"])
    ).order_by(Order.ordered_at.desc()).all()

    results = []
    for order in orders:
        customer = db.query(Customer).filter(Customer.id == order.customer_id, Customer.business_id == business_id).first()
        results.append({
            "id": order.id,
            "customer_name": customer.customer_name if customer else "Unknown",
            "shop_name": customer.shop_name if customer else "Unknown",
            "quantity_kg": _to_float(order.quantity_kg),
            "selling_price_per_kg": _to_float(order.selling_price_per_kg),
            "total_amount": _to_float(order.total_amount),
            "status": order.status,
            "trip_id": order.trip_id,
            "ordered_at": order.ordered_at.isoformat() if order.ordered_at else None,
        })
    return results


def get_customer_balance_info(db: Session, customer_id: str, business_id: str) -> Dict[str, Any]:
    customer = db.query(Customer).filter(Customer.id == customer_id, Customer.business_id == business_id).first()
    if not customer:
        raise ValueError("Customer not found")

    summary = get_customer_ledger_summary(db, customer.id, business_id)

    recent_orders = db.query(Order).filter(
        Order.customer_id == customer.id,
        Order.business_id == business_id
    ).order_by(Order.ordered_at.desc()).limit(5).all()

    recent_payments = db.query(Payment).filter(
        Payment.customer_id == customer.id,
        Payment.business_id == business_id,
    ).order_by(Payment.payment_date.desc()).limit(5).all()

    return {
        "customer_id": customer.id,
        "shop_name": customer.shop_name,
        "customer_name": customer.customer_name,
        "contact_number": customer.contact_number,
        "opening_balance": _to_float(summary["opening_balance"]),
        "total_purchases": _to_float(summary["total_purchases"]),
        "total_payments": _to_float(summary["total_payments"]),
        "current_balance": _to_float(summary["current_balance"]),
        "recent_orders": [
            {
                "id": o.id,
                "amount": _to_float(o.total_amount),
                "status": o.status,
                "date": o.ordered_at.isoformat() if o.ordered_at else None,
            }
            for o in recent_orders
        ],
        "recent_payments": [
            {
                "id": p.id,
                "amount": _to_float(p.amount),
                "method": p.payment_method,
                "date": p.payment_date.isoformat() if p.payment_date else None,
            }
            for p in recent_payments
        ],
    }


def get_customers_with_pending_payments(db: Session, business_id: str) -> List[Dict[str, Any]]:
    customers = db.query(Customer).filter(Customer.business_id == business_id).all()
    results = []
    for c in customers:
        summary = get_customer_ledger_summary(db, c.id, business_id)
        if summary["current_balance"] > 0:
            results.append({
                "customer_id": c.id,
                "shop_name": c.shop_name,
                "customer_name": c.customer_name,
                "contact_number": c.contact_number,
                "outstanding_balance": _to_float(summary["current_balance"]),
                "total_purchases": _to_float(summary["total_purchases"]),
                "total_payments": _to_float(summary["total_payments"]),
            })
    results.sort(key=lambda x: x["outstanding_balance"], reverse=True)
    return results


def get_profit_report(db: Session, business_id: str) -> Dict[str, Any]:
    profit = calculate_business_overall_profit(db, business_id)
    return {
        "sales_revenue": _to_float(profit["sales_revenue"]),
        "purchase_cost": _to_float(profit["purchase_cost"]),
        "fuel_expense": _to_float(profit["fuel_expense"]),
        "labour_expense": _to_float(profit["labour_expense"]),
        "maintenance_expense": _to_float(profit["maintenance_expense"]),
        "food_expense": _to_float(profit["food_expense"]),
        "other_expenses": _to_float(profit["other_expenses"]),
        "total_expenses": _to_float(profit["total_expenses"]),
        "total_wastage_kg": _to_float(profit["total_wastage_kg"]),
        "wastage_cost": _to_float(profit["wastage_cost"]),
        "net_profit": _to_float(profit["net_profit"]),
        "profit_margin": _to_float(profit["profit_margin"]),
        "formula_audit": profit["formula_audit"],
    }


def get_expenses(db: Session, business_id: str, period: str = "all", category: Optional[str] = None) -> Dict[str, Any]:
    now = datetime.utcnow()
    query = db.query(Expense).filter(Expense.business_id == business_id)

    if category:
        query = query.filter(Expense.category == category)

    if period == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        query = query.filter(Expense.expense_date >= start)
    elif period == "week":
        start = now - timedelta(days=7)
        query = query.filter(Expense.expense_date >= start)
    elif period == "month":
        start = now - timedelta(days=30)
        query = query.filter(Expense.expense_date >= start)

    expenses = query.order_by(Expense.expense_date.desc()).all()

    total = sum(_to_float(e.amount) for e in expenses)
    by_category: Dict[str, float] = {}
    for e in expenses:
        by_category[e.category] = by_category.get(e.category, 0.0) + _to_float(e.amount)

    return {
        "period": period,
        "category_filter": category,
        "total": total,
        "count": len(expenses),
        "by_category": by_category,
        "expenses": [
            {
                "id": e.id,
                "category": e.category,
                "amount": _to_float(e.amount),
                "quantity": _to_float(e.quantity) if e.quantity else None,
                "unit_price": _to_float(e.unit_price) if e.unit_price else None,
                "description": e.description,
                "expense_date": e.expense_date.isoformat() if e.expense_date else None,
                "trip_id": e.trip_id,
            }
            for e in expenses
        ],
    }


def get_wastage(db: Session, business_id: str, trip_id: Optional[str] = None) -> Dict[str, Any]:
    query = db.query(Wastage)
    if trip_id:
        trip = db.query(Trip).filter(Trip.id == trip_id, Trip.business_id == business_id).first()
        if not trip:
            raise ValueError("Trip not found")
        query = query.filter(Wastage.trip_id == trip_id)
    else:
        trip_ids = [t.id for t in db.query(Trip).filter(Trip.business_id == business_id).all()]
        if trip_ids:
            query = query.filter(Wastage.trip_id.in_(trip_ids))
        else:
            return {"total_quantity_kg": 0.0, "total_cost_impact": 0.0, "count": 0, "records": []}

    records = query.order_by(Wastage.recorded_at.desc()).all()
    total_qty = sum(_to_float(w.quantity_kg) for w in records)

    cost_impact = 0.0
    enriched = []
    for w in records:
        trip = db.query(Trip).join(Wastage, Wastage.trip_id == Trip.id).filter(
            Trip.id == w.trip_id,
            Trip.business_id == business_id,
        ).first()
        cost_per_kg = 0.0
        if trip:
            stock = db.query(TripStockLoad).filter(TripStockLoad.trip_id == trip.id).first()
            if stock:
                cost_per_kg = _to_float(stock.purchase_price_per_kg)
        impact = _to_float(w.quantity_kg) * cost_per_kg
        cost_impact += impact
        enriched.append({
            "id": w.id,
            "trip_id": w.trip_id,
            "quantity_kg": _to_float(w.quantity_kg),
            "reason": w.reason,
            "notes": w.notes,
            "recorded_at": w.recorded_at.isoformat() if w.recorded_at else None,
            "cost_per_kg": cost_per_kg,
            "cost_impact": impact,
        })

    return {
        "total_quantity_kg": total_qty,
        "total_cost_impact": cost_impact,
        "count": len(records),
        "records": enriched,
    }


def find_nearby_businesses(db: Session, business_id: str, trip_id: Optional[str] = None, radius_km: float = 50.0) -> Dict[str, Any]:
    if trip_id:
        trip = db.query(Trip).filter(Trip.id == trip_id, Trip.business_id == business_id).first()
        if not trip:
            raise ValueError("Trip not found")
        latest_loc = db.query(TripLocation).filter(TripLocation.trip_id == trip.id).order_by(TripLocation.recorded_at.desc()).first()
        if not latest_loc:
            raise ValueError("No GPS location recorded for this trip yet")
        truck_lat = float(latest_loc.latitude)
        truck_lng = float(latest_loc.longitude)
        results = find_nearby_potential_businesses(db, business_id, truck_lat, truck_lng, radius_km)
        return {"mode": "trip", "trip_id": trip_id, "radius_km": radius_km, "results": results}

    businesses = db.query(NearbyBusiness).filter(NearbyBusiness.business_id == business_id).order_by(NearbyBusiness.created_at.desc()).all()
    results = [
        {
            "id": b.id,
            "shop_name": b.shop_name,
            "business_type": b.business_type,
            "contact_number": b.contact_number,
            "address": b.address,
            "latitude": float(b.latitude),
            "longitude": float(b.longitude),
            "notes": b.notes,
            "created_at": b.created_at.isoformat() if b.created_at else None,
        }
        for b in businesses
    ]
    return {"mode": "all", "radius_km": radius_km, "results": results}


def get_truck_location(db: Session, trip_id: str, business_id: str) -> Dict[str, Any]:
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.business_id == business_id).first()
    if not trip:
        raise ValueError("Trip not found")

    latest_loc = db.query(TripLocation).filter(TripLocation.trip_id == trip.id).order_by(TripLocation.recorded_at.desc()).first()
    if not latest_loc:
        return {"trip_id": trip.id, "has_location": False, "message": "No GPS location recorded yet"}

    return {
        "trip_id": trip.id,
        "has_location": True,
        "latitude": float(latest_loc.latitude),
        "longitude": float(latest_loc.longitude),
        "location_name": latest_loc.location_name,
        "recorded_at": latest_loc.recorded_at.isoformat() if latest_loc.recorded_at else None,
        "trip_status": trip.status,
    }


def get_nearest_purchaser(db: Session, business_id: str) -> Dict[str, Any]:
    active_trip = db.query(Trip).filter(
        Trip.business_id == business_id,
        Trip.status.in_(["active", "distributing", "returning", "stopped_delayed"]),
    ).order_by(Trip.started_at.desc()).first()
    if not active_trip:
        return {"has_location": False, "message": "No active trip found"}
    latest = db.query(TripLocation).filter(TripLocation.trip_id == active_trip.id).order_by(TripLocation.recorded_at.desc()).first()
    if not latest:
        return {"has_location": False, "trip_id": active_trip.id, "message": "No GPS location recorded yet"}
    nearby = find_nearby_pending_orders(db, business_id, float(latest.latitude), float(latest.longitude), 10000)
    return {"has_location": True, "trip_id": active_trip.id, "result": nearby[0] if nearby else None}


def get_due_deliveries(db: Session, business_id: str) -> Dict[str, Any]:
    orders = db.query(Order).filter(
        Order.business_id == business_id,
        Order.status.notin_(["delivered", "cancelled"]),
        Order.delivery_status.notin_(["delivered", "cancelled"]),
        Order.requested_delivery_time.isnot(None),
    ).order_by(Order.requested_delivery_time.asc()).all()
    results = []
    for order in orders:
        customer = db.query(Customer).filter(Customer.id == order.customer_id, Customer.business_id == business_id).first()
        results.append({
            "order_id": order.id,
            "shop_name": customer.shop_name if customer else "Unknown",
            "requested_delivery_time": order.requested_delivery_time.isoformat(),
            "delivery_status": order.delivery_status,
        })
    return {"orders": results, "count": len(results)}


def get_order_details(db: Session, order_id: str, business_id: str) -> Dict[str, Any]:
    order = db.query(Order).filter(Order.id == order_id, Order.business_id == business_id).first()
    if not order:
        raise ValueError("Order not found")

    customer = db.query(Customer).filter(
        Customer.id == order.customer_id,
        Customer.business_id == business_id,
    ).first()
    trip = db.query(Trip).filter(
        Trip.id == order.trip_id,
        Trip.business_id == business_id,
    ).first()

    return {
        "id": order.id,
        "customer_name": customer.customer_name if customer else "Unknown",
        "shop_name": customer.shop_name if customer else "Unknown",
        "contact_number": customer.contact_number if customer else None,
        "trip_id": order.trip_id,
        "trip_route": f"{trip.starting_location} → {trip.destination}" if trip else "Unknown",
        "quantity_kg": _to_float(order.quantity_kg),
        "selling_price_per_kg": _to_float(order.selling_price_per_kg),
        "total_amount": _to_float(order.total_amount),
        "status": order.status,
        "ordered_at": order.ordered_at.isoformat() if order.ordered_at else None,
        "delivered_at": order.delivered_at.isoformat() if order.delivered_at else None,
        "notes": order.notes,
    }


# -----------------------
# Intent / Tool Selection
# -----------------------

def _period_for_expenses(period: Optional[str]) -> str:
    return {"this_week": "week", "last_week": "week", "this_month": "month", "last_month": "month"}.get(period or "", period or "all")


def select_tool_and_execute(
    db: Session,
    business_id: str,
    message: str,
    language: Optional[str] = None,
    context: Optional[Any] = None,
) -> Dict[str, Any]:
    language_info = detect_language(message, language)
    detected_language = language_info["language"]
    intent_info = detect_intent(message)
    entities = extract_entities(message, detected_language)
    previous = context.last_turn() if context else None
    if previous and not entities.get("period"):
        entities["period"] = previous.get("entities", {}).get("period")

    intent = intent_info["intent"]
    tool = INTENT_TO_TOOL.get(intent, "get_dashboard_summary")
    data: Any
    answer_focus = intent.lower()

    if intent == "CUSTOMER_BALANCE" and entities.get("customer_name"):
        customer_name = entities["customer_name"].casefold()
        matches = db.query(Customer).filter(Customer.business_id == business_id).all()
        exact_match = next(
            (customer for customer in matches if customer.customer_name.casefold() == customer_name or customer.shop_name.casefold() == customer_name),
            None,
        )
        if exact_match:
            entities["customer_id"] = exact_match.id

    if tool == "get_profit_report":
        data = get_profit_report(db, business_id)
    elif tool == "get_expenses":
        data = get_expenses(db, business_id, _period_for_expenses(entities.get("period")), entities.get("expense_category"))
    elif tool == "get_wastage":
        data = get_wastage(db, business_id, entities.get("trip_id"))
    elif tool == "get_customers_with_pending_payments":
        data = get_customers_with_pending_payments(db, business_id)
    elif tool == "get_customer_balance_info":
        customer_id = entities.get("customer_id")
        if not customer_id:
            data = get_customers_with_pending_payments(db, business_id)
            tool = "get_customers_with_pending_payments"
        else:
            data = get_customer_balance_info(db, customer_id, business_id)
    elif tool == "list_customers":
        customers = db.query(Customer).filter(Customer.business_id == business_id).all()
        data = {"customers": [{"id": c.id, "shop_name": c.shop_name, "customer_name": c.customer_name, "contact_number": c.contact_number, "current_balance": _to_float(get_customer_ledger_summary(db, c.id, business_id)["current_balance"])} for c in customers], "count": len(customers)}
    elif tool == "get_pending_orders":
        orders = get_pending_orders(db, business_id)
        data = {"orders": orders, "count": len(orders)}
    elif tool == "get_active_trips":
        trips = get_active_trips(db, business_id)
        data = {"trips": trips, "count": len(trips)}
    elif tool == "get_trip_stock":
        trip_id = entities.get("trip_id")
        trips = get_active_trips(db, business_id)
        data = get_trip_stock(db, trip_id or (trips[0]["id"] if trips else ""), business_id) if (trip_id or trips) else get_dashboard_summary(db, business_id)
        if not trip_id and not trips:
            tool = "get_dashboard_summary"
    elif tool == "get_order_details":
        order_id = entities.get("order_id")
        if not order_id:
            orders = get_pending_orders(db, business_id)
            data = {"orders": orders, "count": len(orders)}
            tool = "get_pending_orders"
        else:
            data = get_order_details(db, order_id, business_id)
    elif tool == "get_truck_location":
        trip_id = entities.get("trip_id")
        trips = get_active_trips(db, business_id)
        if not trip_id and trips:
            trip_id = trips[0]["id"]
        if trip_id:
            data = get_truck_location(db, trip_id, business_id)
        else:
            data = {"message": "No active trip found"}
    elif tool == "get_nearest_purchaser":
        data = get_nearest_purchaser(db, business_id)
    elif tool == "get_due_deliveries":
        data = get_due_deliveries(db, business_id)
    elif tool == "find_nearby_businesses":
        radius = entities.get("radius") or 50.0
        data = find_nearby_businesses(db, business_id, entities.get("trip_id"), radius)
    else:
        data = get_dashboard_summary(db, business_id)

    return {"tool": tool, "data": data, "answer_focus": answer_focus, "intent": intent, "entities": entities, "language": detected_language, "confidence": intent_info["confidence"]}


# -----------------------
# Legacy Natural Language Response Generation
# -----------------------

def _legacy_generate_natural_response(tool_result: Dict[str, Any], original_message: str) -> str:
    tool = tool_result.get("tool", "unknown")
    data = tool_result.get("data", {})
    focus = tool_result.get("answer_focus", "unknown")

    if tool == "get_profit_report":
        return (
            f"Your overall profit report:\n\n"
            f"Sales Revenue: ₹{data.get('sales_revenue', 0):,.2f}\n"
            f"Purchase Cost: ₹{data.get('purchase_cost', 0):,.2f}\n"
            f"Total Expenses: ₹{data.get('total_expenses', 0):,.2f}\n"
            f"Wastage Cost: ₹{data.get('wastage_cost', 0):,.2f}\n"
            f"Net Profit: ₹{data.get('net_profit', 0):,.2f}\n\n"
            f"{data.get('formula_audit', '')}"
        )

    if tool == "get_expenses":
        lines = [f"Expenses ({data.get('period', 'all')}):"]
        if data.get("category_filter"):
            lines[0] += f" — {data['category_filter'].upper()} only"
        lines.append(f"Total: ₹{data.get('total', 0):,.2f}")
        lines.append(f"Count: {data.get('count', 0)}")
        by_cat = data.get("by_category", {})
        if by_cat:
            lines.append("By category:")
            for cat, amt in by_cat.items():
                lines.append(f"  • {cat.title()}: ₹{amt:,.2f}")
        return "\n".join(lines)

    if tool == "get_wastage":
        return (
            f"Wastage report:\n\n"
            f"Total wastage: {data.get('total_quantity_kg', 0):,.3f} kg\n"
            f"Financial impact: ₹{data.get('total_cost_impact', 0):,.2f}\n"
            f"Records: {data.get('count', 0)}"
        )

    if tool == "get_customers_with_pending_payments":
        items = data if isinstance(data, list) else data.get("customers", [])
        if not items:
            return "No customers have outstanding balances right now."
        total_outstanding = sum(item.get("outstanding_balance", 0) for item in items)
        lines = [f"{len(items)} customer(s) owe you a total of ₹{total_outstanding:,.2f}:"]
        for item in items[:10]:
            lines.append(f"• {item.get('shop_name', 'Unknown')} — ₹{item.get('outstanding_balance', 0):,.2f}")
        return "\n".join(lines)

    if tool == "list_customers":
        customers = data.get("customers", [])
        count = data.get("count", 0)
        lines = [f"You have {count} customer(s) registered:"]
        for c in customers[:10]:
            lines.append(f"• {c.get('shop_name', 'Unknown')} ({c.get('customer_name', '')}) — Balance: ₹{c.get('current_balance', 0):,.2f}")
        return "\n".join(lines)

    if tool == "get_pending_orders":
        orders = data.get("orders", [])
        count = data.get("count", 0)
        if count == 0:
            return "No pending orders right now."
        lines = [f"{count} pending order(s):"]
        for o in orders[:10]:
            lines.append(f"• {o.get('shop_name', 'Unknown')} — {o.get('quantity_kg', 0)} kg @ ₹{o.get('selling_price_per_kg', 0):,.2f} ({o.get('status', '')})")
        return "\n".join(lines)

    if tool == "get_active_trips":
        trips = data.get("trips", [])
        count = data.get("count", 0)
        if count == 0:
            return "No active trips right now."
        lines = [f"{count} active trip(s):"]
        for t in trips[:10]:
            lines.append(f"• {t.get('truck_registration', 'Truck')}: {t.get('starting_location', '')} → {t.get('destination', '')} | Remaining: {t.get('remaining_kg', 0):,.3f} kg")
        return "\n".join(lines)

    if tool == "get_trip_stock":
        return (
            f"Trip stock ({data.get('trip_id', '')}):\n\n"
            f"Loaded: {data.get('loaded_kg', 0):,.3f} kg\n"
            f"Ordered: {data.get('ordered_kg', 0):,.3f} kg\n"
            f"Delivered: {data.get('delivered_kg', 0):,.3f} kg\n"
            f"Wastage: {data.get('wastage_kg', 0):,.3f} kg\n"
            f"Remaining: {data.get('remaining_kg', 0):,.3f} kg\n"
            f"Cost per kg: ₹{data.get('cost_per_kg', 0):,.2f}"
        )

    if tool == "find_nearby_businesses":
        results = data.get("results", [])
        if not results:
            return "I don't have any nearby businesses recorded yet."
        lines = [f"{len(results)} nearby business(es) found:"]
        for b in results[:10]:
            lines.append(f"• {b.get('shop_name', 'Unknown')} ({b.get('business_type', '')}) — {b.get('distance_km', 0):.2f} km")
        return "\n".join(lines)

    if tool == "get_dashboard_summary":
        return (
            f"Business overview:\n\n"
            f"Today's Sales: ₹{data.get('today_sales', 0):,.2f}\n"
            f"Today's Expenses: ₹{data.get('today_expenses', 0):,.2f}\n"
            f"Today's Profit: ₹{data.get('today_profit', 0):,.2f}\n"
            f"Available Stock: {data.get('available_stock_kg', 0):,.3f} kg\n"
            f"Today's Loss: {data.get('today_loss_kg', 0):,.3f} kg\n"
            f"Outstanding Dues: ₹{data.get('outstanding_balance_total', 0):,.2f}\n"
            f"Active Trips: {data.get('active_trips_count', 0)}\n"
            f"Active Trucks: {data.get('active_trucks_count', 0)}\n"
            f"Today's Orders: {data.get('today_orders_count', 0)}"
        )

    return "I don't have that information yet. Try asking about sales, profit, expenses, wastage, customers, orders, or active trips."


# -----------------------
# Multilingual deterministic response rendering
# -----------------------

RESPONSE_LABELS = {
    "en": {"profit": "Profit report", "sales": "Sales", "expenses": "Expenses", "total": "Total", "wastage": "Wastage", "remaining": "Remaining", "stock": "Stock", "today": "Today's", "no_data": "I don't have that information yet."},
    "kn": {"profit": "ಲಾಭ ವರದಿ", "sales": "ಮಾರಾಟ", "expenses": "ಖರ್ಚು", "total": "ಒಟ್ಟು", "wastage": "ನಷ್ಟ", "remaining": "ಉಳಿದದ್ದು", "stock": "ಸ್ಟಾಕ್", "today": "ಇಂದಿನ", "no_data": "ಆ ಮಾಹಿತಿಯು ಈಗ ಲಭ್ಯವಿಲ್ಲ."},
    "hi": {"profit": "लाभ रिपोर्ट", "sales": "बिक्री", "expenses": "खर्च", "total": "कुल", "wastage": "बर्बादी", "remaining": "शेष", "stock": "स्टॉक", "today": "आज का", "no_data": "यह जानकारी अभी उपलब्ध नहीं है।"},
    "te": {"profit": "లాభ నివేదిక", "sales": "అమ్మకాలు", "expenses": "ఖర్చులు", "total": "మొత్తం", "wastage": "నష్టం", "remaining": "మిగిలినది", "stock": "స్టాక్", "today": "ఈరోజు", "no_data": "ఆ సమాచారం ప్రస్తుతం అందుబాటులో లేదు."},
    "ta": {"profit": "லாப அறிக்கை", "sales": "விற்பனை", "expenses": "செலவுகள்", "total": "மொத்தம்", "wastage": "இழப்பு", "remaining": "மீதம்", "stock": "ஸ்டாக்", "today": "இன்றைய", "no_data": "அந்த தகவல் இப்போது கிடைக்கவில்லை."},
    "ml": {"profit": "ലാഭ റിപ്പോർട്ട്", "sales": "വിൽപ്പന", "expenses": "ചെലവുകൾ", "total": "ആകെ", "wastage": "നഷ്ടം", "remaining": "ശേഷിക്കുന്നത്", "stock": "സ്റ്റോക്ക്", "today": "ഇന്നത്തെ", "no_data": "ആ വിവരം ഇപ്പോൾ ലഭ്യമല്ല."},
    "ur": {"profit": "منافع رپورٹ", "sales": "فروخت", "expenses": "اخراجات", "total": "کل", "wastage": "ضیاع", "remaining": "باقی", "stock": "اسٹاک", "today": "آج کا", "no_data": "یہ معلومات ابھی دستیاب نہیں ہے۔"},
    "mr": {"profit": "नफा अहवाल", "sales": "विक्री", "expenses": "खर्च", "total": "एकूण", "wastage": "नासाडी", "remaining": "शिल्लक", "stock": "साठा", "today": "आजचा", "no_data": "ही माहिती सध्या उपलब्ध नाही."},
    "bn": {"profit": "লাভের রিপোর্ট", "sales": "বিক্রয়", "expenses": "খরচ", "total": "মোট", "wastage": "অপচয়", "remaining": "অবশিষ্ট", "stock": "স্টক", "today": "আজকের", "no_data": "এই তথ্য এখন পাওয়া যাচ্ছে না।"},
}


def generate_natural_response(tool_result: Dict[str, Any], original_message: str, language: Optional[str] = None) -> str:
    lang = language or tool_result.get("language") or detect_language(original_message)["language"]
    labels = RESPONSE_LABELS.get(lang, RESPONSE_LABELS["en"])
    tool = tool_result.get("tool", "unknown")
    data = tool_result.get("data", {})
    if tool == "get_profit_report":
        return (f"{labels['profit']}:\n\n{labels['sales']}: ₹{data.get('sales_revenue', 0):,.2f}\n"
                f"{labels['expenses']}: ₹{data.get('total_expenses', 0):,.2f}\n"
                f"{labels['wastage']}: ₹{data.get('wastage_cost', 0):,.2f}\n"
                f"Net Profit: ₹{data.get('net_profit', 0):,.2f}\n"
                f"Profit Margin: {data.get('profit_margin', 0):,.2f}%")
    if tool == "get_expenses":
        return f"{labels['expenses']} ({data.get('period', 'all')}):\n{labels['total']}: ₹{data.get('total', 0):,.2f}\nCount: {data.get('count', 0)}"
    if tool == "get_wastage":
        return f"{labels['wastage']}:\n{labels['total']}: {data.get('total_quantity_kg', 0):,.3f} kg\nImpact: ₹{data.get('total_cost_impact', 0):,.2f}"
    if tool == "get_trip_stock":
        return (f"{labels['stock']}:\nLoaded: {data.get('loaded_kg', 0):,.3f} kg\n"
                f"Reserved: {data.get('reserved_kg', data.get('ordered_kg', 0)):,.3f} kg\n"
                f"Delivered: {data.get('delivered_kg', 0):,.3f} kg\n"
                f"{labels['wastage']}: {data.get('wastage_kg', 0):,.3f} kg\n"
                f"{labels['remaining']}: {data.get('remaining_kg', 0):,.3f} kg")
    if tool == "get_dashboard_summary":
        return (f"{labels['today']} {labels['sales']}: ₹{data.get('today_sales', 0):,.2f}\n"
                f"{labels['today']} {labels['expenses']}: ₹{data.get('today_expenses', 0):,.2f}\n"
                f"{labels['today']} Profit: ₹{data.get('today_profit', 0):,.2f}\n"
                f"{labels['remaining']} {labels['stock']}: {data.get('available_stock_kg', 0):,.3f} kg")
    if tool == "get_customers_with_pending_payments":
        items = data if isinstance(data, list) else data.get("customers", [])
        if not items:
            return labels["no_data"]
        return "\n".join([f"{len(items)} customer(s):"] + [f"• {item.get('shop_name', 'Unknown')} — ₹{item.get('outstanding_balance', 0):,.2f}" for item in items[:10]])
    if tool == "get_pending_orders":
        orders = data.get("orders", [])
        return f"{len(orders)} pending order(s)." if orders else "No pending orders right now."
    if tool == "list_customers":
        return f"{data.get('count', 0)} customer(s) registered."
    if tool == "get_active_trips":
        return f"{data.get('count', 0)} active trip(s)." if data.get("count") else "No active trips right now."
    if tool == "find_nearby_businesses":
        return f"{len(data.get('results', []))} nearby business(es) found."
    if tool == "get_truck_location":
        if not data.get("has_location"):
            return labels["no_data"]
        return f"{labels.get('location', 'Location')}: {data.get('location_name') or f'{data.get("latitude")}, {data.get("longitude")}'}"
    if tool == "get_nearest_purchaser":
        result = data.get("result")
        if not result:
            return labels["no_data"]
        return f"{labels.get('nearest', 'Nearest purchaser')}: {result.get('shop_name')} ({result.get('distance_km')} km)"
    if tool == "get_due_deliveries":
        orders = data.get("orders", [])
        if not orders:
            return labels["no_data"]
        first = orders[0]
        return f"{labels.get('due', 'Due deliveries')}: {first.get('shop_name')} at {first.get('requested_delivery_time')}"
    return labels["no_data"]


# -----------------------
# OpenRouter Integration
# -----------------------

def _get_openrouter_client():
    api_key = getattr(settings, "OPENROUTER_API_KEY", "")
    if not api_key:
        return None
    try:
        from openai import OpenAI
        return OpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
        )
    except Exception as exc:
        logger.error(f"Failed to initialize OpenRouter client: {exc}")
        return None


def _legacy_generate_ai_response_with_openrouter(
    message: str,
    business_id: str,
    db: Session,
) -> Dict[str, Any]:
    client = _get_openrouter_client()
    if not client:
        raise ValueError("OpenRouter API key not configured")

    tool_result = select_tool_and_execute(db, business_id, message)
    deterministic_answer = generate_natural_response(tool_result, message)

    model = getattr(settings, "AI_MODEL", "openai/gpt-3.5-turbo") or "openai/gpt-3.5-turbo"

    system_prompt = (
        "You are an AI business assistant for an Indian chicken wholesale distribution business. "
        "You must answer ONLY using the factual business data provided below. "
        "Do NOT invent numbers. Do NOT guess. "
        "If the data indicates something is zero or not available, say so. "
        "Format currency in Indian Rupees (₹) using Indian number formatting. "
        "Keep answers concise and mobile-friendly."
    )

    user_prompt = (
        f"Owner question: {message}\n\n"
        f"Business data retrieved by tool '{tool_result.get('tool')}':\n"
        f"{json.dumps(tool_result.get('data', {}), indent=2, default=str)}\n\n"
        f"Deterministic answer (use this as the base):\n{deterministic_answer}\n\n"
        "Rewrite the deterministic answer to be clean, professional, and mobile-friendly. "
        "Do NOT add any data not present above. Do NOT hallucinate."
    )

    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.0,
            max_tokens=500,
        )
        text = completion.choices[0].message.content or deterministic_answer
        return {
            "answer": text,
            "tool_used": tool_result.get("tool"),
            "data_source": "database",
            "provider": "openrouter",
            "model": model,
        }
    except Exception as exc:
        logger.error(f"OpenRouter request failed: {exc}")
        raise


# -----------------------
# Public Orchestrator
# -----------------------

def _legacy_process_ai_chat(
    db: Session,
    business_id: str,
    message: str,
) -> Dict[str, Any]:
    tool_result = select_tool_and_execute(db, business_id, message)
    deterministic_answer = generate_natural_response(tool_result, message)

    provider = getattr(settings, "AI_PROVIDER", "")

    if provider == "openrouter":
        try:
            return generate_ai_response_with_openrouter(message, business_id, db)
        except Exception as exc:
            logger.warning(f"OpenRouter failed, falling back to deterministic answer: {exc}")
            return {
                "answer": deterministic_answer,
                "tool_used": tool_result.get("tool"),
                "data_source": "database",
                "provider": "fallback",
                "model": None,
                "error": str(exc),
            }

    return {
        "answer": deterministic_answer,
        "tool_used": tool_result.get("tool"),
        "data_source": "database",
        "provider": "deterministic",
        "model": None,
    }


# The definitions below intentionally expose only named backend tools. The model
# never receives a database handle, SQL capability, or executable code surface.
AGENT_TOOL_DEFINITIONS = [
    {"type": "function", "function": {"name": "get_dashboard_summary", "description": "Get today's authenticated business dashboard summary.", "parameters": {"type": "object", "properties": {}, "additionalProperties": False}}},
    {"type": "function", "function": {"name": "get_active_trips", "description": "List active trips for the authenticated business.", "parameters": {"type": "object", "properties": {}, "additionalProperties": False}}},
    {"type": "function", "function": {"name": "get_trip_stock", "description": "Get stock movements for one trip.", "parameters": {"type": "object", "properties": {"trip_id": {"type": "string"}}, "required": ["trip_id"], "additionalProperties": False}}},
    {"type": "function", "function": {"name": "get_pending_orders", "description": "List pending orders for the authenticated business.", "parameters": {"type": "object", "properties": {}, "additionalProperties": False}}},
    {"type": "function", "function": {"name": "get_customer_balance_info", "description": "Get one authenticated customer's ledger summary.", "parameters": {"type": "object", "properties": {"customer_id": {"type": "string"}}, "required": ["customer_id"], "additionalProperties": False}}},
    {"type": "function", "function": {"name": "get_customers_with_pending_payments", "description": "List customers with outstanding balances.", "parameters": {"type": "object", "properties": {}, "additionalProperties": False}}},
    {"type": "function", "function": {"name": "get_profit_report", "description": "Get the authoritative business profit report.", "parameters": {"type": "object", "properties": {}, "additionalProperties": False}}},
    {"type": "function", "function": {"name": "get_expenses", "description": "Get authenticated business expenses.", "parameters": {"type": "object", "properties": {"period": {"type": "string", "enum": ["all", "today", "week", "month"]}, "category": {"type": "string", "enum": ["fuel", "labour", "maintenance", "food", "other"]}}, "additionalProperties": False}}},
    {"type": "function", "function": {"name": "get_wastage", "description": "Get authenticated business wastage.", "parameters": {"type": "object", "properties": {"trip_id": {"type": "string"}}, "additionalProperties": False}}},
    {"type": "function", "function": {"name": "find_nearby_businesses", "description": "Find recorded nearby businesses, optionally around a trip location.", "parameters": {"type": "object", "properties": {"trip_id": {"type": "string"}, "radius_km": {"type": "number", "minimum": 0.1, "maximum": 200}}, "additionalProperties": False}}},
    {"type": "function", "function": {"name": "get_truck_location", "description": "Get the latest location for a trip.", "parameters": {"type": "object", "properties": {"trip_id": {"type": "string"}}, "required": ["trip_id"], "additionalProperties": False}}},
    {"type": "function", "function": {"name": "get_order_details", "description": "Get one authenticated order.", "parameters": {"type": "object", "properties": {"order_id": {"type": "string"}}, "required": ["order_id"], "additionalProperties": False}}},
]


def _is_uuid(value: Any) -> bool:
    import uuid
    try:
        uuid.UUID(str(value))
        return True
    except (ValueError, TypeError, AttributeError):
        return False


def _validate_tool_arguments(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(arguments, dict):
        raise ValueError("Tool arguments must be an object")
    allowed = {
        "get_dashboard_summary": set(), "get_active_trips": set(), "get_pending_orders": set(),
        "get_customers_with_pending_payments": set(), "get_profit_report": set(),
        "get_trip_stock": {"trip_id"}, "get_customer_balance_info": {"customer_id"},
        "get_wastage": {"trip_id"}, "get_truck_location": {"trip_id"},
        "get_order_details": {"order_id"}, "find_nearby_businesses": {"trip_id", "radius_km"},
        "get_expenses": {"period", "category"},
    }
    if tool_name not in allowed or any(key not in allowed[tool_name] for key in arguments):
        raise ValueError("Unsupported tool or arguments")
    for key in ("trip_id", "customer_id", "order_id"):
        if key in arguments and not _is_uuid(arguments[key]):
            raise ValueError(f"Invalid {key}")
    if "radius_km" in arguments:
        radius = float(arguments["radius_km"])
        if not 0.1 <= radius <= 200:
            raise ValueError("radius_km must be between 0.1 and 200")
        arguments["radius_km"] = radius
    if "period" in arguments and arguments["period"] not in {"all", "today", "week", "month"}:
        raise ValueError("Invalid expense period")
    if "category" in arguments and arguments["category"] not in SUPPORTED_CATEGORIES:
        raise ValueError("Invalid expense category")
    return arguments


def _execute_agent_tool(db: Session, business_id: str, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    args = _validate_tool_arguments(tool_name, arguments)
    if tool_name == "get_dashboard_summary":
        return get_dashboard_summary(db, business_id)
    if tool_name == "get_active_trips":
        trips = get_active_trips(db, business_id)
        return {"trips": trips, "count": len(trips)}
    if tool_name == "get_trip_stock":
        return get_trip_stock(db, args["trip_id"], business_id)
    if tool_name == "get_pending_orders":
        orders = get_pending_orders(db, business_id)
        return {"orders": orders, "count": len(orders)}
    if tool_name == "get_customer_balance_info":
        return get_customer_balance_info(db, args["customer_id"], business_id)
    if tool_name == "get_customers_with_pending_payments":
        return {"customers": get_customers_with_pending_payments(db, business_id)}
    if tool_name == "get_profit_report":
        return get_profit_report(db, business_id)
    if tool_name == "get_expenses":
        return get_expenses(db, business_id, args.get("period", "all"), args.get("category"))
    if tool_name == "get_wastage":
        return get_wastage(db, business_id, args.get("trip_id"))
    if tool_name == "find_nearby_businesses":
        return find_nearby_businesses(db, business_id, args.get("trip_id"), args.get("radius_km", 50.0))
    if tool_name == "get_truck_location":
        return get_truck_location(db, args["trip_id"], business_id)
    if tool_name == "get_order_details":
        return get_order_details(db, args["order_id"], business_id)
    raise ValueError("Unknown tool")


def _openai_message_dict(message: Any) -> Dict[str, Any]:
    if isinstance(message, dict):
        return message
    result = {"role": "assistant", "content": getattr(message, "content", None)}
    calls = getattr(message, "tool_calls", None)
    if calls:
        result["tool_calls"] = [{"id": call.id, "type": "function", "function": {"name": call.function.name, "arguments": call.function.arguments}} for call in calls]
    return result


def generate_ai_response_with_openrouter(
    message: str,
    business_id: str,
    db: Session,
    language: Optional[str] = None,
    context: Optional[Any] = None,
    fallback_result: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    client = _get_openrouter_client()
    if not client:
        raise ValueError("OpenRouter API key not configured")
    fallback_result = fallback_result or select_tool_and_execute(db, business_id, message, language, context)
    detected_language = fallback_result.get("language") or detect_language(message, language)["language"]
    deterministic_answer = generate_natural_response(fallback_result, message, detected_language)
    model = getattr(settings, "AI_MODEL", "openai/gpt-3.5-turbo") or "openai/gpt-3.5-turbo"
    system_prompt = (
        "You are a multilingual business assistant. Respond only with facts returned by the safe backend tools. "
        f"Answer in language code {detected_language}. Preserve names, IDs, currency, and numbers exactly. "
        "Never invent data, SQL, tools, or arguments. Ask for a missing identifier instead of guessing."
    )
    messages: List[Dict[str, Any]] = [{"role": "system", "content": system_prompt}]
    if context:
        messages.append({"role": "system", "content": json.dumps({"recent_context": context.get_context()}, default=str)})
    messages.append({"role": "user", "content": message})
    used_tools: List[str] = []
    for _ in range(MAX_TOOL_ITERATIONS):
        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            tools=AGENT_TOOL_DEFINITIONS,
            tool_choice="auto",
            temperature=0.0,
            max_tokens=500,
        )
        assistant = completion.choices[0].message
        calls = getattr(assistant, "tool_calls", None) or (assistant.get("tool_calls") if isinstance(assistant, dict) else None)
        if not calls:
            if used_tools:
                return {"answer": getattr(assistant, "content", None) or assistant.get("content") or deterministic_answer, "tool_used": ",".join(used_tools), "data_source": "database", "provider": "openrouter", "model": model, "language": detected_language}
            return {"answer": deterministic_answer, "tool_used": fallback_result.get("tool", "unknown"), "data_source": "database", "provider": "fallback", "model": model, "language": detected_language}
        messages.append(_openai_message_dict(assistant))
        for call in calls:
            name = call.function.name if hasattr(call, "function") else call["function"]["name"]
            raw_arguments = call.function.arguments if hasattr(call, "function") else call["function"].get("arguments", "{}")
            call_id = call.id if hasattr(call, "id") else call.get("id", name)
            try:
                arguments = json.loads(raw_arguments or "{}")
                data = _execute_agent_tool(db, business_id, name, arguments)
                used_tools.append(name)
                messages.append({"role": "tool", "tool_call_id": call_id, "name": name, "content": json.dumps(data, default=str)})
            except (ValueError, TypeError, KeyError, json.JSONDecodeError) as exc:
                logger.warning("Rejected AI tool call %s: %s", name, exc)
                raise ValueError("Invalid AI tool call") from exc
    raise ValueError("AI tool iteration limit reached")


def process_ai_chat(
    db: Session,
    business_id: str,
    message: str,
    language: Optional[str] = None,
) -> Dict[str, Any]:
    language_info = detect_language(message, language)
    context = get_conversation_context(business_id)
    tool_result = select_tool_and_execute(db, business_id, message, language_info["language"], context)
    deterministic_answer = generate_natural_response(tool_result, message, language_info["language"])
    provider = getattr(settings, "AI_PROVIDER", "")
    result: Dict[str, Any]
    if provider == "openrouter":
        try:
            result = generate_ai_response_with_openrouter(message, business_id, db, language_info["language"], context, tool_result)
        except Exception as exc:
            logger.warning("OpenRouter failed, using deterministic fallback: %s", exc)
            result = {"answer": deterministic_answer, "tool_used": tool_result.get("tool", "unknown"), "data_source": "database", "provider": "fallback", "model": None, "language": language_info["language"]}
    else:
        result = {"answer": deterministic_answer, "tool_used": tool_result.get("tool", "unknown"), "data_source": "database", "provider": "deterministic", "model": None, "language": language_info["language"]}
    context.add_turn(message, tool_result.get("intent", "GENERAL_BUSINESS_QUERY"), tool_result.get("entities", {}), {"tool": result.get("tool_used"), "data": tool_result.get("data")})
    return result
