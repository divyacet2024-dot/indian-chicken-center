import uuid
from datetime import datetime
from sqlalchemy import Column, String, ForeignKey, DateTime
from app.database import Base

class Truck(Base):
    __tablename__ = "trucks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id = Column(String(36), ForeignKey("businesses.id"), nullable=False, index=True)
    registration_number = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False, default="available")  # available, on_trip, returning, maintenance
    notes = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
