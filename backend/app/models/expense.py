import uuid
from datetime import datetime
from sqlalchemy import Column, String, ForeignKey, DateTime, Numeric
from app.database import Base

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id = Column(String(36), ForeignKey("businesses.id"), nullable=False, index=True)
    trip_id = Column(String(36), ForeignKey("trips.id"), nullable=True, index=True)

    category = Column(String(50), nullable=False)  # fuel, labour, vehicle_maintenance, food, other
    amount = Column(Numeric(12, 2), nullable=False)
    quantity = Column(Numeric(10, 3), nullable=True)  # litres for fuel
    unit_price = Column(Numeric(12, 2), nullable=True)  # price_per_litre for fuel
    description = Column(String(255), nullable=True)
    expense_date = Column(DateTime, default=datetime.utcnow, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
