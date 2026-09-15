from typing import List
from decimal import Decimal
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.wastage import WastageCreate, WastageResponse
from app.models.wastage import Wastage
from app.models.trip import Trip, TripStockLoad
from app.models.order import Order
from app.services.auth_service import get_current_user_and_business

router = APIRouter(tags=["Wastage / Loss"])

@router.get("/trips/{trip_id}/wastage", response_model=List[WastageResponse])
def list_trip_wastage(
    trip_id: str,
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.business_id == business.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    return db.query(Wastage).filter(Wastage.trip_id == trip_id).order_by(Wastage.recorded_at.desc()).all()

@router.post("/trips/{trip_id}/wastage", response_model=WastageResponse, status_code=status.HTTP_201_CREATED)
def record_trip_wastage(
    trip_id: str,
    wastage_in: WastageCreate,
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.business_id == business.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if wastage_in.quantity_kg <= Decimal("0.000"):
        raise HTTPException(status_code=400, detail="Wastage quantity kg must be strictly positive")

    # Check loaded stock & remaining available stock on active trip
    stock_load = db.query(TripStockLoad).filter(TripStockLoad.trip_id == trip.id).first()
    if stock_load:
        total_loaded_kg = Decimal(str(stock_load.loaded_quantity_kg))

        existing_orders = db.query(Order).filter(
            Order.trip_id == trip.id,
            Order.status != "cancelled"
        ).all()
        existing_orders_qty = sum(Decimal(str(o.quantity_kg)) for o in existing_orders)

        existing_wastage = db.query(Wastage).filter(Wastage.trip_id == trip.id).all()
        existing_wastage_qty = sum(Decimal(str(w.quantity_kg)) for w in existing_wastage)

        available_stock = total_loaded_kg - existing_orders_qty - existing_wastage_qty

        if wastage_in.quantity_kg > available_stock:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot record wastage of {wastage_in.quantity_kg} kg. Only {max(Decimal('0.000'), available_stock)} kg chicken remaining on active trip."
            )

    wastage = Wastage(
        trip_id=trip.id,
        quantity_kg=wastage_in.quantity_kg,
        reason=wastage_in.reason,
        recorded_at=datetime.utcnow(),
        notes=wastage_in.notes
    )
    db.add(wastage)
    db.commit()
    db.refresh(wastage)
    return wastage
