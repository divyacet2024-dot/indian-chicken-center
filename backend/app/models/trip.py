import uuid
from datetime import datetime
from sqlalchemy import Column, String, ForeignKey, DateTime, Numeric
from app.database import Base

class Trip(Base):
    __tablename__ = "trips"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id = Column(String(36), ForeignKey("businesses.id"), nullable=False, index=True)
    truck_id = Column(String(36), ForeignKey("trucks.id"), nullable=False, index=True)
    starting_location = Column(String(255), nullable=False)
    destination = Column(String(255), nullable=False)
    # Trip status: active, distributing, returning, completed, stopped_delayed
    status = Column(String(50), nullable=False, default="active")
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    notes = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

class TripStockLoad(Base):
    __tablename__ = "trip_stock_loads"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    trip_id = Column(String(36), ForeignKey("trips.id"), nullable=False, index=True)
    loaded_quantity_kg = Column(Numeric(10, 3), nullable=False)
    purchase_price_per_kg = Column(Numeric(12, 2), nullable=False)
    purchase_total = Column(Numeric(12, 2), nullable=False)
    loading_location = Column(String(255), nullable=True)
    loaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class TripLocation(Base):
    __tablename__ = "trip_locations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    trip_id = Column(String(36), ForeignKey("trips.id"), nullable=False, index=True)
    latitude = Column(Numeric(10, 7), nullable=False)
    longitude = Column(Numeric(10, 7), nullable=False)
    location_name = Column(String(255), nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
