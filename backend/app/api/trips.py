from typing import List
from decimal import Decimal
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.trip import (
    TripCreate,
    TripUpdate,
    TripResponse,
    StockLoadResponse
)
from app.schemas.location import (
    TripLocationCreate,
    TripLocationResponse,
    NearbyOrderResponse
)
from app.models.trip import Trip, TripStockLoad, TripLocation
from app.models.truck import Truck
from app.models.order import Order
from app.models.expense import Expense
from app.models.wastage import Wastage
from app.services.auth_service import get_current_user_and_business
from app.services.location_service import find_nearby_pending_orders
from app.services.stock_service import get_trip_stock

router = APIRouter(prefix="/trips", tags=["Trips"])

def _build_trip_response(db: Session, trip: Trip) -> TripResponse:
    stock_load = db.query(TripStockLoad).filter(TripStockLoad.trip_id == trip.id).first()
    stock_load_resp = StockLoadResponse.model_validate(stock_load) if stock_load else None

    stock = get_trip_stock(db, trip.id, trip.business_id)
    delivered_kg = stock["delivered_kg"]
    wastage_kg = stock["wastage_kg"]
    remaining_kg = stock["remaining_kg"]

    resp = TripResponse.model_validate(trip)
    resp.stock_load = stock_load_resp
    resp.delivered_quantity_kg = delivered_kg
    resp.wastage_quantity_kg = wastage_kg
    resp.remaining_quantity_kg = remaining_kg
    return resp

@router.get("", response_model=List[TripResponse])
def list_trips(
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data
    trips = db.query(Trip).filter(Trip.business_id == business.id).order_by(Trip.started_at.desc()).all()
    return [_build_trip_response(db, t) for t in trips]

@router.post("", response_model=TripResponse, status_code=status.HTTP_201_CREATED)
def create_trip(
    trip_in: TripCreate,
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data
    truck = db.query(Truck).filter(Truck.id == trip_in.truck_id, Truck.business_id == business.id).first()
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")

    with db.begin_nested():
        # Create Trip
        trip = Trip(
            business_id=business.id,
            truck_id=truck.id,
            starting_location=trip_in.starting_location,
            destination=trip_in.destination,
            status="active",
            started_at=datetime.utcnow()
        )
        db.add(trip)
        db.flush()

        # Update Truck status
        truck.status = "on_trip"

        # Record Stock Load if provided
        if trip_in.stock_load:
            load_in = trip_in.stock_load
            if load_in.loaded_quantity_kg <= Decimal("0.000") or load_in.purchase_price_per_kg <= Decimal("0.00"):
                raise HTTPException(status_code=400, detail="Stock quantity and purchase price must be positive")

            purchase_total = load_in.loaded_quantity_kg * load_in.purchase_price_per_kg
            stock_load = TripStockLoad(
                trip_id=trip.id,
                loaded_quantity_kg=load_in.loaded_quantity_kg,
                purchase_price_per_kg=load_in.purchase_price_per_kg,
                purchase_total=purchase_total,
                loading_location=load_in.loading_location or trip_in.starting_location,
                loaded_at=datetime.utcnow()
            )
            db.add(stock_load)

        # Record Initial Fuel Expense if provided
        if trip_in.initial_fuel_litres and trip_in.initial_fuel_price_per_litre:
            if trip_in.initial_fuel_litres <= Decimal("0.000") or trip_in.initial_fuel_price_per_litre <= Decimal("0.00"):
                raise HTTPException(status_code=400, detail="Fuel litres and rate per litre must be positive")

            fuel_cost = trip_in.initial_fuel_litres * trip_in.initial_fuel_price_per_litre
            expense = Expense(
                business_id=business.id,
                trip_id=trip.id,
                category="fuel",
                amount=fuel_cost,
                quantity=trip_in.initial_fuel_litres,
                unit_price=trip_in.initial_fuel_price_per_litre,
                description=f"Initial trip fuel fill ({trip_in.initial_fuel_litres} L @ ₹{trip_in.initial_fuel_price_per_litre}/L)"
            )
            db.add(expense)

    db.commit()
    db.refresh(trip)
    return _build_trip_response(db, trip)

@router.get("/{trip_id}", response_model=TripResponse)
def get_trip(
    trip_id: str,
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.business_id == business.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return _build_trip_response(db, trip)

@router.put("/{trip_id}", response_model=TripResponse)
def update_trip(
    trip_id: str,
    trip_in: TripUpdate,
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.business_id == business.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if trip_in.starting_location is not None:
        trip.starting_location = trip_in.starting_location
    if trip_in.destination is not None:
        trip.destination = trip_in.destination
    if trip_in.status is not None:
        trip.status = trip_in.status
    if trip_in.notes is not None:
        trip.notes = trip_in.notes

    db.commit()
    db.refresh(trip)
    return _build_trip_response(db, trip)

@router.post("/{trip_id}/complete", response_model=TripResponse)
def complete_trip(
    trip_id: str,
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.business_id == business.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    trip.status = "completed"
    trip.completed_at = datetime.utcnow()

    # Update Truck status
    truck = db.query(Truck).filter(Truck.id == trip.truck_id, Truck.business_id == business.id).first()
    if truck:
        truck.status = "available"

    db.commit()
    db.refresh(trip)
    return _build_trip_response(db, trip)

@router.post("/{trip_id}/location", response_model=TripLocationResponse, status_code=status.HTTP_201_CREATED)
def record_trip_location(
    trip_id: str,
    location_in: TripLocationCreate,
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.business_id == business.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    loc = TripLocation(
        trip_id=trip.id,
        latitude=Decimal(str(location_in.latitude)),
        longitude=Decimal(str(location_in.longitude)),
        location_name=location_in.location_name,
        recorded_at=datetime.utcnow()
    )
    db.add(loc)

    # Optionally update trip status if provided (e.g. distributing, returning, stopped_delayed)
    if location_in.status:
        trip.status = location_in.status

    db.commit()
    db.refresh(loc)
    return TripLocationResponse.model_validate(loc)

@router.get("/{trip_id}/location", response_model=TripLocationResponse)
def get_latest_trip_location(
    trip_id: str,
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.business_id == business.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    latest_loc = db.query(TripLocation).filter(TripLocation.trip_id == trip.id).order_by(TripLocation.recorded_at.desc()).first()
    if not latest_loc:
        raise HTTPException(status_code=404, detail="No recorded locations for this trip")

    return TripLocationResponse.model_validate(latest_loc)

@router.get("/{trip_id}/nearby-orders", response_model=List[NearbyOrderResponse])
def get_nearby_pending_orders(
    trip_id: str,
    radius_km: float = 100.0,
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.business_id == business.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    latest_loc = db.query(TripLocation).filter(TripLocation.trip_id == trip.id).order_by(TripLocation.recorded_at.desc()).first()
    if not latest_loc:
        raise HTTPException(status_code=400, detail="No location recorded for this trip yet")

    truck_lat = float(latest_loc.latitude)
    truck_lng = float(latest_loc.longitude)

    nearby_orders = find_nearby_pending_orders(db, business.id, truck_lat, truck_lng, radius_km)
    return nearby_orders
