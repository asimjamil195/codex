# core/ai.py
import os
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_ROOT / ".env")

OPENAI_MOCK = os.getenv("OPENAI_MOCK", "false").lower() in ("1", "true", "yes")

if OPENAI_MOCK:
    def ask_codex(prompt: str, max_tokens: int = 800):
        if "curriculum" in prompt.lower():
            return {
                "levels": [
                    {
                        "level": "Beginner",
                        "lessons": [
                            {"title": "Variables", "summary": "Learn variables and data types."},
                            {"title": "Loops", "summary": "Understand iteration."}
                        ]
                    },
                    {
                        "level": "Intermediate",
                        "lessons": [
                            {"title": "Functions", "summary": "Learn modular code."},
                            {"title": "Modules", "summary": "Use Python libraries."}
                        ]
                    }
                ]
            }
        else:
            return {"message": "Mock response"}

else:
    from openai import OpenAI, OpenAIError
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY not found. Put .env at project root with OPENAI_API_KEY=sk-...")

    client = OpenAI(api_key=OPENAI_API_KEY)

    PREFERRED_MODELS = [
        "gpt-5",
        "gpt-4o",
        "gpt-4",
        "gpt-3.5-turbo",
    ]

    def choose_model():
        try:
            models = client.models.list().data
            available = {m.id for m in models}
        except OpenAIError:
            return "gpt-3.5-turbo"
        for m in PREFERRED_MODELS:
            if m in available:
                return m
        for m in available:
            if "gpt" in m:
                return m
        return "gpt-3.5-turbo"

    MODEL = choose_model()

    def ask_codex(prompt: str, max_tokens: int = 800):
        try:
            resp = client.chat.completions.create(
                model=MODEL,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
            )
            return getattr(resp.choices[0].message, "content", resp.choices[0].message.content)
        except OpenAIError as e:
            raise RuntimeError(f"OpenAI API error when calling model {MODEL}: {e}")
