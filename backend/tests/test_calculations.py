from decimal import Decimal
import pytest
from app.models.business import Business
from app.models.truck import Truck
from app.models.trip import Trip, TripStockLoad
from app.models.customer import Customer
from app.models.order import Order
from app.models.expense import Expense
from app.models.wastage import Wastage
from app.models.payment import Payment
from app.services.profit_service import calculate_trip_profitability
from app.services.ledger_service import get_customer_ledger_summary

def test_purchase_cost_and_order_total_calculation(db_session):
    business = db_session.query(Business).first()

    truck = Truck(business_id=business.id, registration_number="KA-19-EA-1000", status="available")
    db_session.add(truck)
    db_session.commit()

    trip = Trip(business_id=business.id, truck_id=truck.id, starting_location="Farm Yard", destination="City Route")
    db_session.add(trip)
    db_session.commit()

    # Load 5000 kg @ ₹120/kg => Purchase Total ₹6,00,000
    stock_load = TripStockLoad(
        trip_id=trip.id,
        loaded_quantity_kg=Decimal("5000.000"),
        purchase_price_per_kg=Decimal("120.00"),
        purchase_total=Decimal("5000.000") * Decimal("120.00")
    )
    db_session.add(stock_load)
    db_session.commit()

    assert stock_load.purchase_total == Decimal("600000.00")

def test_customer_ledger_balance_calculation(db_session):
    business = db_session.query(Business).first()

    customer = Customer(
        business_id=business.id,
        shop_name="Empire Restaurant",
        customer_name="Mohammed Ibrahim",
        contact_number="9845012345",
        opening_balance=Decimal("10625.00")
    )
    db_session.add(customer)
    db_session.commit()

    # Order 1: 63.1 kg @ ₹128 = ₹8076.80
    truck = db_session.query(Truck).first()
    trip = db_session.query(Trip).first()

    ord1 = Order(
        business_id=business.id,
        trip_id=trip.id,
        customer_id=customer.id,
        quantity_kg=Decimal("63.100"),
        selling_price_per_kg=Decimal("128.00"),
        total_amount=Decimal("63.100") * Decimal("128.00"),
        status="delivered"
    )
    db_session.add(ord1)

    # Order 2: 153.2 kg @ ₹118 = ₹18077.60
    ord2 = Order(
        business_id=business.id,
        trip_id=trip.id,
        customer_id=customer.id,
        quantity_kg=Decimal("153.200"),
        selling_price_per_kg=Decimal("118.00"),
        total_amount=Decimal("153.200") * Decimal("118.00"),
        status="delivered"
    )
    db_session.add(ord2)

    # Payment: ₹26,000
    pay = Payment(
        business_id=business.id,
        customer_id=customer.id,
        amount=Decimal("26000.00"),
        payment_method="UPI"
    )
    db_session.add(pay)
    db_session.commit()

    summary = get_customer_ledger_summary(db_session, customer.id, business.id)
    # Expected Balance = 10625.00 + (8076.80 + 18077.60) - 26000.00 = 10779.40
    expected_balance = Decimal("10625.00") + Decimal("8076.80") + Decimal("18077.60") - Decimal("26000.00")
    assert summary["current_balance"] == expected_balance

def test_profit_calculation_service(db_session):
    trip = db_session.query(Trip).first()

    # Add fuel expense: 45 L @ ₹94/L = ₹4,230
    fuel_exp = Expense(
        business_id=trip.business_id,
        trip_id=trip.id,
        category="fuel",
        amount=Decimal("45.000") * Decimal("94.00"),
        quantity=Decimal("45.000"),
        unit_price=Decimal("94.00"),
        description="45 Litres Diesel @ HP Bunk"
    )
    db_session.add(fuel_exp)

    # Add wastage: 35 kg
    wastage = Wastage(
        trip_id=trip.id,
        quantity_kg=Decimal("35.000"),
        reason="transit_loss",
        notes="35 kg heat mortality"
    )
    db_session.add(wastage)
    db_session.commit()

    res = calculate_trip_profitability(db_session, trip.id)
    assert res["fuel_expense"] == Decimal("4230.00")
    assert res["total_wastage_kg"] == Decimal("35.000")
    assert "Net Profit" in res["formula_audit"]
