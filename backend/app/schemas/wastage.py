from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from decimal import Decimal
from datetime import datetime

class WastageCreate(BaseModel):
    quantity_kg: Decimal = Field(..., gt=Decimal("0.000"))
    reason: str = Field(..., description="transit_loss, dead_chicken, damaged_stock, other")
    notes: Optional[str] = None

class WastageResponse(BaseModel):
    id: str
    trip_id: str
    quantity_kg: Decimal
    reason: str
    recorded_at: datetime
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
