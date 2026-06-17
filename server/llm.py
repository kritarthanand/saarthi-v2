"""Thin LLM provider abstraction for Saarthi V2.

Spec: chat-audio-thread-editing. No class hierarchy, no COACH_PERSONAS.
The per-thread `system_prompt` is the only persona layer.
"""

from __future__ import annotations

import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

# ── Registry ──────────────────────────────────────────────────────────────────
# Keys must match the v2_profiles.preferred_chat_model and v2_threads.chat_model
# CHECK constraints (see supabase/migrations/20260531_v2_profiles.sql and
# 20260616_v2_threads_system_prompt.sql). If you add/rename a key, widen both
# CHECKs in the same migration.

CHAT_MODELS: dict[str, tuple[str, str]] = {
    "claude_opus":   ("anthropic", "claude-opus-4-8"),
    "claude_sonnet": ("anthropic", "claude-sonnet-4-6"),
    "gpt_4o":        ("openai",    "gpt-4o"),
    "gpt_5_4":       ("openai",    "gpt-5"),
}

DEFAULT_MODEL_KEY = "gpt_4o"  # safe + cheap fallback; resolve_model only uses it
                              # when neither thread nor profile picked a model.

MAX_TOKENS_PER_REPLY = 2048
MAX_AUDIO_BYTES = 25_000_000
WHISPER_MODEL = "whisper-1"

ALLOWED_AUDIO_MIME = {
    "audio/m4a",
    "audio/mp4",
    "audio/wav",
    "audio/webm",
    "audio/mpeg",
}


# ── SDK clients (lazy, max_retries=0) ─────────────────────────────────────────

_anthropic_client: Any | None = None
_openai_client: Any | None = None


def _get_anthropic():
    global _anthropic_client
    if _anthropic_client is None:
        from anthropic import Anthropic
        _anthropic_client = Anthropic(
            api_key=os.environ.get("ANTHROPIC_API_KEY"),
            max_retries=0,
        )
    return _anthropic_client


def _get_openai():
    global _openai_client
    if _openai_client is None:
        from openai import OpenAI
        _openai_client = OpenAI(
            api_key=os.environ.get("OPENAI_API_KEY"),
            max_retries=0,
        )
    return _openai_client


# ── Model resolution ──────────────────────────────────────────────────────────

def resolve_model(thread_model: str | None, profile_model: str | None) -> tuple[str, str]:
    """thread.chat_model → profile.preferred_chat_model → DEFAULT_MODEL_KEY.

    Returns the (provider, model_id) tuple from CHAT_MODELS.
    Raises ValueError if the final key is missing from the registry.
    """
    key = thread_model or profile_model or DEFAULT_MODEL_KEY
    if key not in CHAT_MODELS:
        raise ValueError(f"Unknown chat model key: {key!r} (valid: {sorted(CHAT_MODELS)})")
    return CHAT_MODELS[key]


# ── Chat ──────────────────────────────────────────────────────────────────────

def chat_complete(
    provider: str,
    model: str,
    system: str,
    messages: list[dict[str, str]],
) -> str:
    """Run a chat completion. messages is a list of {role, content} dicts in
    chronological order; supported roles are 'user' and 'assistant'.
    Returns the assistant text.
    """
    if provider == "anthropic":
        client = _get_anthropic()
        # Note: claude-opus-4-8 rejects `temperature` and `budget_tokens`.
        # Adaptive thinking is the only thinking mode on 4.8.
        resp = client.messages.create(
            model=model,
            system=system,
            messages=messages,
            max_tokens=MAX_TOKENS_PER_REPLY,
            thinking={"type": "adaptive"},
        )
        # Concat any non-thinking text blocks.
        parts: list[str] = []
        for block in getattr(resp, "content", []) or []:
            btype = getattr(block, "type", None)
            if btype == "text":
                parts.append(getattr(block, "text", "") or "")
        return "".join(parts).strip()

    if provider == "openai":
        client = _get_openai()
        oai_messages = [{"role": "system", "content": system}] + messages
        # gpt-5 / o-series reject `max_tokens` and require `max_completion_tokens`.
        # gpt-4o accepts both; we standardize on the new name.
        resp = client.chat.completions.create(
            model=model,
            messages=oai_messages,
            max_completion_tokens=MAX_TOKENS_PER_REPLY,
        )
        choice = resp.choices[0]
        return (choice.message.content or "").strip()

    raise ValueError(f"Unknown provider: {provider!r}")


# ── Whisper STT ───────────────────────────────────────────────────────────────

def transcribe(audio_bytes: bytes, filename: str) -> str:
    """Send audio to OpenAI Whisper and return the transcript text."""
    import io
    client = _get_openai()
    buf = io.BytesIO(audio_bytes)
    buf.name = filename  # OpenAI SDK reads .name to infer the extension
    resp = client.audio.transcriptions.create(
        model=WHISPER_MODEL,
        file=buf,
    )
    return (getattr(resp, "text", "") or "").strip()
