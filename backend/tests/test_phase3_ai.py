from dataclasses import dataclass
from types import SimpleNamespace

import pytest

from app.models.business import Business
from app.services import ai_service
from app.services.ai_service import process_ai_chat
from app.services.multilingual_nlp import (
    ConversationContext,
    clear_conversation_context,
    detect_intent,
    detect_language,
    extract_entities,
)


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


@pytest.mark.parametrize("language,message", LANGUAGE_SAMPLES.items())
def test_supported_language_detection_and_profit_intent(language, message):
    assert detect_language(message)["language"] == language
    assert detect_intent(message)["intent"] == "PROFIT_REPORT"


def test_entities_extract_period_quantity_radius_and_uuid():
    trip_id = "123e4567-e89b-12d3-a456-426614174000"
    entities = extract_entities(f"Show trip {trip_id} with 25 kg stock today within 30 km", "en")
    assert entities["trip_id"] == trip_id
    assert entities["quantity"] == 25.0
    assert entities["quantity_unit"] == "kg"
    assert entities["period"] == "today"
    assert entities["radius"] == 30.0
    assert entities["customer_id"] is None


def test_entities_extract_customer_name():
    entities = extract_entities("Show balance for Empire Restaurant", "en")
    assert entities["customer_name"] == "Empire Restaurant"


def test_explicit_language_overrides_ambiguous_input():
    result = detect_language("profit", "kn")
    assert result == {"language": "kn", "confidence": 1.0, "explicit": True}


def test_ai_api_accepts_optional_language_override(auth_client):
    response = auth_client.post(
        "/api/ai/chat",
        json={"message": "profit", "language": "kn"},
    )
    assert response.status_code == 200
    assert response.json()["language"] == "kn"
    assert "ಲಾಭ" in response.json()["answer"]


def test_ai_api_rejects_unsupported_language(auth_client):
    response = auth_client.post(
        "/api/ai/chat",
        json={"message": "profit", "language": "fr"},
    )
    assert response.status_code == 422


def test_conversation_context_is_bounded_and_does_not_store_customer_names():
    context = ConversationContext(max_turns=2)
    for index in range(3):
        context.add_turn(
            f"Question {index}",
            "PROFIT_REPORT",
            {"period": "today", "customer_name": "Private Customer"},
            {"tool": "get_profit_report", "data": {"net_profit": index}},
        )
    assert len(context.get_context()) == 2
    assert "customer_name" not in context.get_context()[0]["entities"]


class FakeFunction:
    def __init__(self, name, arguments="{}"):
        self.name = name
        self.arguments = arguments


class FakeToolCall:
    def __init__(self, name, arguments="{}"):
        self.id = f"call-{name}"
        self.function = FakeFunction(name, arguments)


@dataclass
class FakeMessage:
    content: str | None = None
    tool_calls: list | None = None


class FakeCompletions:
    def __init__(self, messages):
        self.messages = messages
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return SimpleNamespace(choices=[SimpleNamespace(message=self.messages.pop(0))])


class FakeClient:
    def __init__(self, messages):
        self.chat = SimpleNamespace(completions=FakeCompletions(messages))


def _business(db_session):
    business = Business(business_name="Phase 3 AI", owner_name="Owner")
    db_session.add(business)
    db_session.commit()
    return business


def test_openrouter_agent_executes_multiple_tool_rounds(monkeypatch, db_session):
    business = _business(db_session)
    client = FakeClient([
        FakeMessage(tool_calls=[FakeToolCall("get_dashboard_summary")]),
        FakeMessage(tool_calls=[FakeToolCall("get_profit_report")]),
        FakeMessage(content="Verified business answer"),
    ])
    monkeypatch.setattr(ai_service, "_get_openrouter_client", lambda: client)
    monkeypatch.setattr(ai_service.settings, "AI_PROVIDER", "openrouter")
    clear_conversation_context(business.id)

    result = process_ai_chat(db_session, business.id, "Give me a business overview")

    assert result["provider"] == "openrouter"
    assert result["tool_used"] == "get_dashboard_summary,get_profit_report"
    assert result["answer"] == "Verified business answer"
    assert len(client.chat.completions.calls) == 3


def test_invalid_agent_arguments_use_deterministic_fallback(monkeypatch, db_session):
    business = _business(db_session)
    client = FakeClient([FakeMessage(tool_calls=[FakeToolCall("get_trip_stock", '{"trip_id":"not-an-id"}')])])
    monkeypatch.setattr(ai_service, "_get_openrouter_client", lambda: client)
    monkeypatch.setattr(ai_service.settings, "AI_PROVIDER", "openrouter")

    result = process_ai_chat(db_session, business.id, "How much stock is left?")

    assert result["provider"] == "fallback"
    assert result["data_source"] == "database"
    assert result["answer"]


def test_agent_iteration_limit_uses_fallback(monkeypatch, db_session):
    business = _business(db_session)
    client = FakeClient([FakeMessage(tool_calls=[FakeToolCall("get_dashboard_summary")]) for _ in range(6)])
    monkeypatch.setattr(ai_service, "_get_openrouter_client", lambda: client)
    monkeypatch.setattr(ai_service.settings, "AI_PROVIDER", "openrouter")

    result = process_ai_chat(db_session, business.id, "Show my dashboard")

    assert result["provider"] == "fallback"
    assert len(client.chat.completions.calls) == 5
