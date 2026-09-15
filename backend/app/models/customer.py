import uuid
from datetime import datetime
from sqlalchemy import Column, String, ForeignKey, DateTime, Numeric
from app.database import Base

class Customer(Base):
    __tablename__ = "customers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id = Column(String(36), ForeignKey("businesses.id"), nullable=False, index=True)
    shop_name = Column(String(255), nullable=False)
    customer_name = Column(String(255), nullable=False)
    contact_number = Column(String(50), nullable=False)
    address = Column(String(255), nullable=True)
    opening_balance = Column(Numeric(12, 2), default=0.00, nullable=False)
    latitude = Column(Numeric(10, 7), nullable=True)
    longitude = Column(Numeric(10, 7), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
