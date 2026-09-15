import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.models import *  # Ensure all SQLAlchemy models are registered
from app.api import api_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("indian_chicken_center")

# Initialize database tables
Base.metadata.create_all(bind=engine)

# Hide interactive API docs in production to avoid exposing schema
_is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
)

# Build the allowed-origins list from environment configuration.
# CORS_ORIGINS (comma-separated) + FRONTEND_URL are both supported so that
# development and production URLs are covered without any hardcoding.
_allowed_origins = settings.get_cors_origins_list()
logger.info(f"CORS allowed origins: {_allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    # Allow http://localhost:* and http://127.0.0.1:* during development
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
def shutdown_event():
    logger.info("Shutting down Indian Chicken Center backend...")
    try:
        engine.dispose()
        logger.info("Database engine disposed successfully.")
    except Exception as e:
        logger.error(f"Error disposing database engine: {e}")

app.include_router(api_router)

@app.get("/")
def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs" if not _is_production else "disabled in production",
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

