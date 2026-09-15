from typing import List
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.nearby_business import (
    NearbyBusinessCreate,
    NearbyBusinessResponse,
    NearbyBusinessDistanceResponse
)
from app.models.nearby_business import NearbyBusiness
from app.models.trip import Trip, TripLocation
from app.services.auth_service import get_current_user_and_business
from app.services.location_service import find_nearby_potential_businesses

router = APIRouter(prefix="/nearby-businesses", tags=["Nearby Potential Buyers"])

@router.get("", response_model=List[NearbyBusinessResponse])
def list_nearby_businesses(
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data
    businesses = db.query(NearbyBusiness).filter(NearbyBusiness.business_id == business.id).order_by(NearbyBusiness.created_at.desc()).all()
    return [NearbyBusinessResponse.model_validate(b) for b in businesses]

@router.post("", response_model=NearbyBusinessResponse, status_code=status.HTTP_201_CREATED)
def create_nearby_business(
    biz_in: NearbyBusinessCreate,
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data

    nearby_biz = NearbyBusiness(
        business_id=business.id,
        shop_name=biz_in.shop_name,
        business_type=biz_in.business_type,
        contact_number=biz_in.contact_number,
        address=biz_in.address,
        latitude=Decimal(str(biz_in.latitude)),
        longitude=Decimal(str(biz_in.longitude)),
        notes=biz_in.notes
    )
    db.add(nearby_biz)
    db.commit()
    db.refresh(nearby_biz)
    return NearbyBusinessResponse.model_validate(nearby_biz)

@router.get("/near-trip/{trip_id}", response_model=List[NearbyBusinessDistanceResponse])
def get_nearby_businesses_near_trip(
    trip_id: str,
    radius_km: float = 50.0,
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.business_id == business.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    latest_loc = db.query(TripLocation).filter(TripLocation.trip_id == trip.id).order_by(TripLocation.recorded_at.desc()).first()
    if not latest_loc:
        raise HTTPException(status_code=400, detail="No GPS location recorded for this trip yet")

    truck_lat = float(latest_loc.latitude)
    truck_lng = float(latest_loc.longitude)

    nearby_buyers = find_nearby_potential_businesses(db, business.id, truck_lat, truck_lng, radius_km)
    return nearby_buyers
