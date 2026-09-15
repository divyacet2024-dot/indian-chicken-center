from typing import List
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.customer import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerLedgerResponse
)
from app.models.customer import Customer
from app.services.auth_service import get_current_user_and_business
from app.services.ledger_service import get_customer_ledger_summary

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.get("", response_model=List[CustomerResponse])
def list_customers(
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data
    customers = db.query(Customer).filter(Customer.business_id == business.id).all()
    results = []
    for c in customers:
        summary = get_customer_ledger_summary(db, c.id, business.id)
        resp = CustomerResponse.model_validate(c)
        resp.current_balance = summary["current_balance"]
        resp.total_purchases = summary["total_purchases"]
        resp.total_payments = summary["total_payments"]
        results.append(resp)
    return results

@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    customer_in: CustomerCreate,
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data
    if customer_in.opening_balance < Decimal("0.00"):
        raise HTTPException(status_code=400, detail="Opening balance cannot be negative")

    customer = Customer(
        business_id=business.id,
        shop_name=customer_in.shop_name,
        customer_name=customer_in.customer_name,
        contact_number=customer_in.contact_number,
        address=customer_in.address,
        opening_balance=customer_in.opening_balance,
        latitude=Decimal(str(customer_in.latitude)) if customer_in.latitude is not None else None,
        longitude=Decimal(str(customer_in.longitude)) if customer_in.longitude is not None else None,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)

    summary = get_customer_ledger_summary(db, customer.id, business.id)
    resp = CustomerResponse.model_validate(customer)
    resp.current_balance = summary["current_balance"]
    return resp

@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(
    customer_id: str,
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data
    customer = db.query(Customer).filter(Customer.id == customer_id, Customer.business_id == business.id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    summary = get_customer_ledger_summary(db, customer.id, business.id)
    resp = CustomerResponse.model_validate(customer)
    resp.current_balance = summary["current_balance"]
    resp.total_purchases = summary["total_purchases"]
    resp.total_payments = summary["total_payments"]
    return resp

@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: str,
    customer_in: CustomerUpdate,
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data
    customer = db.query(Customer).filter(Customer.id == customer_id, Customer.business_id == business.id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    if customer_in.shop_name is not None:
        customer.shop_name = customer_in.shop_name
    if customer_in.customer_name is not None:
        customer.customer_name = customer_in.customer_name
    if customer_in.contact_number is not None:
        customer.contact_number = customer_in.contact_number
    if customer_in.address is not None:
        customer.address = customer_in.address
    if customer_in.opening_balance is not None:
        if customer_in.opening_balance < Decimal("0.00"):
            raise HTTPException(status_code=400, detail="Opening balance cannot be negative")
        customer.opening_balance = customer_in.opening_balance
    if customer_in.latitude is not None:
        customer.latitude = Decimal(str(customer_in.latitude))
    if customer_in.longitude is not None:
        customer.longitude = Decimal(str(customer_in.longitude))

    db.commit()
    db.refresh(customer)

    summary = get_customer_ledger_summary(db, customer.id, business.id)
    resp = CustomerResponse.model_validate(customer)
    resp.current_balance = summary["current_balance"]
    return resp

@router.get("/{customer_id}/ledger", response_model=CustomerLedgerResponse)
def get_customer_ledger(
    customer_id: str,
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data
    customer = db.query(Customer).filter(Customer.id == customer_id, Customer.business_id == business.id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    summary = get_customer_ledger_summary(db, customer.id, business.id)
    cust_resp = CustomerResponse.model_validate(customer)
    cust_resp.current_balance = summary["current_balance"]

    return CustomerLedgerResponse(
        customer=cust_resp,
        opening_balance=summary["opening_balance"],
        total_purchases=summary["total_purchases"],
        total_payments=summary["total_payments"],
        current_balance=summary["current_balance"],
        entries=summary["entries"]
    )
