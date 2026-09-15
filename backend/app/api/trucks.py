from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.truck import TruckCreate, TruckUpdate, TruckResponse
from app.models.truck import Truck
from app.services.auth_service import get_current_user_and_business

router = APIRouter(prefix="/trucks", tags=["Trucks"])

@router.get("", response_model=List[TruckResponse])
def list_trucks(
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data
    return db.query(Truck).filter(Truck.business_id == business.id).all()

@router.post("", response_model=TruckResponse, status_code=status.HTTP_201_CREATED)
def create_truck(
    truck_in: TruckCreate,
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data
    truck = Truck(
        business_id=business.id,
        registration_number=truck_in.registration_number,
        status=truck_in.status,
        notes=truck_in.notes
    )
    db.add(truck)
    db.commit()
    db.refresh(truck)
    return truck

@router.put("/{truck_id}", response_model=TruckResponse)
def update_truck(
    truck_id: str,
    truck_in: TruckUpdate,
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data
    truck = db.query(Truck).filter(Truck.id == truck_id, Truck.business_id == business.id).first()
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")

    if truck_in.registration_number is not None:
        truck.registration_number = truck_in.registration_number
    if truck_in.status is not None:
        truck.status = truck_in.status
    if truck_in.notes is not None:
        truck.notes = truck_in.notes

    db.commit()
    db.refresh(truck)
    return truck
