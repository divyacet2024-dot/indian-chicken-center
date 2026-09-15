from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.trucks import router as trucks_router
from app.api.customers import router as customers_router
from app.api.trips import router as trips_router
from app.api.orders import router as orders_router
from app.api.expenses import router as expenses_router
from app.api.wastage import router as wastage_router
from app.api.payments import router as payments_router
from app.api.reports import router as reports_router
from app.api.nearby_businesses import router as nearby_businesses_router
from app.api.ai import router as ai_router

api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(trucks_router)
api_router.include_router(customers_router)
api_router.include_router(trips_router)
api_router.include_router(orders_router)
api_router.include_router(expenses_router)
api_router.include_router(wastage_router)
api_router.include_router(payments_router)
api_router.include_router(reports_router)
api_router.include_router(nearby_businesses_router)
api_router.include_router(ai_router)
