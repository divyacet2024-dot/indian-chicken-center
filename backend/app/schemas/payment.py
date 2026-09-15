from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from decimal import Decimal
from datetime import datetime

class PaymentCreate(BaseModel):
    amount: Decimal = Field(..., gt=Decimal("0.00"))
    payment_method: str = Field(default="UPI", description="cash, UPI, bank, other")
    reference: Optional[str] = None
    comments: Optional[str] = None

class PaymentResponse(BaseModel):
    id: str
    business_id: str
    customer_id: str
    amount: Decimal
    payment_method: str
    payment_date: datetime
    reference: Optional[str] = None
    comments: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
