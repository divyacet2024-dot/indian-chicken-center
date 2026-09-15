from typing import Dict, Any
from app.services.providers import SpeechToTextProvider
from app.services.multilingual_nlp import detect_language, SUPPORTED_LANGUAGES


class BrowserSpeechToTextProvider(SpeechToTextProvider):
    provider_name = "browser"

    def transcribe(self, audio_data: Any, language_code: str) -> Dict[str, Any]:
        if language_code not in SUPPORTED_LANGUAGES:
            language_code = "en"
        return {
            "provider": self.provider_name,
            "language_code": language_code,
            "transcript": "",
            "confidence": 0.0,
            "note": "Browser Web Speech API handles speech-to-text on the client side.",
        }


browser_stt_provider = BrowserSpeechToTextProvider()
