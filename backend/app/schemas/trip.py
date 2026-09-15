from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from decimal import Decimal
from datetime import datetime

class StockLoadCreate(BaseModel):
    loaded_quantity_kg: Decimal = Field(..., gt=Decimal("0.000"))
    purchase_price_per_kg: Decimal = Field(..., gt=Decimal("0.00"))
    loading_location: Optional[str] = None

class TripCreate(BaseModel):
    truck_id: str
    starting_location: str = Field(..., min_length=1)
    destination: str = Field(..., min_length=1)
    stock_load: Optional[StockLoadCreate] = None
    initial_fuel_litres: Optional[Decimal] = Field(default=None, ge=Decimal("0.000"))
    initial_fuel_price_per_litre: Optional[Decimal] = Field(default=None, ge=Decimal("0.00"))

class TripUpdate(BaseModel):
    starting_location: Optional[str] = None
    destination: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class StockLoadResponse(BaseModel):
    id: str
    trip_id: str
    loaded_quantity_kg: Decimal
    purchase_price_per_kg: Decimal
    purchase_total: Decimal
    loading_location: Optional[str] = None
    loaded_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TripResponse(BaseModel):
    id: str
    business_id: str
    truck_id: str
    starting_location: str
    destination: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    stock_load: Optional[StockLoadResponse] = None
    delivered_quantity_kg: Decimal = Decimal("0.000")
    wastage_quantity_kg: Decimal = Decimal("0.000")
    remaining_quantity_kg: Decimal = Decimal("0.000")
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
