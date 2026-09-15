from typing import Dict, Any, Optional
from app.services.providers import LLMProvider
from app.config import settings


class OpenRouterProvider(LLMProvider):
    provider_name = "openrouter"

    def generate_response(self, messages: list, tools: list, temperature: float = 0.0, max_tokens: int = 500) -> Any:
        api_key = getattr(settings, "OPENROUTER_API_KEY", "")
        if not api_key:
            raise ValueError("OpenRouter API key not configured")
        from openai import OpenAI
        client = OpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
        )
        return client.chat.completions.create(
            model=getattr(settings, "AI_MODEL", "openai/gpt-3.5-turbo") or "openai/gpt-3.5-turbo",
            messages=messages,
            tools=tools,
            tool_choice="auto",
            temperature=temperature,
            max_tokens=max_tokens,
        )


openrouter_provider = OpenRouterProvider()
