"""Shared domain logic for voice sessions, independent of where they get exported.

A "sitting" is one run of clips grouped by meta.session_id, with the coach's reply
attached. Both export backends (obsidian.py, notion.py) render the same sittings —
only the output format differs — so the reading and grouping live here rather than
in whichever backend happened to be written first.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

VOICE_TEMPLATE = "voice_session"

# Display names only — deliberately not personas. The persona layer stays in
# each thread's system_prompt (see the chat-audio-thread-editing spec).
COACH_NAMES: dict[str, str] = {
    "nakula": "Nakula",
    "bheem": "Bheem",
    "arjun": "Arjun",
    "yudi": "Yudi",
    "sahdev": "Sahdev",
}


def coach_name(coach_id: str) -> str:
    return COACH_NAMES.get(coach_id, coach_id.title() or "Saarthi")


def day_key_for_thread(thread_row: dict) -> str | None:
    """Pull the 'YYYY-MM-DD' half out of a voice thread's composite period_key."""
    if thread_row.get("template") != VOICE_TEMPLATE:
        return None
    period_key = thread_row.get("period_key") or ""
    day_key = period_key.split(":", 1)[0]
    return day_key or None


def fmt_time(iso: str, tz: ZoneInfo) -> str:
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except ValueError:
        return ""
    return dt.astimezone(tz).strftime("%H:%M")


def session_duration(session: dict) -> int:
    """Total spoken seconds across a sitting's clips. Missing values count as 0."""
    total = 0
    for seg in session["segments"]:
        meta = seg.get("meta") or {}
        try:
            total += int(meta.get("duration_s") or 0)
        except (TypeError, ValueError):
            pass
    return total


def group_sessions(thread_row: dict, messages: list[dict]) -> list[dict]:
    """Group a voice thread's messages into sittings keyed by meta.session_id.

    AI replies are attributed to the most recent session seen, which is what
    POST /threads/{id}/reply produces — one reply for the whole sitting.
    """
    coach_id = thread_row.get("coach_id") or ""
    sessions: dict[str, dict] = {}
    order: list[str] = []
    current: str | None = None

    for msg in messages:
        role = msg.get("role")
        meta = msg.get("meta") or {}
        if role == "user":
            # Messages typed rather than spoken still belong to the sitting they
            # land in, so fall back to the running session rather than dropping them.
            sid = meta.get("session_id") or current or f"msg-{msg.get('id', '')}"
            if sid not in sessions:
                sessions[sid] = {
                    "session_id": sid,
                    "coach_id": coach_id,
                    "coach_name": coach_name(coach_id),
                    "started_at": msg.get("created_at", ""),
                    "segments": [],
                    "replies": [],
                }
                order.append(sid)
            current = sid
            sessions[sid]["segments"].append(msg)
        elif role == "ai" and current is not None:
            sessions[current]["replies"].append(msg)

    return [sessions[sid] for sid in order]


def collect_day_sessions(db: Any, user_id: str, day_key: str) -> list[dict]:
    """Every sitting across every voice thread for `day_key`, oldest first.

    Deliberately spans all coaches: a backend that re-renders a whole day would
    wipe the other brothers if handed only one thread's worth.
    """
    # period_key for voice threads is "<YYYY-MM-DD>:<coach_id>".
    threads = (
        db.table("v2_threads")
        .select("id, coach_id, period_key, template")
        .eq("user_id", user_id)
        .eq("template", VOICE_TEMPLATE)
        .like("period_key", f"{day_key}:%")
        .execute()
        .data or []
    )
    if not threads:
        return []

    thread_ids = [t["id"] for t in threads]
    rows = (
        db.table("v2_thread_messages")
        .select("id, thread_id, role, content, meta, created_at")
        .in_("thread_id", thread_ids)
        .in_("role", ["user", "ai"])
        .order("created_at")
        .execute()
        .data or []
    )
    by_thread: dict[str, list[dict]] = {}
    for row in rows:
        by_thread.setdefault(row["thread_id"], []).append(row)

    sessions: list[dict] = []
    for thread in threads:
        sessions.extend(group_sessions(thread, by_thread.get(thread["id"], [])))

    return sorted(sessions, key=lambda s: s.get("started_at") or "")
