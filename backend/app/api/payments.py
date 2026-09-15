from typing import List
from decimal import Decimal
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.payment import PaymentCreate, PaymentResponse
from app.models.payment import Payment
from app.models.customer import Customer
from app.services.auth_service import get_current_user_and_business

router = APIRouter(tags=["Payments"])

@router.get("/customers/{customer_id}/payments", response_model=List[PaymentResponse])
def list_customer_payments(
    customer_id: str,
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data
    customer = db.query(Customer).filter(Customer.id == customer_id, Customer.business_id == business.id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    return db.query(Payment).filter(
        Payment.customer_id == customer_id,
        Payment.business_id == business.id,
    ).order_by(Payment.payment_date.desc()).all()

@router.post("/customers/{customer_id}/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def record_customer_payment(
    customer_id: str,
    payment_in: PaymentCreate,
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data
    customer = db.query(Customer).filter(Customer.id == customer_id, Customer.business_id == business.id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    if payment_in.amount <= Decimal("0.00"):
        raise HTTPException(status_code=400, detail="Payment amount must be strictly positive")

    payment = Payment(
        business_id=business.id,
        customer_id=customer.id,
        amount=payment_in.amount,
        payment_method=payment_in.payment_method,
        payment_date=datetime.utcnow(),
        reference=payment_in.reference,
        comments=payment_in.comments
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment
