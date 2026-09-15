import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime
from app.database import Base

class Business(Base):
    __tablename__ = "businesses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_name = Column(String(255), nullable=False, default="Indian Chicken Center")
    owner_name = Column(String(255), nullable=False, default="Umarabba")
    contact_details = Column(String(255), nullable=True)
    google_account_reference = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
