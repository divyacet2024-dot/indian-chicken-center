import uuid
from datetime import datetime
from sqlalchemy import Column, String, ForeignKey, DateTime, Numeric
from app.database import Base

class NearbyBusiness(Base):
    __tablename__ = "nearby_businesses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id = Column(String(36), ForeignKey("businesses.id"), nullable=False, index=True)
    shop_name = Column(String(255), nullable=False)
    business_type = Column(String(50), nullable=False, default="chicken_shop")  # chicken_shop, meat_shop, restaurant, hotel, other
    contact_number = Column(String(50), nullable=False)
    address = Column(String(255), nullable=True)
    latitude = Column(Numeric(10, 7), nullable=False)
    longitude = Column(Numeric(10, 7), nullable=False)
    notes = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
