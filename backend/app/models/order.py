import uuid
from datetime import datetime
from sqlalchemy import Column, String, ForeignKey, DateTime, Numeric
from app.database import Base

class Order(Base):
    __tablename__ = "orders"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id = Column(String(36), ForeignKey("businesses.id"), nullable=False, index=True)
    trip_id = Column(String(36), ForeignKey("trips.id"), nullable=False, index=True)
    customer_id = Column(String(36), ForeignKey("customers.id"), nullable=False, index=True)

    quantity_kg = Column(Numeric(10, 3), nullable=False)
    selling_price_per_kg = Column(Numeric(12, 2), nullable=False)
    total_amount = Column(Numeric(12, 2), nullable=False)

    status = Column(String(50), nullable=False, default="new")  # new, confirmed, out_for_delivery, delivered, cancelled
    requested_delivery_time = Column(DateTime, nullable=True)
    delivery_status = Column(String(50), nullable=False, default="pending", server_default="pending")
    ordered_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    delivered_at = Column(DateTime, nullable=True)
    notes = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
