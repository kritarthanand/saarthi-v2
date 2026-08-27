"""Shared domain logic for voice sessions, independent of where they get exported.

A "sitting" is one run of clips grouped by meta.session_id, with the coach's reply
attached. Reading and grouping live here rather than in notion.py so the domain
rules stay independent of where a sitting gets written.
"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone as _tzmod
from typing import Any
from zoneinfo import ZoneInfo

_UTC = _tzmod.utc

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


def day_key_for_thread(thread_row: dict, fallback: str | None = None) -> str | None:
    """The 'YYYY-MM-DD' a thread's sitting belongs to.

    Voice threads key on "<day>:<coach>" and ritual threads on "<day>", so the
    prefix covers both. Freeform threads have no period_key at all — a sitting
    there belongs to whichever day it was spoken on, which only the caller knows,
    so it passes `fallback`.
    """
    period_key = (thread_row.get("period_key") or "").split(":", 1)[0]
    if _is_day(period_key):
        return period_key
    return fallback


def _is_day(value: str) -> bool:
    try:
        date.fromisoformat(value)
        return True
    except ValueError:
        return False


def day_bounds(day_key: str, tz: ZoneInfo, day_start_hour: int) -> tuple[str, str]:
    """UTC ISO bounds of a ritual day, so clips can be found by when they were said.

    A "day" starts at day_start_hour local, not midnight UTC — the same rule
    _ritual_date uses to decide which day a thread belongs to.
    """
    day = date.fromisoformat(day_key)
    start = datetime.combine(day, time(hour=day_start_hour), tzinfo=tz)
    end = start + timedelta(days=1)
    return start.astimezone(_UTC).isoformat(), end.astimezone(_UTC).isoformat()


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


def collect_day_sessions(
    db: Any,
    user_id: str,
    day_key: str,
    tz: ZoneInfo,
    day_start_hour: int,
) -> list[dict]:
    """Every voice sitting spoken on `day_key`, from whichever thread it was said in.

    Sourced from the *messages*, not the threads: a clip recorded inside a ritual
    or freeform thread is still something the user said out loud that day, and
    gating on template == voice_session left those out of the export entirely.

    Sittings are grouped per thread (session_id is only unique within one) and
    then returned oldest first, so a day's pages merge cleanly by coach.
    """
    start, end = day_bounds(day_key, tz, day_start_hour)

    rows = (
        db.table("v2_thread_messages")
        .select(
            "id, thread_id, role, content, meta, created_at, "
            "v2_threads!inner(user_id, coach_id, template, tag, title)"
        )
        .eq("v2_threads.user_id", user_id)
        .gte("created_at", start)
        .lt("created_at", end)
        .in_("role", ["user", "ai"])
        .order("created_at")
        .execute()
        .data or []
    )
    if not rows:
        return []

    by_thread: dict[str, list[dict]] = {}
    threads: dict[str, dict] = {}
    for row in rows:
        thread = row.pop("v2_threads", None) or {}
        tid = row["thread_id"]
        threads.setdefault(tid, thread)
        by_thread.setdefault(tid, []).append(row)

    sessions: list[dict] = []
    for tid, messages in by_thread.items():
        # A thread only contributes if something in it was actually spoken;
        # otherwise a typed ritual answer would show up as a "sitting".
        if not any((m.get("meta") or {}).get("voice") for m in messages):
            continue
        thread = threads[tid]
        for session in group_sessions(thread, messages):
            # Where it was said, so a sitting from a ritual thread stays
            # attributable once merged into the coach's page for the day.
            session["source_template"] = thread.get("template") or ""
            session["source_tag"] = thread.get("tag") or ""
            sessions.append(session)

    return sorted(sessions, key=lambda s: s.get("started_at") or "")
