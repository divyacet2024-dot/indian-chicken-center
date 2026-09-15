from decimal import Decimal
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.trip import Trip, TripStockLoad
from app.models.order import Order
from app.models.expense import Expense
from app.models.wastage import Wastage

def calculate_trip_profitability(
    db: Session,
    trip_id: str,
    start_at: Optional[datetime] = None,
    end_at: Optional[datetime] = None,
) -> Dict[str, Any]:
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise ValueError("Trip not found")

    # 1. Stock cost for delivered and wasted stock only. Reserved stock is not revenue yet.
    stock_load = db.query(TripStockLoad).filter(TripStockLoad.trip_id == trip_id).first()
    cost_per_kg = Decimal(str(stock_load.purchase_price_per_kg)) if stock_load else Decimal("0.00")

    # 2. Delivered sales revenue and cost of delivered stock
    orders = db.query(Order).filter(
        Order.trip_id == trip_id,
        Order.status == "delivered",
    ).all()
    if start_at is not None:
        orders = [
            order for order in orders
            if order.delivered_at is not None
            and start_at <= order.delivered_at < end_at
        ]
    sales_revenue = sum(Decimal(str(o.total_amount)) for o in orders)
    delivered_cost = sum(Decimal(str(o.quantity_kg)) for o in orders) * cost_per_kg

    # 3. Itemized Expenses
    trip_expenses = db.query(Expense).filter(Expense.trip_id == trip_id).all()
    if start_at is not None:
        trip_expenses = [
            expense for expense in trip_expenses
            if expense.expense_date is not None
            and start_at <= expense.expense_date < end_at
        ]
    fuel_exp = sum(Decimal(str(e.amount)) for e in trip_expenses if e.category == "fuel")
    labour_exp = sum(Decimal(str(e.amount)) for e in trip_expenses if e.category == "labour")
    maint_exp = sum(Decimal(str(e.amount)) for e in trip_expenses if e.category in ["maintenance", "vehicle_maintenance"])
    food_exp = sum(Decimal(str(e.amount)) for e in trip_expenses if e.category == "food")
    other_exp = sum(Decimal(str(e.amount)) for e in trip_expenses if e.category == "other")
    total_expenses = fuel_exp + labour_exp + maint_exp + food_exp + other_exp

    # 4. Transportation Wastage / Stock Loss
    wastage_records = db.query(Wastage).filter(Wastage.trip_id == trip_id).all()
    if start_at is not None:
        wastage_records = [
            record for record in wastage_records
            if record.recorded_at is not None
            and start_at <= record.recorded_at < end_at
        ]
    total_wastage_kg = sum(Decimal(str(w.quantity_kg)) for w in wastage_records)
    wastage_cost = total_wastage_kg * cost_per_kg

    # 5. Net Profit
    net_profit = sales_revenue - delivered_cost - total_expenses - wastage_cost

    formula_str = (
        f"Sales Revenue (₹{sales_revenue}) - Delivered Stock Cost (₹{delivered_cost}) - "
        f"Expenses (₹{total_expenses}) - Wastage Loss (₹{wastage_cost}) = Net Profit (₹{net_profit})"
    )

    return {
        "sales_revenue": sales_revenue,
        "purchase_cost": delivered_cost,
        "fuel_expense": fuel_exp,
        "labour_expense": labour_exp,
        "maintenance_expense": maint_exp,
        "food_expense": food_exp,
        "other_expenses": other_exp,
        "total_expenses": total_expenses,
        "total_wastage_kg": total_wastage_kg,
        "wastage_cost": wastage_cost,
        "net_profit": net_profit,
        "profit_margin": ((net_profit / sales_revenue * Decimal("100")).quantize(Decimal("0.01"))) if sales_revenue else Decimal("0.00"),
        "formula_audit": formula_str
    }

def calculate_business_overall_profit(
    db: Session,
    business_id: str,
    start_at: Optional[datetime] = None,
    end_at: Optional[datetime] = None,
) -> Dict[str, Any]:
    # Aggregate the same trip formula across the business.
    trips = db.query(Trip).filter(Trip.business_id == business_id).all()
    total_revenue = Decimal("0.00")
    total_purchase_cost = Decimal("0.00")
    total_fuel = Decimal("0.00")
    total_labour = Decimal("0.00")
    total_maint = Decimal("0.00")
    total_food = Decimal("0.00")
    total_other = Decimal("0.00")
    total_wastage_kg = Decimal("0.000")
    total_wastage_cost = Decimal("0.00")

    for trip in trips:
        res = calculate_trip_profitability(db, trip.id, start_at=start_at, end_at=end_at)
        total_revenue += res["sales_revenue"]
        total_purchase_cost += res["purchase_cost"]
        total_fuel += res["fuel_expense"]
        total_labour += res["labour_expense"]
        total_maint += res["maintenance_expense"]
        total_food += res["food_expense"]
        total_other += res["other_expenses"]
        total_wastage_kg += res["total_wastage_kg"]
        total_wastage_cost += res["wastage_cost"]

    total_exp = total_fuel + total_labour + total_maint + total_food + total_other
    net_profit = total_revenue - total_purchase_cost - total_exp - total_wastage_cost

    return {
        "sales_revenue": total_revenue,
        "purchase_cost": total_purchase_cost,
        "fuel_expense": total_fuel,
        "labour_expense": total_labour,
        "maintenance_expense": total_maint,
        "food_expense": total_food,
        "other_expenses": total_other,
        "total_expenses": total_exp,
        "total_wastage_kg": total_wastage_kg,
        "wastage_cost": total_wastage_cost,
        "net_profit": net_profit,
        "profit_margin": ((net_profit / total_revenue * Decimal("100")).quantize(Decimal("0.01"))) if total_revenue else Decimal("0.00"),
        "formula_audit": f"Revenue (₹{total_revenue}) - Delivered Stock Cost (₹{total_purchase_cost}) - Expenses (₹{total_exp}) - Wastage (₹{total_wastage_cost}) = ₹{net_profit}"
    }
