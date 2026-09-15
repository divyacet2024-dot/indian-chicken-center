from typing import Dict, Any, Optional, List
from decimal import Decimal
from sqlalchemy.orm import Session
from app.config import settings
from app.services.providers import (
    SpeechToTextProvider,
    LanguageUnderstandingProvider,
    TextToSpeechProvider,
    LLMProvider,
)
from app.services.providers.stt_providers import browser_stt_provider
from app.services.providers.tts_providers import get_tts_provider, get_voice_locale as _get_voice_locale, LANGUAGE_TO_VOICE_LOCALE
from app.services.providers.nlu_providers import multilingual_nlp_provider
from app.services.providers.llm_providers import openrouter_provider
from app.services.multilingual_nlp import SUPPORTED_LANGUAGES, detect_language, get_conversation_context, clear_conversation_context
from app.services.ai_service import (
    select_tool_and_execute,
    generate_natural_response,
    generate_ai_response_with_openrouter,
    AGENT_TOOL_DEFINITIONS,
    _validate_tool_arguments,
    _execute_agent_tool,
    _openai_message_dict,
    MAX_TOOL_ITERATIONS,
)

import uuid
import json
import logging

logger = logging.getLogger("indian_chicken_center")

TTS_VOICE_TEST_SAMPLES: Dict[str, str] = {
    "en": "Hello! I'm your Indian Chicken Center assistant. How can I help you today?",
    "kn": "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಇಂಡಿಯನ್ ಚಿಕಿನ್ ಸೆಂಟರ್ ಸಹಾಯಕರು. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
    "hi": "नमस्ते! मैं आपका इंडियन चिकन सेंटर असिस्टेंट हूँ। आज मैं आपकी कैसे मदद करूँ?",
    "te": "నమస్కారు! నేను మీ ఇండియన్ చికన్ సెంటర్ సహాయకుడిని. ఈరోజు నేను మీకు ఎలా సహాయం చేయగలను?",
    "ta": "வணக்கம்! நான் உங்கள் இந்தியன் சிக்கன் சென্টர் உதவியாளர். இன்று நான் உங்களுக்கு எப்படி உதவலாம்?",
    "ml": "നമസ്കാരം! ഞാൻ നിങ്ങളുടെ ഇന്ത്യൻ ചിക്കൻ സെന്റർ സഹായിയാണ്. ഇന്ന് എങ്ങനെ സഹായിക്കാം?",
    "ur": "ہیلو! میں آپ کا انڈین چکن سینٹر مددگار ہوں۔ آج میں آپ کی کیسے مدد کر سکتا ہوں؟",
    "mr": "नमस्कार! मी तुमचा इंडियन चिकन सेंटर सहाय्यक आहे. आज मी तुमची कशी मदत करू?",
    "bn": "হ্যালো! আমি আপনার ইন্ডিয়ান চিকেন সেন্টার সহকারী। আজ আমি আপনাকে কিভাবে সাহায্য করতে পারি?",
}

WRITE_OPERATION_INTENTS = {
    "START_TRIP",
    "ADD_ORDER",
    "ADD_CUSTOMER",
    "RECORD_PAYMENT",
    "ADD_EXPENSE",
    "RECORD_WASTAGE",
}

WRITE_OPERATION_TOOLS = {
    "start_trip",
    "create_order",
    "create_customer",
    "record_payment",
    "record_expense",
    "record_wastage",
}

WRITE_OPERATION_KEYWORDS = {
    "start_trip": ["start trip", "start a trip", "begin trip", "begin a trip"],
    "add_order": ["add order", "create order", "place order", "new order"],
    "add_customer": ["add customer", "create customer", "new customer", "register customer", "add a customer"],
    "record_payment": ["record payment", "take payment", "collect payment"],
    "add_expense": ["add expense", "record expense", "new expense"],
    "record_wastage": ["record wastage", "record loss", "add wastage", "log wastage"],
}


class VoicePipeline:
    def __init__(
        self,
        stt_provider: Optional[SpeechToTextProvider] = None,
        nlu_provider: Optional[LanguageUnderstandingProvider] = None,
        tts_provider: Optional[TextToSpeechProvider] = None,
        llm_provider: Optional[LLMProvider] = None,
    ):
        self.stt_provider: SpeechToTextProvider = stt_provider or browser_stt_provider
        self.nlu_provider: LanguageUnderstandingProvider = nlu_provider or multilingual_nlp_provider
        self.tts_provider: TextToSpeechProvider = tts_provider or get_tts_provider()
        self.llm_provider: Optional[LLMProvider] = llm_provider

    def _detect_language(self, text: str, explicit_language: Optional[str] = None) -> Dict[str, Any]:
        return self.nlu_provider.detect_language(text, explicit_language)

    def _detect_intent(self, text: str) -> Dict[str, Any]:
        return self.nlu_provider.detect_intent(text)

    def _extract_entities(self, text: str, language: Optional[str] = None) -> Dict[str, Any]:
        return self.nlu_provider.extract_entities(text, language)

    def process_text_query(
        self,
        db: Session,
        business_id: str,
        text: str,
        language: Optional[str] = None,
    ) -> Dict[str, Any]:
        language_info = self._detect_language(text, language)
        detected_language = language_info["language"]

        context = get_conversation_context(business_id)
        tool_result = select_tool_and_execute(db, business_id, text, detected_language, context)
        deterministic_answer = generate_natural_response(tool_result, text, detected_language)

        intent_info = self._detect_intent(text)
        intent = intent_info["intent"]
        confidence = intent_info["confidence"]

        is_write_intent = intent in WRITE_OPERATION_INTENTS
        tool_used = tool_result.get("tool", "unknown")
        is_write_tool = tool_used in WRITE_OPERATION_TOOLS

        is_write_keyword = False
        text_lower = text.lower()
        for action, keywords in WRITE_OPERATION_KEYWORDS.items():
            if any(kw in text_lower for kw in keywords):
                is_write_keyword = True
                break

        requires_confirmation = is_write_intent or is_write_tool or is_write_keyword

        provider = getattr(settings, "AI_PROVIDER", "")
        answer = deterministic_answer
        llm_provider_used = "deterministic"

        if provider == "openrouter" and self.llm_provider:
            try:
                result = generate_ai_response_with_openrouter(
                    text, business_id, db, detected_language, context, tool_result
                )
                answer = result.get("answer", deterministic_answer)
                llm_provider_used = result.get("provider", "deterministic")
            except Exception as exc:
                logger.warning("OpenRouter failed in voice pipeline, using deterministic: %s", exc)
                answer = deterministic_answer
                llm_provider_used = "fallback"

        tts_info = self.tts_provider.synthesize(answer, detected_language)

        context.add_turn(
            text,
            intent,
            tool_result.get("entities", {}),
            {"tool": tool_used, "data": tool_result.get("data")},
        )

        return {
            "answer": answer,
            "tool_used": tool_used,
            "data_source": tool_result.get("data_source", "database"),
            "language": detected_language,
            "confidence": confidence,
            "intent": intent,
            "entities": tool_result.get("entities", {}),
            "requires_confirmation": requires_confirmation,
            "tts": tts_info,
            "provider": llm_provider_used,
        }

    def get_test_voice_response(self, language: str) -> Dict[str, Any]:
        if language not in SUPPORTED_LANGUAGES:
            language = "en"
        sample_text = TTS_VOICE_TEST_SAMPLES.get(language, TTS_VOICE_TEST_SAMPLES["en"])
        tts_info = self.tts_provider.synthesize(sample_text, language)
        return {
            "language": language,
            "text": sample_text,
            "tts": tts_info,
        }

    def synthesize_speech(self, text: str, language: str) -> Dict[str, Any]:
        if language not in SUPPORTED_LANGUAGES:
            language = "en"
        return self.tts_provider.synthesize(text, language)


voice_pipeline = VoicePipeline()


def get_voice_locale(language_code: str) -> str:
    return _get_voice_locale(language_code)


def get_supported_voice_locales() -> Dict[str, str]:
    return dict(LANGUAGE_TO_VOICE_LOCALE)
