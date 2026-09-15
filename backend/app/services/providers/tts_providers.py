from typing import Dict, Any, Optional
from app.services.providers import TextToSpeechProvider
from app.services.multilingual_nlp import SUPPORTED_LANGUAGES


LANGUAGE_TO_VOICE_LOCALE = {
    "en": "en-IN",
    "kn": "kn-IN",
    "hi": "hi-IN",
    "te": "te-IN",
    "ta": "ta-IN",
    "ml": "ml-IN",
    "ur": "ur-IN",
    "mr": "mr-IN",
    "bn": "bn-IN",
}


class BrowserTTSProvider(TextToSpeechProvider):
    provider_name = "browser"

    def get_voice_locale(self, language_code: str) -> str:
        return LANGUAGE_TO_VOICE_LOCALE.get(language_code, "en-IN")

    def synthesize(self, text: str, language_code: str) -> Dict[str, Any]:
        if language_code not in SUPPORTED_LANGUAGES:
            language_code = "en"
        return {
            "provider": self.provider_name,
            "language_code": language_code,
            "voice_locale": self.get_voice_locale(language_code),
            "note": "Browser speechSynthesis handles text-to-speech on the client side.",
        }


class BServerTTSProvider(TextToSpeechProvider):
    provider_name = "bserver"

    def get_voice_locale(self, language_code: str) -> str:
        return LANGUAGE_TO_VOICE_LOCALE.get(language_code, "en-IN")

    def synthesize(self, text: str, language_code: str) -> Dict[str, Any]:
        if language_code not in SUPPORTED_LANGUAGES:
            language_code = "en"
        return {
            "provider": self.provider_name,
            "language_code": language_code,
            "voice_locale": self.get_voice_locale(language_code),
            "note": "Backend server TTS provider (browser fallback is zero-cost).",
        }


browser_tts_provider = BrowserTTSProvider()
bserver_tts_provider = BServerTTSProvider()

TTS_PROVIDERS: Dict[str, TextToSpeechProvider] = {
    "browser": browser_tts_provider,
    "bserver": bserver_tts_provider,
}


def get_tts_provider(provider_name: Optional[str] = None) -> TextToSpeechProvider:
    from app.config import settings
    resolved = provider_name or getattr(settings, "TTS_PROVIDER", "") or "browser"
    if resolved not in TTS_PROVIDERS:
        resolved = "browser"
    return TTS_PROVIDERS[resolved]


def get_voice_locale(language_code: str) -> str:
    return get_tts_provider().get_voice_locale(language_code)
