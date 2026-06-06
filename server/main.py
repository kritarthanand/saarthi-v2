import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client

load_dotenv()

LA_TZ = ZoneInfo("America/Los_Angeles")
_scheduler = BackgroundScheduler(timezone="America/Los_Angeles")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    _scheduler.add_job(_daily_reset_job, "cron", hour=4, minute=0, id="daily_reset")
    _scheduler.start()
    yield
    _scheduler.shutdown(wait=False)


app = FastAPI(title="Saarthi V2", version="0.1.0", lifespan=lifespan)

# ── Supabase client ───────────────────────────────────────────────────────────

_supabase: Client | None = None


def get_supabase() -> Client:
    global _supabase
    if _supabase is None:
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_KEY"]
        _supabase = create_client(url, key)
    return _supabase


# TODO: auth — replace with real user from JWT once auth middleware lands.
def get_dev_user_id() -> str:
    uid = os.environ.get("SAARTHI_DEV_USER_ID")
    if not uid:
        raise HTTPException(status_code=500, detail="SAARTHI_DEV_USER_ID not set")
    return uid


# ── Pydantic models (mirror src/lib/threads.ts, snake_case on wire) ───────────

class ThreadOut(BaseModel):
    id: str
    template: str
    coach_id: str
    tag: str
    title: str
    active_entry_id: str | None
    last_entry_at: str | None


class EntryOut(BaseModel):
    id: str
    thread_id: str
    status: str
    label: str | None
    meta: dict[str, Any]
    created_at: str
    closed_at: str | None


class EntryItemOut(BaseModel):
    id: str
    entry_id: str
    section: str | None
    label: str
    done: bool
    points: int
    position: int
    priority: str | None
    scheduled: str | None
    meta: dict[str, Any]


class EntryMessageOut(BaseModel):
    id: str
    entry_id: str
    role: str
    text: str
    item_ref: str | None
    meta: dict[str, Any]
    created_at: str


class CreateEntryBody(BaseModel):
    label: str | None = None
    meta: dict[str, Any] = {}
    items: list[dict[str, Any]] = []
    messages: list[dict[str, Any]] = []


class PatchItemBody(BaseModel):
    done: bool | None = None
    label: str | None = None
    points: int | None = None
    priority: str | None = None
    scheduled: str | None = None
    meta: dict[str, Any] | None = None


class CreateMessageBody(BaseModel):
    role: str
    text: str
    item_ref: str | None = None
    meta: dict[str, Any] = {}


# ── Ownership helpers (service key bypasses RLS — we enforce auth in code) ────

def _assert_entry_owner(db: Client, entry_id: str, user_id: str) -> dict:
    """Return the entry row if it belongs to user_id, else 404."""
    rows = (
        db.table("v2_thread_entries")
        .select("*, v2_threads!inner(user_id)")
        .eq("id", entry_id)
        .eq("v2_threads.user_id", user_id)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Entry not found")
    return rows[0]


def _assert_item_owner(db: Client, item_id: str, user_id: str) -> dict:
    """Return the item row if it belongs to user_id (via entry → thread), else 404.

    Uses two explicit queries rather than a double-nested PostgREST embed filter
    to avoid relying on a supabase-py/PostgREST version-dependent code path that
    could silently ignore the nested predicate.
    """
    item_rows = (
        db.table("v2_entry_items").select("*").eq("id", item_id).execute().data
    )
    if not item_rows:
        raise HTTPException(status_code=404, detail="Item not found")
    # Reuse _assert_entry_owner to verify the entry's thread belongs to user_id.
    _assert_entry_owner(db, item_rows[0]["entry_id"], user_id)
    return item_rows[0]


# ── Row mappers ───────────────────────────────────────────────────────────────

def _parse_ts(ts: str) -> datetime:
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))


def _is_today_la(created_at_str: str) -> bool:
    """Return True if the timestamp falls on today's date in LA time."""
    try:
        dt = _parse_ts(created_at_str).astimezone(LA_TZ)
        return dt.date() == datetime.now(LA_TZ).date()
    except Exception:
        return False


def _enrich_thread(thread_row: dict, entries: list[dict]) -> ThreadOut:
    """Attach active_entry_id and last_entry_at computed from entries.

    active_entry_id is only set when the entry was created today (LA time) —
    so the Today view never surfaces a stale entry from a previous day.
    """
    thread_entries = [e for e in entries if e["thread_id"] == thread_row["id"]]
    active = next(
        (e for e in thread_entries if e["status"] == "active" and _is_today_la(e["created_at"])),
        None,
    )
    last = max(thread_entries, key=lambda e: _parse_ts(e["created_at"]), default=None)
    return ThreadOut(
        id=thread_row["id"],
        template=thread_row["template"],
        coach_id=thread_row["coach_id"],
        tag=thread_row["tag"],
        title=thread_row.get("title") or thread_row["tag"],
        active_entry_id=active["id"] if active else None,
        last_entry_at=last["created_at"] if last else None,
    )


def _row_to_entry(row: dict) -> EntryOut:
    return EntryOut(
        id=row["id"],
        thread_id=row["thread_id"],
        status=row["status"],
        label=row.get("label"),
        meta=row.get("meta") or {},
        created_at=row["created_at"],
        closed_at=row.get("closed_at"),
    )


def _row_to_item(row: dict) -> EntryItemOut:
    return EntryItemOut(
        id=row["id"],
        entry_id=row["entry_id"],
        section=row.get("section"),
        label=row["label"],
        done=row.get("done", False),
        points=row.get("points", 0),
        position=row.get("position", 0),
        priority=row.get("priority"),
        scheduled=row.get("scheduled"),
        meta=row.get("meta") or {},
    )


def _row_to_message(row: dict) -> EntryMessageOut:
    return EntryMessageOut(
        id=row["id"],
        entry_id=row["entry_id"],
        role=row["role"],
        text=row["text"],
        item_ref=row.get("item_ref"),
        meta=row.get("meta") or {},
        created_at=row["created_at"],
    )


# ── Daily reset ───────────────────────────────────────────────────────────────

DAILY_RESET_TEMPLATES = ("morning_ritual", "evening_ritual")


def _daily_reset_job() -> dict:
    """Close yesterday's open entries and create fresh ones for today.

    Runs at 4:00 AM America/Los_Angeles. Safe to call manually via
    POST /cron/daily-reset (e.g. to backfill after a missed run).
    """
    db = get_supabase()
    now_utc = datetime.now(timezone.utc).isoformat()
    today_la = datetime.now(LA_TZ).date()

    threads = (
        db.table("v2_threads")
        .select("id, user_id, template")
        .in_("template", list(DAILY_RESET_TEMPLATES))
        .execute()
        .data
    )

    created, skipped, closed = 0, 0, 0
    for t in threads:
        thread_id, template = t["id"], t["template"]

        active = (
            db.table("v2_thread_entries")
            .select("id, created_at")
            .eq("thread_id", thread_id)
            .eq("status", "active")
            .execute()
            .data
        )

        if active:
            entry_date = _parse_ts(active[0]["created_at"]).astimezone(LA_TZ).date()
            if entry_date == today_la:
                skipped += 1
                continue
            # Close the stale entry
            db.table("v2_thread_entries").update(
                {"status": "closed", "closed_at": now_utc}
            ).eq("id", active[0]["id"]).execute()
            closed += 1

        # Create today's entry
        row = (
            db.table("v2_thread_entries")
            .insert({"thread_id": thread_id, "meta": {}})
            .execute()
            .data[0]
        )
        entry_id = row["id"]

        template_items = (
            db.table("v2_ritual_template_items")
            .select("position, label, points, section, meta")
            .eq("template", template)
            .order("section", nullsfirst=True)
            .order("position")
            .execute()
            .data
        )
        if template_items:
            db.table("v2_entry_items").insert(
                [{**item, "entry_id": entry_id} for item in template_items]
            ).execute()
        created += 1

    return {"created": created, "closed": closed, "skipped": skipped}


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "saarthi-v2"}


@app.post("/cron/daily-reset")
def trigger_daily_reset() -> dict:
    """Manually trigger the 4 AM daily-reset job (useful for testing / backfill)."""
    return _daily_reset_job()


# ── Threads ───────────────────────────────────────────────────────────────────

@app.get("/threads", response_model=list[ThreadOut])
def list_threads(coach_id: str | None = None):
    # TODO: auth
    user_id = get_dev_user_id()
    db = get_supabase()

    q = db.table("v2_threads").select("*").eq("user_id", user_id)
    if coach_id:
        q = q.eq("coach_id", coach_id)
    threads = q.execute().data

    if not threads:
        return []

    thread_ids = [t["id"] for t in threads]
    entries = (
        db.table("v2_thread_entries")
        .select("id, thread_id, status, created_at")
        .in_("thread_id", thread_ids)
        .execute()
        .data
    )

    return [_enrich_thread(t, entries) for t in threads]


@app.get("/threads/{thread_id}")
def get_thread(thread_id: str):
    # TODO: auth
    user_id = get_dev_user_id()
    db = get_supabase()

    thread_rows = (
        db.table("v2_threads")
        .select("*")
        .eq("id", thread_id)
        .eq("user_id", user_id)
        .execute()
        .data
    )
    if not thread_rows:
        raise HTTPException(status_code=404, detail="Thread not found")

    entries_raw = (
        db.table("v2_thread_entries")
        .select("*")
        .eq("thread_id", thread_id)
        .order("created_at", desc=True)
        .execute()
        .data
    )

    thread_out = _enrich_thread(thread_rows[0], entries_raw)
    entries_out = [_row_to_entry(e) for e in entries_raw]

    return {"thread": thread_out, "entries": entries_out}


# ── Entries ───────────────────────────────────────────────────────────────────

@app.get("/entries/{entry_id}")
def get_entry(entry_id: str):
    # TODO: auth
    user_id = get_dev_user_id()
    db = get_supabase()

    entry_row = _assert_entry_owner(db, entry_id, user_id)

    items = (
        db.table("v2_entry_items")
        .select("*")
        .eq("entry_id", entry_id)
        .order("position")
        .execute()
        .data
    )
    messages = (
        db.table("v2_entry_messages")
        .select("*")
        .eq("entry_id", entry_id)
        .order("created_at")
        .execute()
        .data
    )

    return {
        "entry": _row_to_entry(entry_row),
        "items": [_row_to_item(i) for i in items],
        "messages": [_row_to_message(m) for m in messages],
    }


@app.post("/threads/{thread_id}/entries", response_model=EntryOut, status_code=201)
def create_entry(thread_id: str, body: CreateEntryBody):
    # TODO: auth
    user_id = get_dev_user_id()
    db = get_supabase()

    # Verify thread belongs to user
    thread_rows = (
        db.table("v2_threads")
        .select("id, template")
        .eq("id", thread_id)
        .eq("user_id", user_id)
        .execute()
        .data
    )
    if not thread_rows:
        raise HTTPException(status_code=404, detail="Thread not found")

    # Check for existing active entry (the DB partial unique index enforces this
    # too, but we surface a friendly 422 before hitting the constraint).
    active_rows = (
        db.table("v2_thread_entries")
        .select("id")
        .eq("thread_id", thread_id)
        .eq("status", "active")
        .execute()
        .data
    )
    if active_rows:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "active_entry_exists",
                "active_entry_id": active_rows[0]["id"],
            },
        )

    row = (
        db.table("v2_thread_entries")
        .insert({"thread_id": thread_id, "label": body.label, "meta": body.meta})
        .execute()
        .data[0]
    )
    entry_id = row["id"]

    # Note: if either insert below fails the entry row is already committed, leaving
    # an active entry with no items/messages. The caller must close it before retrying.
    # Acceptable tradeoff — multi-table transactions require a DB function or RPC.
    template = thread_rows[0].get("template")
    template_items = (
        db.table("v2_ritual_template_items")
        .select("position, label, points, section, meta")
        .eq("template", template)
        .order("section", nullsfirst=True)
        .order("position")
        .execute()
        .data
    ) if template else []
    if template_items:
        result = db.table("v2_entry_items").insert(
            [{**item, "entry_id": entry_id} for item in template_items]
        ).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to seed entry items")

    if body.messages:
        result = db.table("v2_entry_messages").insert(
            [{**msg, "entry_id": entry_id} for msg in body.messages]
        ).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to seed entry messages")

    return _row_to_entry(row)


@app.patch("/entries/{entry_id}/close", response_model=EntryOut)
def close_entry(entry_id: str):
    # TODO: auth
    user_id = get_dev_user_id()
    db = get_supabase()

    # Verify ownership before mutating
    _assert_entry_owner(db, entry_id, user_id)

    closed_at = datetime.now(timezone.utc).isoformat()
    rows = (
        db.table("v2_thread_entries")
        .update({"status": "closed", "closed_at": closed_at})
        .eq("id", entry_id)
        .eq("status", "active")
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Active entry not found")

    thread_row = (
        db.table("v2_threads")
        .select("template")
        .eq("id", rows[0]["thread_id"])
        .single()
        .execute()
        .data
    )
    if thread_row and thread_row["template"] == "morning_ritual":
        _forward_morning_top3(db, entry_id, user_id)

    return _row_to_entry(rows[0])


def _forward_morning_top3(db: Client, morning_entry_id: str, user_id: str) -> None:
    items = (
        db.table("v2_entry_items")
        .select("id")
        .eq("entry_id", morning_entry_id)
        .eq("label", "Top 3 Goals for the day")
        .execute()
        .data
    )
    if not items:
        return
    item_id = items[0]["id"]

    msgs = (
        db.table("v2_entry_messages")
        .select("text")
        .eq("entry_id", morning_entry_id)
        .eq("item_ref", item_id)
        .eq("role", "user")
        .execute()
        .data
    )
    if not msgs:
        return
    top3_text = msgs[0]["text"]

    evening_threads = (
        db.table("v2_threads")
        .select("id")
        .eq("user_id", user_id)
        .eq("template", "evening_ritual")
        .execute()
        .data
    )
    if not evening_threads:
        return
    evening_thread_id = evening_threads[0]["id"]

    active_evening = (
        db.table("v2_thread_entries")
        .select("id, meta")
        .eq("thread_id", evening_thread_id)
        .eq("status", "active")
        .execute()
        .data
    )
    if not active_evening:
        return

    existing_meta = active_evening[0].get("meta") or {}
    db.table("v2_thread_entries").update(
        {"meta": {**existing_meta, "morning_top3": top3_text}}
    ).eq("id", active_evening[0]["id"]).execute()


# ── Entry items ───────────────────────────────────────────────────────────────

@app.patch("/entry_items/{item_id}", response_model=EntryItemOut)
def patch_item(item_id: str, body: PatchItemBody):
    # TODO: auth
    user_id = get_dev_user_id()
    db = get_supabase()

    # Verify ownership (items → entries → threads)
    _assert_item_owner(db, item_id, user_id)

    patch = body.model_dump(exclude_none=True)
    if not patch:
        raise HTTPException(status_code=422, detail="No fields to update")

    rows = (
        db.table("v2_entry_items").update(patch).eq("id", item_id).execute().data
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Item not found")
    return _row_to_item(rows[0])


# ── Entry messages ────────────────────────────────────────────────────────────

@app.post("/entries/{entry_id}/messages", response_model=EntryMessageOut, status_code=201)
def create_message(entry_id: str, body: CreateMessageBody):
    # TODO: auth
    user_id = get_dev_user_id()
    db = get_supabase()

    if body.role not in ("ai", "user"):
        raise HTTPException(status_code=422, detail="role must be 'ai' or 'user'")

    # Verify ownership before inserting
    _assert_entry_owner(db, entry_id, user_id)

    row = (
        db.table("v2_entry_messages")
        .insert(
            {
                "entry_id": entry_id,
                "role": body.role,
                "text": body.text,
                "item_ref": body.item_ref,
                "meta": body.meta,
            }
        )
        .execute()
        .data[0]
    )
    return _row_to_message(row)


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "3001"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
