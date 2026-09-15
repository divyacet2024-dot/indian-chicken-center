from decimal import Decimal
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.customer import Customer
from app.models.order import Order
from app.models.payment import Payment

def get_customer_ledger_summary(db: Session, customer_id: str, business_id: str) -> Dict[str, Any]:
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.business_id == business_id,
    ).first()
    if not customer:
        raise ValueError("Customer not found")

    opening_bal = Decimal(str(customer.opening_balance or "0.00"))

    # Purchases (orders)
    orders = db.query(Order).filter(
        Order.customer_id == customer_id,
        Order.business_id == business_id,
        Order.status != "cancelled"
    ).all()

    total_purchases = sum(Decimal(str(o.total_amount)) for o in orders)

    # Payments
    payments = db.query(Payment).filter(
        Payment.customer_id == customer_id
        , Payment.business_id == business_id
    ).all()

    total_payments = sum(Decimal(str(p.amount)) for p in payments)

    # Balance formula
    current_balance = opening_bal + total_purchases - total_payments

    # Build chronological timeline entries
    entries = []

    # Entry 1: Opening balance
    running = opening_bal
    entries.append({
        "id": f"op-{customer.id}",
        "date": customer.created_at,
        "type": "opening_balance",
        "quantity_kg": None,
        "price_per_kg": None,
        "amount": opening_bal,
        "running_balance": running,
        "notes": "Opening Balance Brought Forward"
    })

    # Combine orders & payments sorted by date
    timeline = []
    for o in orders:
        timeline.append({
            "id": o.id,
            "date": o.ordered_at,
            "type": "purchase",
            "quantity_kg": Decimal(str(o.quantity_kg)),
            "price_per_kg": Decimal(str(o.selling_price_per_kg)),
            "amount": Decimal(str(o.total_amount)),
            "notes": f"Order #{o.id[:8]} ({o.status})"
        })

    for p in payments:
        timeline.append({
            "id": p.id,
            "date": p.payment_date,
            "type": "payment",
            "quantity_kg": None,
            "price_per_kg": None,
            "amount": Decimal(str(p.amount)),
            "notes": f"Payment via {p.payment_method} - {p.comments or ''}"
        })

    timeline.sort(key=lambda x: x["date"])

    for item in timeline:
        if item["type"] == "purchase":
            running += item["amount"]
        elif item["type"] == "payment":
            running -= item["amount"]

        item["running_balance"] = running
        entries.append(item)

    return {
        "customer": customer,
        "opening_balance": opening_bal,
        "total_purchases": total_purchases,
        "total_payments": total_payments,
        "current_balance": current_balance,
        "entries": entries
    }
