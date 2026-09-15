from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Literal, Optional, Any, Dict
from pydantic import BaseModel, Field
from app.database import get_db
from app.services.auth_service import get_current_user_and_business_strict
from app.services.ai_service import process_ai_chat
from app.services.voice_pipeline import (
    VoicePipeline,
    voice_pipeline,
    get_voice_locale,
    get_supported_voice_locales,
    TTS_VOICE_TEST_SAMPLES,
)
from app.services.multilingual_nlp import SUPPORTED_LANGUAGES

router = APIRouter(prefix="/ai", tags=["AI Assistant"])


class AIChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)
    language: Optional[Literal["en", "kn", "hi", "te", "ta", "ml", "ur", "mr", "bn"]] = None


class AIChatResponse(BaseModel):
    answer: str
    tool_used: str
    data_source: str
    language: str = "en"
    provider: str = "deterministic"


class VoiceTextRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)
    language: Optional[Literal["en", "kn", "hi", "te", "ta", "ml", "ur", "mr", "bn"]] = None


class VoiceTextResponse(BaseModel):
    answer: str
    tool_used: str
    data_source: str
    language: str
    intent: str
    requires_confirmation: bool
    tts_provider: str
    voice_locale: str


class TestVoiceRequest(BaseModel):
    language: Optional[Literal["en", "kn", "hi", "te", "ta", "ml", "ur", "mr", "bn"]] = None


class TestVoiceResponse(BaseModel):
    language: str
    text: str
    tts_provider: str
    voice_locale: str


class VoiceLocalesResponse(BaseModel):
    default_provider: str
    locales: Dict[str, str]
    test_samples: Dict[str, str]


@router.post("/chat", response_model=AIChatResponse)
def ai_chat(
    request: AIChatRequest,
    current_data=Depends(get_current_user_and_business_strict),
    db: Session = Depends(get_db),
):
    user, business = current_data
    try:
        result = process_ai_chat(db, business.id, request.message, request.language or user.preferred_language or "en")
        return AIChatResponse(
            answer=result.get("answer", "I don't have that information yet."),
            tool_used=result.get("tool_used", "unknown"),
            data_source=result.get("data_source", "database"),
            language=result.get("language", request.language or user.preferred_language or "en"),
            provider=result.get("provider", "deterministic"),
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail="AI processing failed. Please try again.")


@router.post("/voice/text", response_model=VoiceTextResponse)
def voice_text_query(
    request: VoiceTextRequest,
    current_data=Depends(get_current_user_and_business_strict),
    db: Session = Depends(get_db),
):
    user, business = current_data
    try:
        pipeline = VoicePipeline()
        explicit_lang = request.language if request.language else None
        result = pipeline.process_text_query(
            db, business.id, request.text,
            explicit_lang,
        )
        voice_locale = get_voice_locale(result["language"])
        return VoiceTextResponse(
            answer=result["answer"],
            tool_used=result["tool_used"],
            data_source=result["data_source"],
            language=result["language"],
            intent=result["intent"],
            requires_confirmation=result["requires_confirmation"],
            tts_provider=result["tts"]["provider"],
            voice_locale=voice_locale,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Voice processing failed. Please try again.")


@router.post("/voice/test", response_model=TestVoiceResponse)
def test_voice(
    request: TestVoiceRequest,
    current_data=Depends(get_current_user_and_business_strict),
):
    user, business = current_data
    pipeline = VoicePipeline()
    result = pipeline.get_test_voice_response(
        request.language or user.preferred_language or "en",
    )
    return TestVoiceResponse(
        language=result["language"],
        text=result["text"],
        tts_provider=result["tts"]["provider"],
        voice_locale=result["tts"]["voice_locale"],
    )


@router.get("/voice/locales", response_model=VoiceLocalesResponse)
def get_voice_locales(
    current_data=Depends(get_current_user_and_business_strict),
):
    from app.config import settings
    return VoiceLocalesResponse(
        default_provider=getattr(settings, "TTS_PROVIDER", "browser") or "browser",
        locales=get_supported_voice_locales(),
        test_samples=dict(TTS_VOICE_TEST_SAMPLES),
    )
