import pytest
from app.services.voice_pipeline import (
    VoicePipeline,
    voice_pipeline,
    TTS_VOICE_TEST_SAMPLES,
    get_voice_locale,
    get_supported_voice_locales,
)
from app.services.providers import (
    SpeechToTextProvider,
    LanguageUnderstandingProvider,
    TextToSpeechProvider,
    LLMProvider,
)
from app.services.providers.tts_providers import (
    browser_tts_provider,
    bserver_tts_provider,
    get_tts_provider,
    LANGUAGE_TO_VOICE_LOCALE,
)
from app.services.providers.stt_providers import browser_stt_provider
from app.services.providers.nlu_providers import multilingual_nlp_provider
from app.services.multilingual_nlp import SUPPORTED_LANGUAGES


LANGUAGE_SAMPLES = {
    "en": "How much profit today?",
    "kn": "ಇವತ್ತು profit ಎಷ್ಟು?",
    "hi": "आज profit कितना है?",
    "te": "ఈరోజు profit ఎంత?",
    "ta": "இன்று profit எவ்வளவு?",
    "ml": "ഇന്ന് profit എത്ര?",
    "ur": "آج منافع کتنا؟",
    "mr": "आजचा नफा किती?",
    "bn": "আজ লাভ কত?",
}

WRITE_INTENT_MESSAGES = {
    "en": "Start a trip with truck 1",
    "kn": "ಟ್ರಕ್ 1 ಅಥವಾ ಪ್ರಾರంಭಿಸಿ",
    "hi": "ट्रक 1 के साथ एक यात्रा शुरू करें",
    "te": "ట్రక్ 1 తో ఒక యాత్రను ప్రారంభించండి",
}


class MockTTSProvider(TextToSpeechProvider):
    provider_name = "mock"
    def synthesize(self, text, language_code):
        return {"provider": "mock", "language_code": language_code, "voice_locale": "en-IN"}
    def get_voice_locale(self, language_code):
        return "en-IN"


class MockSTTProvider(SpeechToTextProvider):
    provider_name = "mock"
    def transcribe(self, audio_data, language_code):
        return {"provider": "mock", "language_code": language_code, "transcript": "mock", "confidence": 1.0}


class MockLLMProvider(LLMProvider):
    provider_name = "mock"
    def generate_response(self, messages, tools, temperature=0.0, max_tokens=500):
        return None


def test_tts_provider_is_selected_from_settings():
    provider = get_tts_provider()
    assert isinstance(provider, TextToSpeechProvider)
    assert provider.provider_name == "browser"


def test_invalid_provider_configuration_falls_back_to_browser():
    provider = get_tts_provider("invalid_provider")
    assert provider.provider_name == "browser"


def test_browser_tts_provider_is_zero_cost():
    assert browser_tts_provider.provider_name == "browser"


def test_bserver_tts_provider_available():
    assert bserver_tts_provider.provider_name == "bserver"
    result = bserver_tts_provider.synthesize("test", "en")
    assert result["provider"] == "bserver"
    assert result["voice_locale"] == "en-IN"


@pytest.mark.parametrize("language", SUPPORTED_LANGUAGES)
def test_voice_locale_mapping(language):
    locale = get_voice_locale(language)
    assert locale == LANGUAGE_TO_VOICE_LOCALE[language]
    assert locale.endswith("-IN")


def test_get_supported_voice_locales_returns_all_languages():
    locales = get_supported_voice_locales()
    assert len(locales) == 9
    for lang in SUPPORTED_LANGUAGES:
        assert lang in locales


@pytest.mark.parametrize("language", SUPPORTED_LANGUAGES)
def test_test_voice_samples_exist_for_all_languages(language):
    assert language in TTS_VOICE_TEST_SAMPLES
    assert len(TTS_VOICE_TEST_SAMPLES[language]) > 0


def test_test_voice_response_uses_language():
    pipeline = VoicePipeline()
    result = pipeline.get_test_voice_response("kn")
    assert result["language"] == "kn"
    assert result["tts"]["provider"] == "browser"
    assert result["tts"]["voice_locale"] == "kn-IN"


def test_test_voice_falls_back_to_english_for_invalid_language():
    pipeline = VoicePipeline()
    result = pipeline.get_test_voice_response("invalid")
    assert result["language"] == "en"
    assert result["tts"]["voice_locale"] == "en-IN"


@pytest.mark.parametrize("language,message", LANGUAGE_SAMPLES.items())
def test_voice_pipeline_detects_language(auth_client, db_session, language, message):
    response = auth_client.post(
        "/api/ai/voice/text",
        json={"text": message},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["language"] == language


def test_voice_pipeline_unauthorized_without_token(client):
    response = client.post(
        "/api/ai/voice/text",
        json={"text": "profit"},
    )
    assert response.status_code == 401


def test_voice_pipeline_business_isolation(client, db_session):
    from app.models.business import Business
    from app.models.user import User
    from app.services.auth_service import get_password_hash, create_access_token
    from app.models.truck import Truck

    business = Business(business_name="Voice Test Business", owner_name="Voice Owner", contact_details="9990001234")
    db_session.add(business)
    db_session.flush()

    user = User(
        business_id=business.id,
        email_or_phone="voice_test@iso.test",
        password_hash=get_password_hash("password123"),
        role="owner",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    token = create_access_token(data={"sub": user.id, "business_id": business.id})

    response = client.post(
        "/api/ai/voice/text",
        json={"text": "How much profit did I make?"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert data["tool_used"] == "get_profit_report"


def test_voice_pipeline_read_only_action(auth_client, db_session):
    response = auth_client.post(
        "/api/ai/voice/text",
        json={"text": "How much profit did I make?"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["requires_confirmation"] is False
    assert data["intent"] == "PROFIT_REPORT"


def test_voice_pipeline_write_action_requires_confirmation(auth_client, db_session):
    response = auth_client.post(
        "/api/ai/voice/text",
        json={"text": "Add a customer named Empire Restaurant"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["requires_confirmation"] is True


def test_voice_pipeline_text_end_point(auth_client):
    response = auth_client.post(
        "/api/ai/voice/text",
        json={"text": "Show me my active trucks"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "tool_used" in data
    assert "requires_confirmation" in data
    assert "voice_locale" in data


def test_voice_test_endpoint(auth_client):
    response = auth_client.post(
        "/api/ai/voice/test",
        json={"language": "hi"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["language"] == "hi"
    assert data["tts_provider"] == "browser"
    assert data["voice_locale"] == "hi-IN"
    assert len(data["text"]) > 0


def test_voice_test_endpoint_uses_user_preferred_language(auth_client):
    auth_client.patch(
        "/api/auth/preferences",
        json={"preferred_language": "ta"},
    )
    response = auth_client.post(
        "/api/ai/voice/test",
        json={},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["language"] == "ta"
    assert data["voice_locale"] == "ta-IN"


def test_voice_locales_endpoint(auth_client):
    response = auth_client.get("/api/ai/voice/locales")
    assert response.status_code == 200
    data = response.json()
    assert data["default_provider"] == "bserver" or data["default_provider"] == "browser"
    assert len(data["locales"]) == 9
    assert "test_samples" in data


def test_voice_locales_endpoint_unauthorized(client):
    response = client.get("/api/ai/voice/locales")
    assert response.status_code == 401


def test_provider_abstractions_are_abstract():
    with pytest.raises(TypeError):
        SpeechToTextProvider()
    with pytest.raises(TypeError):
        LanguageUnderstandingProvider()
    with pytest.raises(TypeError):
        TextToSpeechProvider()
    with pytest.raises(TypeError):
        LLMProvider()


def test_stt_provider_interface_implemented():
    assert isinstance(browser_stt_provider, SpeechToTextProvider)
    result = browser_stt_provider.transcribe(b"", "kn")
    assert result["provider"] == "browser"
    assert result["language_code"] == "kn"


def test_nlu_provider_uses_existing_multilingual_nlp():
    assert isinstance(multilingual_nlp_provider, LanguageUnderstandingProvider)
    result = multilingual_nlp_provider.detect_language("ಇವತ್ತು profit ಎಷ್ಟು?")
    assert result["language"] == "kn"
    intent = multilingual_nlp_provider.detect_intent("profit")
    assert intent["intent"] == "PROFIT_REPORT"


def test_custom_provider_injection():
    mock_tts = MockTTSProvider()
    pipeline = VoicePipeline(tts_provider=mock_tts)
    result = pipeline.get_test_voice_response("en")
    assert result["tts"]["provider"] == "mock"


def test_voice_pipeline_truck_tracking_query(auth_client, db_session):
    response = auth_client.post(
        "/api/ai/voice/text",
        json={"text": "Where is my truck 1?"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert data["requires_confirmation"] is False
