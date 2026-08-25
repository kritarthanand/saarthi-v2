"""Obsidian daily-note export for voice sessions.

The server runs on the same machine as the vault (see server/README.md), so
export is a plain filesystem write — no sync service, no client involvement.

The target is the user's *existing* daily note, which means this module is a
guest in a file the user also edits by hand. It therefore owns exactly one
marker-fenced region and never touches a byte outside it. Frontmatter is left
strictly alone; metadata goes in as Dataview inline fields inside the region.

Disabled (every entry point becomes a no-op) when OBSIDIAN_VAULT_PATH is unset.
"""

from __future__ import annotations

import logging
import os
import re
import tempfile
from datetime import date, datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

logger = logging.getLogger(__name__)

VOICE_TEMPLATE = "voice_session"

BEGIN_MARKER = "<!-- saarthi:voice:begin -->"
END_MARKER = "<!-- saarthi:voice:end -->"
HEADING = "## Voice"

# Display names only — deliberately not personas. The persona layer stays in
# each thread's system_prompt (see the chat-audio-thread-editing spec).
COACH_NAMES: dict[str, str] = {
    "nakula": "Nakula",
    "bheem": "Bheem",
    "arjun": "Arjun",
    "yudi": "Yudi",
    "sahdev": "Sahdev",
}


# ── Config ────────────────────────────────────────────────────────────────────

def vault_path() -> Path | None:
    raw = (os.environ.get("OBSIDIAN_VAULT_PATH") or "").strip()
    if not raw:
        return None
    return Path(os.path.expanduser(raw))


def is_enabled() -> bool:
    return vault_path() is not None


# Obsidian's Daily Notes plugin uses moment.js format strings. Support the
# tokens that actually show up in date-only filenames; anything else passes
# through untouched (and will simply produce a filename that doesn't match,
# which surfaces as a "note not found → created" rather than silent breakage).
_MOMENT_TOKENS = {
    "YYYY": "%Y",
    "YY": "%y",
    "MMMM": "%B",
    "MMM": "%b",
    "MM": "%m",
    "DDDD": "%j",
    "DD": "%d",
    "dddd": "%A",
    "ddd": "%a",
}

_MOMENT_RE = re.compile("|".join(sorted(_MOMENT_TOKENS, key=len, reverse=True)))


def _moment_to_strftime(fmt: str) -> str:
    return _MOMENT_RE.sub(lambda m: _MOMENT_TOKENS[m.group(0)], fmt)


def daily_note_path(day: date) -> Path | None:
    """Resolve <vault>/<OBSIDIAN_DAILY_FOLDER>/<formatted day>.md."""
    vault = vault_path()
    if vault is None:
        return None
    folder = (os.environ.get("OBSIDIAN_DAILY_FOLDER") or "").strip().strip("/")
    fmt = (os.environ.get("OBSIDIAN_DAILY_FORMAT") or "YYYY-MM-DD").strip()
    name = day.strftime(_moment_to_strftime(fmt))
    base = vault / folder if folder else vault
    return base / f"{name}.md"


# ── Session grouping ──────────────────────────────────────────────────────────

def _group_sessions(thread_row: dict, messages: list[dict]) -> list[dict]:
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
                    "coach_name": COACH_NAMES.get(coach_id, coach_id.title() or "Saarthi"),
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


# ── Rendering ─────────────────────────────────────────────────────────────────

def _fmt_time(iso: str, tz: ZoneInfo) -> str:
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except ValueError:
        return ""
    return dt.astimezone(tz).strftime("%H:%M")


def _render_session(session: dict, tz: ZoneInfo) -> str:
    started = _fmt_time(session["started_at"], tz)
    lines: list[str] = [f"### {session['coach_name']} · {started}".rstrip(" ·")]

    total = 0
    for seg in session["segments"]:
        meta = seg.get("meta") or {}
        try:
            total += int(meta.get("duration_s") or 0)
        except (TypeError, ValueError):
            pass

    # Dataview inline fields — queryable without Saarthi ever editing the
    # note's frontmatter, which belongs to the user.
    lines.append(f"coach:: {session['coach_id']}")
    if total:
        lines.append(f"duration:: {total}s")
    lines.append(f"session:: {str(session['session_id'])[:8]}")
    lines.append("")

    for seg in session["segments"]:
        content = (seg.get("content") or "").strip()
        if content:
            lines.append(content)
            lines.append("")

    for reply in session["replies"]:
        content = (reply.get("content") or "").strip()
        if content:
            lines.append(f"**{session['coach_name']} —** {content}")
            lines.append("")

    return "\n".join(lines).rstrip()


def render_region_body(sessions: list[dict], tz: ZoneInfo) -> str:
    """Render every sitting for the day, oldest first."""
    ordered = sorted(sessions, key=lambda s: s.get("started_at") or "")
    blocks = [_render_session(s, tz) for s in ordered]
    return "\n\n".join(b for b in blocks if b)


# ── Splice + atomic write ─────────────────────────────────────────────────────

def _splice(original: str, block: str) -> str:
    """Replace the marker-fenced region, or append one if it isn't there yet."""
    start = original.find(BEGIN_MARKER)
    end = original.find(END_MARKER)
    if start != -1 and end != -1 and end > start:
        return original[:start] + block + original[end + len(END_MARKER):]

    prefix = original.rstrip()
    parts: list[str] = []
    if prefix:
        parts.append(prefix)
        parts.append("")
    # Don't add a second "## Voice" if the user already made one by hand.
    if not re.search(rf"^{re.escape(HEADING)}\s*$", original, re.MULTILINE):
        parts.append(HEADING)
        parts.append("")
    parts.append(block)
    return "\n".join(parts) + "\n"


def _atomic_write(path: Path, content: str) -> None:
    """Write via a temp file in the same directory + os.replace.

    Same directory so the rename stays on one filesystem (and is therefore
    atomic); dot-prefixed so Obsidian's indexer ignores it if it ever sees it.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), prefix=".saarthi-tmp-", suffix=".md")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(content)
        os.replace(tmp, path)
    except Exception:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def write_region(path: Path, region_body: str) -> str:
    """Read → splice → atomically write. Returns a short status string.

    The mtime re-check catches another *process* writing the file between our
    read and our replace. It does NOT protect against Obsidian holding an
    unsaved editor buffer — nothing on this side can. That hazard is managed by
    only exporting at session end (see main.py), which keeps the window small.
    """
    block = f"{BEGIN_MARKER}\n{region_body}\n{END_MARKER}"

    for _ in range(2):
        existed = path.exists()
        original = path.read_text(encoding="utf-8") if existed else ""
        before = path.stat().st_mtime_ns if existed else None

        updated = _splice(original, block)
        if updated == original:
            return "unchanged"

        if existed:
            try:
                after = path.stat().st_mtime_ns
            except OSError:
                after = None
            if after != before:
                continue  # someone else wrote it; re-read and rebuild once

        _atomic_write(path, updated)
        return "updated" if existed else "created"

    logger.warning("obsidian: %s kept changing under us; skipping export", path)
    return "skipped_conflict"


# ── Entry point ───────────────────────────────────────────────────────────────

def export_day(
    db: Any,
    user_id: str,
    day_key: str,
    tz: ZoneInfo,
) -> dict[str, Any]:
    """Rewrite the managed region of `day_key`'s daily note.

    Renders *every* voice thread for that day, not just one — the region is
    replaced wholesale, so a per-thread render would wipe the other coaches.

    Never raises: export is a side effect of a chat write and must not be able
    to fail the request that triggered it.
    """
    if not is_enabled():
        return {"status": "disabled"}

    try:
        day = date.fromisoformat(day_key)
    except ValueError:
        return {"status": "bad_day_key", "day": day_key}

    path = daily_note_path(day)
    if path is None:
        return {"status": "disabled"}

    try:
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
            return {"status": "no_sessions", "day": day_key}

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
            sessions.extend(_group_sessions(thread, by_thread.get(thread["id"], [])))

        if not sessions:
            return {"status": "no_sessions", "day": day_key}

        body = render_region_body(sessions, tz)
        status = write_region(path, body)
        return {
            "status": status,
            "day": day_key,
            "path": str(path),
            "sessions": len(sessions),
        }
    except Exception as e:  # noqa: BLE001 — export must never break the caller
        logger.exception("obsidian export failed for %s", day_key)
        return {"status": "error", "day": day_key, "error": str(e)[:300]}


def day_key_for_thread(thread_row: dict) -> str | None:
    """Pull the 'YYYY-MM-DD' half out of a voice thread's composite period_key."""
    if thread_row.get("template") != VOICE_TEMPLATE:
        return None
    period_key = thread_row.get("period_key") or ""
    day_key = period_key.split(":", 1)[0]
    return day_key or None
