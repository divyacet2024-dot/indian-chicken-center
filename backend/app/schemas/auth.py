from pydantic import BaseModel, Field
from typing import Optional, Literal

SupportedLanguage = Literal["en", "kn", "hi", "te", "ta", "ml", "ur", "mr", "bn"]

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    business_id: str
    email_or_phone: str
    role: str

class TokenData(BaseModel):
    user_id: Optional[str] = None
    business_id: Optional[str] = None

class LoginRequest(BaseModel):
    email_or_phone: str = Field(..., min_length=3)
    password: str = Field(..., min_length=1)

class ActivationRequest(BaseModel):
    owner_name: str = Field(..., min_length=2)
    business_name: str = Field(..., min_length=2)
    mobile_number: str = Field(..., min_length=10)
    password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)

class PreferencesUpdate(BaseModel):
    preferred_language: SupportedLanguage
