from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from decimal import Decimal
from datetime import datetime

class CustomerCreate(BaseModel):
    shop_name: str = Field(..., min_length=1, max_length=255)
    customer_name: str = Field(..., min_length=1, max_length=255)
    contact_number: str = Field(..., min_length=3, max_length=50)
    address: Optional[str] = None
    opening_balance: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    latitude: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(default=None, ge=-180.0, le=180.0)

class CustomerUpdate(BaseModel):
    shop_name: Optional[str] = None
    customer_name: Optional[str] = None
    contact_number: Optional[str] = None
    address: Optional[str] = None
    opening_balance: Optional[Decimal] = Field(default=None, ge=Decimal("0.00"))
    latitude: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(default=None, ge=-180.0, le=180.0)

class CustomerResponse(BaseModel):
    id: str
    business_id: str
    shop_name: str
    customer_name: str
    contact_number: str
    address: Optional[str] = None
    opening_balance: Decimal
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    current_balance: Decimal = Decimal("0.00")
    total_purchases: Decimal = Decimal("0.00")
    total_payments: Decimal = Decimal("0.00")
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class LedgerEntryResponse(BaseModel):
    id: str
    date: datetime
    type: str  # opening_balance, purchase, payment
    quantity_kg: Optional[Decimal] = None
    price_per_kg: Optional[Decimal] = None
    amount: Decimal
    running_balance: Decimal
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class CustomerLedgerResponse(BaseModel):
    customer: CustomerResponse
    opening_balance: Decimal
    total_purchases: Decimal
    total_payments: Decimal
    current_balance: Decimal
    entries: List[LedgerEntryResponse]

    model_config = ConfigDict(from_attributes=True)
