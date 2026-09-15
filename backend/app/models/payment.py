import uuid
from datetime import datetime
from sqlalchemy import Column, String, ForeignKey, DateTime, Numeric
from app.database import Base

class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id = Column(String(36), ForeignKey("businesses.id"), nullable=False, index=True)
    customer_id = Column(String(36), ForeignKey("customers.id"), nullable=False, index=True)

    amount = Column(Numeric(12, 2), nullable=False)
    payment_method = Column(String(50), nullable=False, default="UPI")  # cash, UPI, bank, other
    payment_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    reference = Column(String(100), nullable=True)
    comments = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
