from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.report import ProfitReportResponse, DashboardSummaryResponse
from app.models.trip import Trip
from app.services.auth_service import get_current_user_and_business
from app.services.profit_service import calculate_trip_profitability, calculate_business_overall_profit
from app.services.dashboard_service import calculate_dashboard_summary

router = APIRouter(tags=["Reports & Dashboard"])

@router.get("/trips/{trip_id}/summary", response_model=ProfitReportResponse)
def get_trip_profit_report(
    trip_id: str,
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.business_id == business.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    res = calculate_trip_profitability(db, trip_id)
    return ProfitReportResponse(**res)

@router.get("/reports/profit", response_model=ProfitReportResponse)
def get_overall_profit_report(
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data
    res = calculate_business_overall_profit(db, business.id)
    return ProfitReportResponse(**res)

@router.get("/dashboard/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    current_data=Depends(get_current_user_and_business),
    db: Session = Depends(get_db)
):
    _, business = current_data
    return DashboardSummaryResponse(**calculate_dashboard_summary(db, business.id))
