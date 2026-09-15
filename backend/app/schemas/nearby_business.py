from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class NearbyBusinessCreate(BaseModel):
    shop_name: str = Field(..., min_length=1, max_length=255)
    business_type: str = Field(default="chicken_shop", description="chicken_shop, meat_shop, restaurant, hotel, other")
    contact_number: str = Field(..., min_length=3, max_length=50)
    address: Optional[str] = Field(None, max_length=255)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    notes: Optional[str] = Field(None, max_length=255)

class NearbyBusinessResponse(BaseModel):
    id: str
    business_id: str
    shop_name: str
    business_type: str
    contact_number: str
    address: Optional[str] = None
    latitude: float
    longitude: float
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class NearbyBusinessDistanceResponse(NearbyBusinessResponse):
    distance_km: float
