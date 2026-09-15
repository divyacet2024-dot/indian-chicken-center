from pydantic import BaseModel
from decimal import Decimal
from typing import Optional, List

class ProfitReportResponse(BaseModel):
    sales_revenue: Decimal
    purchase_cost: Decimal
    fuel_expense: Decimal
    labour_expense: Decimal
    maintenance_expense: Decimal
    food_expense: Decimal
    other_expenses: Decimal
    total_expenses: Decimal
    total_wastage_kg: Decimal
    wastage_cost: Decimal
    net_profit: Decimal
    profit_margin: Decimal
    formula_audit: str

class DashboardSummaryResponse(BaseModel):
    today_sales: Decimal
    today_expenses: Decimal
    today_profit: Decimal
    available_stock_kg: Decimal
    today_loss_kg: Decimal
    outstanding_balance_total: Decimal
    active_trips_count: int
    active_trucks_count: int
    today_orders_count: int
