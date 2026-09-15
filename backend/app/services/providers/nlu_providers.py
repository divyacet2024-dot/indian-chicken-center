from typing import Dict, Any, Optional
from app.services.providers import LanguageUnderstandingProvider
from app.services.multilingual_nlp import (
    SUPPORTED_LANGUAGES,
    detect_language,
    detect_intent,
    extract_entities,
)


class MultilingualNLPProvider(LanguageUnderstandingProvider):
    provider_name = "multilingual_nlp"

    def detect_language(self, text: str, explicit_language: Optional[str] = None) -> Dict[str, Any]:
        return detect_language(text, explicit_language)

    def detect_intent(self, text: str) -> Dict[str, Any]:
        return detect_intent(text)

    def extract_entities(self, text: str, language: Optional[str] = None) -> Dict[str, Any]:
        return extract_entities(text, language)


multilingual_nlp_provider = MultilingualNLPProvider()
