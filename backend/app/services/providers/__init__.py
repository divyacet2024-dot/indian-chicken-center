from typing import Dict, Any, Optional
from abc import ABC, abstractmethod


class SpeechToTextProvider(ABC):
    @abstractmethod
    def transcribe(self, audio_data: Any, language_code: str) -> Dict[str, Any]:
        raise NotImplementedError


class LanguageUnderstandingProvider(ABC):
    @abstractmethod
    def detect_language(self, text: str, explicit_language: Optional[str] = None) -> Dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def detect_intent(self, text: str) -> Dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def extract_entities(self, text: str, language: Optional[str] = None) -> Dict[str, Any]:
        raise NotImplementedError


class TextToSpeechProvider(ABC):
    @abstractmethod
    def synthesize(self, text: str, language_code: str) -> Dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def get_voice_locale(self, language_code: str) -> str:
        raise NotImplementedError


class LLMProvider(ABC):
    @abstractmethod
    def generate_response(self, messages: list, tools: list, temperature: float, max_tokens: int) -> Any:
        raise NotImplementedError
