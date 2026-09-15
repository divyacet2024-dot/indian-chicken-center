import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional, Union

class Settings(BaseSettings):
    PROJECT_NAME: str = "Indian Chicken Center API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    DATABASE_URL: str = "sqlite:///./indian_chicken_center.db"
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ]

    # Production frontend URL (e.g. https://your-app.vercel.app)
    # When set, this is automatically added to the allowed CORS origins list.
    FRONTEND_URL: Optional[str] = None

    DEV_SEED_EMAIL: str = ""
    DEV_SEED_PASSWORD: str = ""

    AI_PROVIDER: str = ""
    OPENROUTER_API_KEY: str = ""
    AI_MODEL: str = "openai/gpt-3.5-turbo"

    TTS_PROVIDER: str = "browser"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    def get_cors_origins_list(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, str):
            origins = [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]
        else:
            origins = list(self.CORS_ORIGINS)
        # Always include the explicit production frontend URL if set
        if self.FRONTEND_URL and self.FRONTEND_URL.strip():
            frontend = self.FRONTEND_URL.strip().rstrip("/")
            if frontend not in origins:
                origins.append(frontend)
        return origins

settings = Settings()
