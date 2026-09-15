from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class TripLocationCreate(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude between -90 and 90")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude between -180 and 180")
    location_name: Optional[str] = Field(None, max_length=255)
    status: Optional[str] = Field(None, description="Optional trip status update: active, distributing, returning, completed, stopped_delayed")

class TripLocationResponse(BaseModel):
    id: str
    trip_id: str
    latitude: float
    longitude: float
    location_name: Optional[str] = None
    recorded_at: datetime

    model_config = ConfigDict(from_attributes=True)

class NearbyOrderResponse(BaseModel):
    order_id: str
    customer_id: str
    shop_name: str
    customer_name: str
    contact_number: str
    address: Optional[str] = None
    quantity_kg: float
    selling_price_per_kg: float
    total_amount: float
    status: str
    distance_km: float
    customer_latitude: float
    customer_longitude: float

    model_config = ConfigDict(from_attributes=True)
