import uuid
from datetime import datetime
from sqlalchemy import Column, String, ForeignKey, DateTime, Numeric
from app.database import Base

class Wastage(Base):
    __tablename__ = "wastage_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    trip_id = Column(String(36), ForeignKey("trips.id"), nullable=False, index=True)
    quantity_kg = Column(Numeric(10, 3), nullable=False)
    reason = Column(String(100), nullable=False)  # transit_loss, dead_chicken, damaged_stock, other
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    notes = Column(String(255), nullable=True)
