from typing import List
from decimal import Decimal
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.expense import ExpenseCreate, ExpenseResponse
from app.models.expense import Expense
from app.models.trip import Trip
from app.services.auth_service import get_current_user_and_business

router = APIRouter(tags=["Expenses"])

@router.get("/expenses", response_model=List[ExpenseResponse])
def list_business_expenses(
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data
    return db.query(Expense).filter(Expense.business_id == business.id).order_by(Expense.expense_date.desc()).all()

@router.get("/trips/{trip_id}/expenses", response_model=List[ExpenseResponse])
def list_trip_expenses(
    trip_id: str,
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.business_id == business.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    return db.query(Expense).filter(Expense.trip_id == trip_id).order_by(Expense.expense_date.desc()).all()

@router.post("/trips/{trip_id}/expenses", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_trip_expense(
    trip_id: str,
    expense_in: ExpenseCreate,
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.business_id == business.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # Fuel Calculation
    if expense_in.category == "fuel":
        if not expense_in.quantity or not expense_in.unit_price:
            raise HTTPException(status_code=400, detail="Fuel expense requires quantity (litres) and unit_price (price per litre)")
        if expense_in.quantity <= Decimal("0.000") or expense_in.unit_price <= Decimal("0.00"):
            raise HTTPException(status_code=400, detail="Litres and price per litre must be strictly positive")
        calc_amount = expense_in.quantity * expense_in.unit_price
    else:
        if not expense_in.amount or expense_in.amount <= Decimal("0.00"):
            raise HTTPException(status_code=400, detail="Expense amount must be strictly positive")
        calc_amount = expense_in.amount

    expense = Expense(
        business_id=business.id,
        trip_id=trip.id,
        category=expense_in.category,
        amount=calc_amount,
        quantity=expense_in.quantity if expense_in.category == "fuel" else None,
        unit_price=expense_in.unit_price if expense_in.category == "fuel" else None,
        description=expense_in.description,
        expense_date=datetime.utcnow()
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense
