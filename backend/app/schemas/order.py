from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from decimal import Decimal
from datetime import datetime

class OrderCreate(BaseModel):
    trip_id: str
    customer_id: str
    quantity_kg: Decimal = Field(..., gt=Decimal("0.000"))
    selling_price_per_kg: Decimal = Field(..., gt=Decimal("0.00"))
    requested_delivery_time: Optional[datetime] = None
    notes: Optional[str] = None

class OrderUpdate(BaseModel):
    quantity_kg: Optional[Decimal] = Field(default=None, gt=Decimal("0.000"))
    selling_price_per_kg: Optional[Decimal] = Field(default=None, gt=Decimal("0.00"))
    status: Optional[str] = None
    delivery_status: Optional[str] = None
    requested_delivery_time: Optional[datetime] = None
    notes: Optional[str] = None

class OrderResponse(BaseModel):
    id: str
    business_id: str
    trip_id: str
    customer_id: str
    customer_name: Optional[str] = None
    shop_name: Optional[str] = None
    quantity_kg: Decimal
    selling_price_per_kg: Decimal
    total_amount: Decimal
    status: str
    ordered_at: datetime
    delivered_at: Optional[datetime] = None
    requested_delivery_time: Optional[datetime] = None
    delivery_status: str = "pending"
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
