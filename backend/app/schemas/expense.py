from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from decimal import Decimal
from datetime import datetime

class ExpenseCreate(BaseModel):
    category: str = Field(..., description="fuel, labour, vehicle_maintenance, food, other")
    amount: Optional[Decimal] = Field(default=None, ge=Decimal("0.00"))
    quantity: Optional[Decimal] = Field(default=None, ge=Decimal("0.000"))  # litres for fuel
    unit_price: Optional[Decimal] = Field(default=None, ge=Decimal("0.00"))  # price per litre for fuel
    description: Optional[str] = None
    trip_id: Optional[str] = None

class ExpenseResponse(BaseModel):
    id: str
    business_id: str
    trip_id: Optional[str] = None
    category: str
    amount: Decimal
    quantity: Optional[Decimal] = None
    unit_price: Optional[Decimal] = None
    description: Optional[str] = None
    expense_date: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
