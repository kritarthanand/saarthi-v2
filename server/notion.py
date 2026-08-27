"""Notion export for voice sessions — the alternative backend to obsidian.py.

Same contract as obsidian.export_day(db, user_id, day_key, tz), so main.py can
pick either at runtime. Two things make this simpler than the Obsidian path:

- The exporter *owns* the pages it writes. obsidian.py is a guest in a file the
  user also edits by hand, which is where its marker fences, splicing, atomic
  writes and mtime re-checks come from. Here a re-render is just "clear this
  page's children and append the new ones", and none of that is needed.
- No unsaved-editor-buffer hazard. That was a limit obsidian.py explicitly could
  not solve; Notion is the source of truth server-side, so it simply is not one.

What it costs instead is the network: auth, rate limits and transient failures.
Like the Obsidian path, export is a side effect of a chat write and must never
fail the request that triggered it, so everything here degrades to a status dict.

Disabled (every entry point a no-op) when NOTION_TOKEN is unset.

Setup: create an internal integration at notion.so/my-integrations, share ONE
parent page with it, and set NOTION_TOKEN + NOTION_PARENT_PAGE_ID. The database
is created under that page on first export — pin its id in NOTION_DATABASE_ID
afterwards to skip the lookup.
"""

from __future__ import annotations

import logging
import os
from datetime import date
from typing import Any
from zoneinfo import ZoneInfo

import httpx

from voice_sessions import (
    collect_day_sessions,
    fmt_time,
    session_duration,
)

logger = logging.getLogger(__name__)

API = "https://api.notion.com/v1"
# Pinned deliberately. 2025-09-03 splits databases into data sources and would
# change every call below; upgrade as a considered change, not by drifting.
NOTION_VERSION = "2022-06-28"

DB_TITLE = "Saarthi Voice Sessions"

# Notion caps rich_text at 2000 chars per object and 100 blocks per append.
TEXT_LIMIT = 2000
BLOCK_LIMIT = 100

_TIMEOUT = httpx.Timeout(20.0, connect=10.0)


# ── Config ────────────────────────────────────────────────────────────────────

def _token() -> str | None:
    return (os.environ.get("NOTION_TOKEN") or "").strip() or None


def _parent_page_id() -> str | None:
    return (os.environ.get("NOTION_PARENT_PAGE_ID") or "").strip() or None


def _configured_db_id() -> str | None:
    return (os.environ.get("NOTION_DATABASE_ID") or "").strip() or None


def is_enabled() -> bool:
    return _token() is not None and (
        _configured_db_id() is not None or _parent_page_id() is not None
    )


# ── HTTP ──────────────────────────────────────────────────────────────────────

def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {_token()}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }


def _request(client: httpx.Client, method: str, path: str, **kwargs: Any) -> dict:
    resp = client.request(method, f"{API}{path}", headers=_headers(), **kwargs)
    if resp.status_code >= 400:
        # Surface Notion's own message — its 400s name the offending property,
        # which is far more useful than the status code alone.
        raise RuntimeError(f"notion {method} {path} -> {resp.status_code}: {resp.text[:300]}")
    return resp.json()


# ── Database bootstrap ────────────────────────────────────────────────────────

# Cached per process: the id is stable, and re-searching on every clip would
# burn a request against a 3/sec budget for an answer that never changes.
_db_id_cache: str | None = None

DB_PROPERTIES: dict[str, Any] = {
    # Title carries "<Coach> · <date>" so the page reads sensibly in a list view.
    "Name": {"title": {}},
    "Date": {"date": {}},
    "Coach": {
        "select": {
            "options": [
                {"name": "Nakula", "color": "pink"},
                {"name": "Bheem", "color": "orange"},
                {"name": "Arjun", "color": "blue"},
                {"name": "Yudi", "color": "green"},
                {"name": "Sahdev", "color": "purple"},
            ]
        }
    },
    "Clips": {"number": {}},
    "Duration (s)": {"number": {}},
    # The idempotency key. One page per (day, coach); re-exporting finds this
    # rather than creating a duplicate.
    "Key": {"rich_text": {}},
}


def _find_existing_db(client: httpx.Client, parent_page_id: str) -> str | None:
    """Look for a database we already made under the parent page."""
    payload = {
        "query": DB_TITLE,
        "filter": {"value": "database", "property": "object"},
    }
    data = _request(client, "POST", "/search", json=payload)
    for result in data.get("results", []):
        parent = result.get("parent") or {}
        if parent.get("page_id", "").replace("-", "") != parent_page_id.replace("-", ""):
            continue
        title = "".join(t.get("plain_text", "") for t in result.get("title", []))
        if title.strip() == DB_TITLE:
            return result["id"]
    return None


def ensure_database(client: httpx.Client) -> str:
    """Return the database id, creating the database if it does not exist yet."""
    global _db_id_cache

    pinned = _configured_db_id()
    if pinned:
        return pinned
    if _db_id_cache:
        return _db_id_cache

    parent = _parent_page_id()
    if not parent:
        raise RuntimeError("NOTION_PARENT_PAGE_ID is unset and NOTION_DATABASE_ID is not pinned")

    existing = _find_existing_db(client, parent)
    if existing:
        _db_id_cache = existing
        return existing

    created = _request(
        client,
        "POST",
        "/databases",
        json={
            "parent": {"type": "page_id", "page_id": parent},
            "title": [{"type": "text", "text": {"content": DB_TITLE}}],
            "properties": DB_PROPERTIES,
        },
    )
    _db_id_cache = created["id"]
    logger.info(
        "notion: created database %s (%s) — pin it as NOTION_DATABASE_ID to skip the lookup",
        DB_TITLE, _db_id_cache,
    )
    return _db_id_cache


# ── Rendering ─────────────────────────────────────────────────────────────────

def _chunks(text: str, size: int = TEXT_LIMIT) -> list[str]:
    return [text[i:i + size] for i in range(0, len(text), size)] or [""]


def _rich(text: str, *, bold: bool = False, italic: bool = False) -> list[dict]:
    return [
        {
            "type": "text",
            "text": {"content": chunk},
            "annotations": {"bold": bold, "italic": italic},
        }
        for chunk in _chunks(text)
    ]


def _para(text: str, **kw: Any) -> dict:
    return {"object": "block", "type": "paragraph",
            "paragraph": {"rich_text": _rich(text, **kw)}}


def render_blocks(sessions: list[dict], tz: ZoneInfo) -> list[dict]:
    """One heading per sitting, the spoken clips as quotes, the reply as prose."""
    blocks: list[dict] = []
    for session in sessions:
        started = fmt_time(session["started_at"], tz)
        total = session_duration(session)
        heading = f"{session['coach_name']} · {started}".rstrip(" ·")

        blocks.append({
            "object": "block", "type": "heading_3",
            "heading_3": {"rich_text": _rich(heading)},
        })

        meta_bits = [f"{len(session['segments'])} clip" + ("" if len(session["segments"]) == 1 else "s")]
        if total:
            meta_bits.append(f"{total}s")
        blocks.append(_para(" · ".join(meta_bits), italic=True))

        # Spoken clips as quotes so they stay visually distinct from the reply.
        for seg in session["segments"]:
            content = (seg.get("content") or "").strip()
            if content:
                blocks.append({
                    "object": "block", "type": "quote",
                    "quote": {"rich_text": _rich(content)},
                })

        for reply in session["replies"]:
            content = (reply.get("content") or "").strip()
            if content:
                blocks.append(_para(f"{session['coach_name']} — {content}"))

    return blocks


# ── Page upsert ───────────────────────────────────────────────────────────────

def _find_page(client: httpx.Client, db_id: str, key: str) -> str | None:
    data = _request(
        client, "POST", f"/databases/{db_id}/query",
        json={"filter": {"property": "Key", "rich_text": {"equals": key}}, "page_size": 1},
    )
    results = data.get("results", [])
    return results[0]["id"] if results else None


def _clear_children(client: httpx.Client, page_id: str) -> None:
    """Delete every existing block so the page can be re-rendered wholesale.

    Same reasoning as the Obsidian region: a late reply has to be able to repair
    the page, so each export rewrites rather than appends.
    """
    cursor: str | None = None
    block_ids: list[str] = []
    while True:
        params = {"page_size": 100}
        if cursor:
            params["start_cursor"] = cursor
        data = _request(client, "GET", f"/blocks/{page_id}/children", params=params)
        block_ids.extend(b["id"] for b in data.get("results", []))
        if not data.get("has_more"):
            break
        cursor = data.get("next_cursor")

    for block_id in block_ids:
        _request(client, "DELETE", f"/blocks/{block_id}")


def _append_children(client: httpx.Client, page_id: str, blocks: list[dict]) -> None:
    for i in range(0, len(blocks), BLOCK_LIMIT):
        _request(
            client, "PATCH", f"/blocks/{page_id}/children",
            json={"children": blocks[i:i + BLOCK_LIMIT]},
        )


def _properties(coach: str, day: str, clips: int, seconds: int, key: str) -> dict:
    return {
        "Name": {"title": [{"type": "text", "text": {"content": f"{coach} · {day}"}}]},
        "Date": {"date": {"start": day}},
        "Coach": {"select": {"name": coach}},
        "Clips": {"number": clips},
        "Duration (s)": {"number": seconds},
        "Key": {"rich_text": [{"type": "text", "text": {"content": key}}]},
    }


# ── Entry point ───────────────────────────────────────────────────────────────

def export_day(db: Any, user_id: str, day_key: str, tz: ZoneInfo) -> dict[str, Any]:
    """Rewrite one Notion page per (day, coach) for `day_key`.

    Mirrors obsidian.export_day's contract exactly, including never raising.
    """
    if not is_enabled():
        return {"status": "disabled"}

    try:
        date.fromisoformat(day_key)
    except ValueError:
        return {"status": "bad_day_key", "day": day_key}

    try:
        sessions = collect_day_sessions(db, user_id, day_key)
        if not sessions:
            return {"status": "no_sessions", "day": day_key}

        # One page per coach, so two brothers on the same day stay separate.
        by_coach: dict[str, list[dict]] = {}
        for session in sessions:
            by_coach.setdefault(session["coach_name"], []).append(session)

        pages: list[str] = []
        with httpx.Client(timeout=_TIMEOUT) as client:
            db_id = ensure_database(client)

            for coach, coach_sessions in by_coach.items():
                key = f"{day_key}:{coach.lower()}"
                clips = sum(len(s["segments"]) for s in coach_sessions)
                seconds = sum(session_duration(s) for s in coach_sessions)
                props = _properties(coach, day_key, clips, seconds, key)
                blocks = render_blocks(coach_sessions, tz)

                page_id = _find_page(client, db_id, key)
                if page_id:
                    _request(client, "PATCH", f"/pages/{page_id}", json={"properties": props})
                    _clear_children(client, page_id)
                    _append_children(client, page_id, blocks)
                else:
                    created = _request(
                        client, "POST", "/pages",
                        json={
                            "parent": {"database_id": db_id},
                            "properties": props,
                            "children": blocks[:BLOCK_LIMIT],
                        },
                    )
                    page_id = created["id"]
                    if len(blocks) > BLOCK_LIMIT:
                        _append_children(client, page_id, blocks[BLOCK_LIMIT:])
                pages.append(page_id)

        return {
            "status": "updated",
            "day": day_key,
            "database": db_id,
            "pages": len(pages),
            "sessions": len(sessions),
        }
    except Exception as e:  # noqa: BLE001 — export must never break the caller
        logger.exception("notion export failed for %s", day_key)
        return {"status": "error", "day": day_key, "error": str(e)[:300]}
