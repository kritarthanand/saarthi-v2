import os
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client

load_dotenv()

_scheduler = BackgroundScheduler(timezone="UTC")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    _sync_reset_schedules()
    # Re-sync once an hour so profile edits (timezone / day_start_hour changes)
    # take effect without a server restart. Cheap — distinct schedules across N
    # users is at most ~24 buckets, two SELECTs.
    _scheduler.add_job(
        _sync_reset_schedules, "cron", minute=15, id="resync_schedules"
    )
    _scheduler.start()
    yield
    _scheduler.shutdown(wait=False)


app = FastAPI(title="Saarthi V2", version="0.1.0", lifespan=lifespan)

# CORS — Expo web bundler serves on a different origin than the API, and so
# might external dev tools. Open it up in dev; tighten when real auth lands.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


class PatchEntryBody(BaseModel):
    # Shallow-merge into the existing meta. None means "unset that key".
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


def _safe_tz(tz_str: str) -> ZoneInfo:
    try:
        return ZoneInfo(tz_str)
    except (ZoneInfoNotFoundError, Exception):
        return ZoneInfo("America/Los_Angeles")  # DEFAULT_TZ defined below


def _ritual_date(dt: datetime, tz: ZoneInfo, day_start_hour: int) -> date:
    """Return the ritual 'day' a moment belongs to.

    If the local time is before day_start_hour (e.g. 3am when day starts at 4am)
    the moment belongs to the previous ritual day.
    """
    local = dt.astimezone(tz)
    if local.hour < day_start_hour:
        return (local - timedelta(days=1)).date()
    return local.date()


def _is_today(created_at_str: str, tz: ZoneInfo, day_start_hour: int) -> bool:
    try:
        now = datetime.now(timezone.utc)
        return (
            _ritual_date(_parse_ts(created_at_str), tz, day_start_hour)
            == _ritual_date(now, tz, day_start_hour)
        )
    except Exception:
        return False


DEFAULT_TZ = ZoneInfo("America/Los_Angeles")
DEFAULT_DAY_START_HOUR = 0


def _row_to_schedule(row: dict | None) -> tuple[ZoneInfo, int]:
    if not row:
        return DEFAULT_TZ, DEFAULT_DAY_START_HOUR
    return (
        _safe_tz(row.get("timezone") or "America/Los_Angeles"),
        int(row.get("day_start_hour") or 0),
    )


def _get_user_schedule(db: Client, user_id: str) -> tuple[ZoneInfo, int]:
    """Return (timezone, day_start_hour) from v2_profiles, falling back to defaults."""
    try:
        row = (
            db.table("v2_profiles")
            .select("timezone, day_start_hour")
            .eq("id", user_id)
            .maybeSingle()
            .execute()
            .data
        )
        return _row_to_schedule(row)
    except Exception:
        return DEFAULT_TZ, DEFAULT_DAY_START_HOUR


def _batch_user_schedules(db: Client, user_ids: list[str]) -> dict[str, tuple[ZoneInfo, int]]:
    """One-shot fetch of schedules for many users; missing ids get the defaults."""
    if not user_ids:
        return {}
    out: dict[str, tuple[ZoneInfo, int]] = {uid: (DEFAULT_TZ, DEFAULT_DAY_START_HOUR) for uid in user_ids}
    try:
        rows = (
            db.table("v2_profiles")
            .select("id, timezone, day_start_hour")
            .in_("id", user_ids)
            .execute()
            .data
        )
        for row in rows or []:
            out[row["id"]] = _row_to_schedule(row)
    except Exception:
        pass
    return out


def _enrich_thread(
    thread_row: dict,
    entries: list[dict],
    tz: ZoneInfo,
    day_start_hour: int,
) -> ThreadOut:
    """Attach active_entry_id and last_entry_at computed from entries.

    active_entry_id is only set when the entry was created today (per the user's
    schedule) — so the Today view never surfaces a stale entry from a previous day.
    """
    thread_entries = [e for e in entries if e["thread_id"] == thread_row["id"]]
    active = next(
        (e for e in thread_entries if e["status"] == "active" and _is_today(e["created_at"], tz, day_start_hour)),
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


def _create_today_entry(db: Client, thread_id: str, template: str) -> str:
    """Insert today's entry for a thread and seed its template items. Returns the new entry id."""
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

    return entry_id


def _ensure_today_entry(
    db: Client,
    thread_id: str,
    template: str,
    tz: ZoneInfo,
    day_start_hour: int,
    known_entries: list[dict] | None = None,
) -> str | None:
    """Return the existing today-entry id for a thread, creating one if missing.

    If `known_entries` is provided it's used in lieu of a fresh DB read — pass
    pre-fetched rows (filtered to this thread) to avoid an N+1 query.
    """
    entries = known_entries
    if entries is None:
        entries = (
            db.table("v2_thread_entries")
            .select("id, created_at, status")
            .eq("thread_id", thread_id)
            .execute()
            .data
        )

    for e in entries:
        if _is_today(e["created_at"], tz, day_start_hour):
            return e["id"]

    return _create_today_entry(db, thread_id, template)


def _daily_reset_job(target_tz_key: str | None = None, target_hour: int | None = None) -> dict:
    """Ensure today's entries exist for ritual threads.

    Without args, processes every user (used by manual /cron/daily-reset trigger).
    With (target_tz_key, target_hour), processes only users whose profile matches
    that schedule — the per-schedule cron jobs registered by `_sync_reset_schedules`
    call it this way so each user is touched exactly when their day rolls over.
    """
    db = get_supabase()
    scoped = target_tz_key is not None and target_hour is not None

    threads = (
        db.table("v2_threads")
        .select("id, user_id, template")
        .in_("template", list(DAILY_RESET_TEMPLATES))
        .execute()
        .data
    )
    if not threads:
        return {"created": 0, "skipped": 0, "scope": _scope_label(target_tz_key, target_hour)}

    thread_ids = [t["id"] for t in threads]
    user_ids = list({t["user_id"] for t in threads})

    entries_by_thread: dict[str, list[dict]] = {tid: [] for tid in thread_ids}
    for e in (
        db.table("v2_thread_entries")
        .select("id, thread_id, created_at")
        .in_("thread_id", thread_ids)
        .execute()
        .data
    ):
        entries_by_thread.setdefault(e["thread_id"], []).append(e)

    schedules = _batch_user_schedules(db, user_ids)

    created, skipped = 0, 0
    for t in threads:
        tz, day_start_hour = schedules[t["user_id"]]
        if scoped:
            user_key = (tz.key, day_start_hour)
            # The default-schedule job is responsible for any user whose profile
            # matches the default — including users with no profile row at all
            # (they fall through to DEFAULT_TZ/DEFAULT_DAY_START_HOUR in batch_user_schedules).
            if user_key != (target_tz_key, target_hour):
                continue

        thread_entries = entries_by_thread.get(t["id"], [])
        if any(_is_today(e["created_at"], tz, day_start_hour) for e in thread_entries):
            skipped += 1
            continue
        _ensure_today_entry(db, t["id"], t["template"], tz, day_start_hour, known_entries=thread_entries)
        created += 1

    return {"created": created, "skipped": skipped, "scope": _scope_label(target_tz_key, target_hour)}


def _scope_label(tz_key: str | None, hour: int | None) -> str:
    if tz_key is None or hour is None:
        return "all"
    return f"{tz_key}@{hour:02d}"


def _sync_reset_schedules() -> dict:
    """Register one cron job per distinct (timezone, day_start_hour) in v2_profiles.

    Always includes the default (DEFAULT_TZ, DEFAULT_DAY_START_HOUR) so users
    without a profile row are still covered. Idempotent — removes stale schedules
    and adds new ones, called both at startup and on a refresh tick.
    """
    db = get_supabase()
    schedules: set[tuple[str, int]] = {(DEFAULT_TZ.key, DEFAULT_DAY_START_HOUR)}
    try:
        rows = db.table("v2_profiles").select("timezone, day_start_hour").execute().data or []
        for row in rows:
            tz = _safe_tz(row.get("timezone") or "America/Los_Angeles")
            hour = int(row.get("day_start_hour") or 0)
            schedules.add((tz.key, hour))
    except Exception:
        # If profiles can't be read, fall back to just the default schedule —
        # better to fire once a day at LA midnight than to silently skip everything.
        pass

    desired_job_ids = {f"reset:{tz_key}:{hour:02d}" for tz_key, hour in schedules}
    existing_resets = {j.id for j in _scheduler.get_jobs() if j.id.startswith("reset:")}

    for stale in existing_resets - desired_job_ids:
        _scheduler.remove_job(stale)

    for tz_key, hour in schedules:
        job_id = f"reset:{tz_key}:{hour:02d}"
        # replace_existing handles idempotency safely under concurrent calls
        # (e.g. startup + the :15 resync tick racing on a slow boot).
        _scheduler.add_job(
            _daily_reset_job,
            "cron",
            hour=hour,
            minute=0,
            timezone=tz_key,
            id=job_id,
            kwargs={"target_tz_key": tz_key, "target_hour": hour},
            replace_existing=True,
        )

    return {
        "active_schedules": sorted(desired_job_ids),
        "added": sorted(desired_job_ids - existing_resets),
        "removed": sorted(existing_resets - desired_job_ids),
    }


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "saarthi-v2"}


@app.post("/cron/daily-reset")
def trigger_daily_reset(x_cron_secret: str = Header(default="")) -> dict:
    """Manually trigger the reset job across all users (useful for testing / backfill).

    Requires the X-Cron-Secret header to match the CRON_SECRET env var. If
    CRON_SECRET is unset the endpoint is disabled — preventing accidental
    unauthenticated writes in any environment.
    """
    expected = os.environ.get("CRON_SECRET", "")
    if not expected or x_cron_secret != expected:
        raise HTTPException(status_code=403, detail="Forbidden")
    return _daily_reset_job()


@app.get("/cron/schedules")
def list_schedules(x_cron_secret: str = Header(default="")) -> dict:
    """List the currently-registered reset cron schedules (auth-gated for parity)."""
    expected = os.environ.get("CRON_SECRET", "")
    if not expected or x_cron_secret != expected:
        raise HTTPException(status_code=403, detail="Forbidden")
    jobs = []
    for j in _scheduler.get_jobs():
        if not j.id.startswith("reset:"):
            continue
        jobs.append({
            "id": j.id,
            "next_run_at": str(j.next_run_time) if j.next_run_time else None,
        })
    return {"jobs": sorted(jobs, key=lambda x: x["id"])}


# ── Threads ───────────────────────────────────────────────────────────────────

@app.get("/threads", response_model=list[ThreadOut])
def list_threads(coach_id: str | None = None, today: bool = False):
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

    tz, day_start_hour = _get_user_schedule(db, user_id)

    # Lazy-create today's entry for any ritual thread that doesn't have one yet
    # (handles the case where the cron missed a run or the user changed their schedule).
    needs_today = {
        t["id"]: t["template"]
        for t in threads
        if t["template"] in DAILY_RESET_TEMPLATES
        and not any(
            e["thread_id"] == t["id"] and _is_today(e["created_at"], tz, day_start_hour)
            for e in entries
        )
    }
    for thread_id, template in needs_today.items():
        # We already know there's no today-entry — call the create helper directly
        # so we don't re-fetch the rows we already have.
        new_entry_id = _create_today_entry(db, thread_id, template)
        entries.append({
            "id": new_entry_id,
            "thread_id": thread_id,
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    out = [_enrich_thread(t, entries, tz, day_start_hour) for t in threads]
    if today:
        # Server-side gate for the Today view — drop any thread without a
        # today-entry so no client cache state can leak yesterday's threads.
        out = [t for t in out if t.active_entry_id is not None]
    return out


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

    tz, day_start_hour = _get_user_schedule(db, user_id)
    thread_out = _enrich_thread(thread_rows[0], entries_raw, tz, day_start_hour)
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
    # Template rows win when present; otherwise fall back to caller-supplied items
    # so non-ritual threads (and ad-hoc test fixtures) keep working.
    items_to_insert = template_items if template_items else (body.items or [])
    if items_to_insert:
        result = db.table("v2_entry_items").insert(
            [{**item, "entry_id": entry_id} for item in items_to_insert]
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


@app.patch("/entries/{entry_id}", response_model=EntryOut)
def patch_entry(entry_id: str, body: PatchEntryBody):
    """Shallow-merge a meta patch into the entry. Keys with value `None` are deleted."""
    user_id = get_dev_user_id()
    db = get_supabase()

    existing = _assert_entry_owner(db, entry_id, user_id)

    if body.meta is None:
        return _row_to_entry(existing)

    merged = {**(existing.get("meta") or {})}
    for k, v in body.meta.items():
        if v is None:
            merged.pop(k, None)
        else:
            merged[k] = v

    rows = (
        db.table("v2_thread_entries")
        .update({"meta": merged})
        .eq("id", entry_id)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Entry not found")
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
        .select("text, created_at")
        .eq("entry_id", morning_entry_id)
        .eq("item_ref", item_id)
        .eq("role", "user")
        .order("created_at")
        .execute()
        .data
    )
    if not msgs:
        return
    # Last message wins — edits and corrections supersede the first attempt.
    top3_text = msgs[-1]["text"]

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
