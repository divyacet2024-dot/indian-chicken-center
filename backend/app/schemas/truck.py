from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class TruckCreate(BaseModel):
    registration_number: str = Field(..., min_length=2, max_length=100)
    status: str = Field(default="available")
    notes: Optional[str] = None

class TruckUpdate(BaseModel):
    registration_number: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class TruckResponse(BaseModel):
    id: str
    business_id: str
    registration_number: str
    status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
