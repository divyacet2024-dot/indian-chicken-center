from typing import List
from decimal import Decimal
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.order import OrderCreate, OrderUpdate, OrderResponse
from app.models.order import Order
from app.models.trip import Trip, TripStockLoad
from app.models.wastage import Wastage
from app.models.customer import Customer
from app.services.auth_service import get_current_user_and_business
from app.services.stock_service import get_trip_stock

router = APIRouter(prefix="/orders", tags=["Orders"])

def _build_order_response(db: Session, order: Order, business_id: str) -> OrderResponse:
    customer = db.query(Customer).filter(
        Customer.id == order.customer_id,
        Customer.business_id == business_id,
    ).first()
    resp = OrderResponse.model_validate(order)
    resp.customer_name = customer.customer_name if customer else None
    resp.shop_name = customer.shop_name if customer else None
    return resp

@router.get("", response_model=List[OrderResponse])
def list_orders(
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data
    orders = db.query(Order).filter(Order.business_id == business.id).order_by(Order.ordered_at.desc()).all()
    return [_build_order_response(db, o, business.id) for o in orders]

@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order_in: OrderCreate,
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data

    # Validate Trip & Customer belong to business
    trip = db.query(Trip).filter(Trip.id == order_in.trip_id, Trip.business_id == business.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    customer = db.query(Customer).filter(Customer.id == order_in.customer_id, Customer.business_id == business.id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    if order_in.quantity_kg <= Decimal("0.000") or order_in.selling_price_per_kg <= Decimal("0.00"):
        raise HTTPException(status_code=400, detail="Quantity and selling price must be strictly positive")

    if trip.status == "completed":
        raise HTTPException(status_code=400, detail="Cannot place an order on a completed trip")

    stock = get_trip_stock(db, trip.id, business.id)
    if order_in.quantity_kg > stock["remaining_kg"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot place order for {order_in.quantity_kg} kg. Only {max(Decimal('0.000'), stock['remaining_kg'])} kg chicken remaining on active trip."
        )

    # Calculated Total Amount
    total_amount = order_in.quantity_kg * order_in.selling_price_per_kg

    order = Order(
        business_id=business.id,
        trip_id=trip.id,
        customer_id=customer.id,
        quantity_kg=order_in.quantity_kg,
        selling_price_per_kg=order_in.selling_price_per_kg,
        total_amount=total_amount,
        status="out_for_delivery",
        delivery_status="pending",
        requested_delivery_time=order_in.requested_delivery_time,
        ordered_at=datetime.utcnow(),
        notes=order_in.notes
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return _build_order_response(db, order, business.id)

@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: str,
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data
    order = db.query(Order).filter(Order.id == order_id, Order.business_id == business.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return _build_order_response(db, order, business.id)

@router.put("/{order_id}", response_model=OrderResponse)
def update_order(
    order_id: str,
    order_in: OrderUpdate,
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data
    order = db.query(Order).filter(Order.id == order_id, Order.business_id == business.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order_in.quantity_kg is not None or order_in.selling_price_per_kg is not None:
        qty = order_in.quantity_kg if order_in.quantity_kg is not None else Decimal(str(order.quantity_kg))
        rate = order_in.selling_price_per_kg if order_in.selling_price_per_kg is not None else Decimal(str(order.selling_price_per_kg))
        if qty <= Decimal("0.000") or rate <= Decimal("0.00"):
            raise HTTPException(status_code=400, detail="Quantity and selling price must be strictly positive")
        order.quantity_kg = qty
        order.selling_price_per_kg = rate
        order.total_amount = qty * rate

    if order_in.status is not None:
        order.status = order_in.status
        if order_in.status == "delivered" and not order.delivered_at:
            order.delivered_at = datetime.utcnow()

    if order_in.delivery_status is not None:
        if order_in.delivery_status not in {"pending", "assigned", "out_for_delivery", "delivered", "cancelled"}:
            raise HTTPException(status_code=400, detail="Invalid delivery status")
        order.delivery_status = order_in.delivery_status

    if order_in.requested_delivery_time is not None:
        order.requested_delivery_time = order_in.requested_delivery_time

    if order_in.notes is not None:
        order.notes = order_in.notes

    db.commit()
    db.refresh(order)
    return _build_order_response(db, order, business.id)

@router.post("/{order_id}/deliver", response_model=OrderResponse)
def deliver_order(
    order_id: str,
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data
    order = db.query(Order).filter(Order.id == order_id, Order.business_id == business.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = "delivered"
    order.delivered_at = datetime.utcnow()

    db.commit()
    db.refresh(order)
    return _build_order_response(db, order, business.id)
