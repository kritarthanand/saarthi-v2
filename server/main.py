import os
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from postgrest.exceptions import APIError as PostgRESTAPIError
from supabase import create_client, Client

load_dotenv()

_scheduler = BackgroundScheduler(timezone="UTC")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    _sync_reset_schedules()
    # Re-sync once an hour so profile edits (timezone / day_start_hour changes)
    # take effect without a server restart.
    _scheduler.add_job(
        _sync_reset_schedules, "cron", minute=15, id="resync_schedules"
    )
    _scheduler.start()
    yield
    _scheduler.shutdown(wait=False)


app = FastAPI(title="Saarthi V2", version="0.1.0", lifespan=lifespan)

# CORS — open in dev; tighten when real auth lands.
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


# ── Pydantic models ───────────────────────────────────────────────────────────

class ThreadOut(BaseModel):
    id: str
    user_id: str
    template: str
    coach_id: str
    tag: str
    title: str | None
    period_key: str | None
    archived_at: str | None
    meta: dict[str, Any]
    created_at: str
    task_count: int = 0
    done_count: int = 0
    points_earned: int = 0
    points_total: int = 0


class TaskOut(BaseModel):
    id: str
    thread_id: str
    user_id: str
    title: str
    status: str  # open | in_progress | done | dropped
    priority: str  # high | med | low
    points: int
    section: str | None
    scheduled_for: str | None  # date as YYYY-MM-DD
    due_at: str | None
    position: int
    meta: dict[str, Any]
    created_at: str
    updated_at: str


class MessageOut(BaseModel):
    id: str
    thread_id: str
    role: str  # user | ai | system | tool
    content: str
    task_ref: str | None
    meta: dict[str, Any]
    created_at: str


class CreateThreadBody(BaseModel):
    template: str  # must be in API_TEMPLATES (freeform, workout_logging, focus_time)
    title: str | None = None
    coach_id: str | None = None  # defaults to DEFAULT_COACHES[template]


class OccurrenceBody(BaseModel):
    template: str
    period_key: str  # caller computes and passes; server also validates/recomputes


class CreateTaskBody(BaseModel):
    title: str
    priority: str = "med"
    points: int = 0
    section: str | None = None
    scheduled_for: str | None = None
    due_at: str | None = None
    position: int = 0
    meta: dict[str, Any] = {}


class PatchTaskBody(BaseModel):
    title: str | None = None
    status: str | None = None
    priority: str | None = None
    points: int | None = None
    section: str | None = None
    scheduled_for: str | None = None
    due_at: str | None = None
    position: int | None = None
    meta: dict[str, Any] | None = None  # shallow-merge


class CreateMessageBody(BaseModel):
    role: str
    content: str
    task_ref: str | None = None
    meta: dict[str, Any] = {}


# ── Template metadata ─────────────────────────────────────────────────────────

THREAD_TAGS: dict[str, str] = {
    "morning_ritual":  "#MorningRitual",
    "evening_ritual":  "#EveningRitual",
    "weekly_ritual":   "#WeeklyRitual",
    "freeform":        "#Thread",
    "meal_logging":    "#MealLog",
    "workout_logging": "#WorkoutLog",
    "focus_time":      "#FocusTime",
    "clean_ritual":    "#CleanRitual",
    "catch_up":        "#CatchUp",
}

THREAD_TITLES: dict[str, str] = {
    "morning_ritual":  "Morning Ritual",
    "evening_ritual":  "Evening Ritual",
    "weekly_ritual":   "Weekly Ritual",
    "freeform":        "New Thread",
    "meal_logging":    "Meal Log",
    "workout_logging": "Workout",
    "focus_time":      "Focus Session",
    "clean_ritual":    "Clean Ritual",
    "catch_up":        "Catch Up",
}

DEFAULT_COACHES: dict[str, str] = {
    "morning_ritual":  "arjun",
    "evening_ritual":  "arjun",
    "weekly_ritual":   "yudi",
    "freeform":        "arjun",
    "meal_logging":    "bheem",
    "workout_logging": "bheem",
    "focus_time":      "arjun",
    "clean_ritual":    "yudi",
    "catch_up":        "yudi",
}

# Templates that are created by scheduler / occurrence upsert
SCHEDULED_TEMPLATES = {
    "morning_ritual", "evening_ritual", "weekly_ritual",
    "meal_logging", "clean_ritual", "catch_up",
}

# Templates creatable on-demand via POST /threads (no period_key, no uniqueness constraint)
API_TEMPLATES = {"freeform", "workout_logging", "focus_time"}

# Template cadence
TEMPLATE_CADENCE: dict[str, str] = {
    "morning_ritual":  "daily",
    "evening_ritual":  "daily",
    "weekly_ritual":   "weekly",
    "freeform":        "none",
    "meal_logging":    "daily",
    "workout_logging": "none",
    "focus_time":      "none",
    "clean_ritual":    "weekly",
    "catch_up":        "weekly",
}

SEED_TASKS: dict[str, list[dict]] = {
    "morning_ritual": [
        {"title": "Weight measurement",    "points": 2, "position": 0,  "meta": {"type": "action"}},
        {"title": "Dental Care",            "points": 2, "position": 1,  "meta": {"type": "action"}},
        {"title": "Shower",                 "points": 4, "position": 2,  "meta": {"type": "action"}},
        {"title": "Skin Care",              "points": 3, "position": 3,  "meta": {"type": "action"}},
        {"title": "Dress + Puja",           "points": 5, "position": 4,  "meta": {"type": "action"}},
        {"title": "Pills",                  "points": 3, "position": 5,  "meta": {"type": "action"}},
        {"title": "Get Water",              "points": 2, "position": 6,  "meta": {"type": "action"}},
        {"title": "Defrost food",           "points": 2, "position": 7,  "meta": {"type": "action"}},
        {"title": "Review Weekly Goals",    "points": 5, "position": 8,  "meta": {"type": "action"}},
        {"title": "Visualize",              "points": 5, "position": 9,  "meta": {"type": "action"}},
        {"title": "Top 3 Goals for the day","points": 8, "position": 10, "meta": {"type": "reflection"}},
        {"title": "Time Block for the day", "points": 6, "position": 11, "meta": {"type": "reflection"}},
        {"title": "Read 10 min",            "points": 5, "position": 12, "meta": {"type": "action"}},
    ],
    "evening_ritual": [
        {"title": "Meal Logs for the day",               "points": 5, "position": 0, "meta": {"type": "action"}},
        {"title": "Workout for the day",                 "points": 5, "position": 1, "meta": {"type": "action"}},
        {"title": "Review top 3 priorities for the day", "points": 8, "position": 2, "meta": {"type": "morning_review"}},
        {"title": "Review focus sessions",               "points": 5, "position": 3, "meta": {"type": "action"}},
        {"title": "Plan the next day",                   "points": 8, "position": 4, "meta": {"type": "reflection"}},
    ],
    "weekly_ritual": [
        {"title": "What were your 3 biggest wins this week?",    "points": 5, "position": 0, "section": "review", "meta": {"type": "reflection"}},
        {"title": "What drained you the most?",                  "points": 5, "position": 1, "section": "review", "meta": {"type": "reflection"}},
        {"title": "Where did you lose focus or time?",           "points": 5, "position": 2, "section": "review", "meta": {"type": "reflection"}},
        {"title": "One thing you're proud of yourself for",      "points": 5, "position": 3, "section": "review", "meta": {"type": "reflection"}},
        {"title": "Which habit or ritual needs more attention?", "points": 5, "position": 4, "section": "review", "meta": {"type": "reflection"}},
        {"title": "What's the one most important thing this week?", "points": 5, "position": 0, "section": "plan", "meta": {"type": "reflection"}},
        {"title": "Which habits do you want to protect?",            "points": 5, "position": 1, "section": "plan", "meta": {"type": "reflection"}},
        {"title": "What will you do differently vs last week?",       "points": 5, "position": 2, "section": "plan", "meta": {"type": "reflection"}},
        {"title": "Any blocks or challenges to watch for?",           "points": 5, "position": 3, "section": "plan", "meta": {"type": "reflection"}},
    ],
    "freeform": [],
    "meal_logging": [
        {"title": "Log breakfast",         "points": 3, "position": 0, "meta": {"type": "nutrition"}},
        {"title": "Log lunch",             "points": 3, "position": 1, "meta": {"type": "nutrition"}},
        {"title": "Log dinner",            "points": 3, "position": 2, "meta": {"type": "nutrition"}},
        {"title": "Log snacks",            "points": 2, "position": 3, "meta": {"type": "nutrition"}},
        {"title": "Track water intake",    "points": 2, "position": 4, "meta": {"type": "nutrition"}},
        {"title": "Log calories / macros", "points": 4, "position": 5, "meta": {"type": "nutrition"}},
    ],
    "workout_logging": [
        {"title": "Warm up — 5-10 min",      "points": 3, "position": 0, "meta": {"type": "fitness"}},
        {"title": "Main workout",             "points": 8, "position": 1, "meta": {"type": "fitness"}},
        {"title": "Cool down + stretch",      "points": 3, "position": 2, "meta": {"type": "fitness"}},
        {"title": "Log sets, reps, or time",  "points": 4, "position": 3, "meta": {"type": "fitness"}},
        {"title": "Hydration check",          "points": 2, "position": 4, "meta": {"type": "fitness"}},
    ],
    "focus_time": [
        {"title": "Set intention — what will you finish?", "points": 5, "position": 0, "meta": {"type": "focus"}},
        {"title": "Eliminate distractions",               "points": 4, "position": 1, "meta": {"type": "focus"}},
        {"title": "Focus block 1 — 45-90 min",            "points": 8, "position": 2, "meta": {"type": "focus"}},
        {"title": "Short break — 5-15 min",               "points": 2, "position": 3, "meta": {"type": "focus"}},
        {"title": "Focus block 2 — 45 min",               "points": 6, "position": 4, "meta": {"type": "focus"}},
        {"title": "Capture notes + progress",             "points": 5, "position": 5, "meta": {"type": "focus"}},
    ],
    "clean_ritual": [
        {"title": "Tidy desk + workspace", "points": 5, "position": 0, "meta": {"type": "clean"}},
        {"title": "Kitchen clean-up",      "points": 5, "position": 1, "meta": {"type": "clean"}},
        {"title": "Vacuum / sweep floors", "points": 4, "position": 2, "meta": {"type": "clean"}},
        {"title": "Bathroom wipe-down",    "points": 4, "position": 3, "meta": {"type": "clean"}},
        {"title": "Do laundry",            "points": 4, "position": 4, "meta": {"type": "clean"}},
        {"title": "Take out trash",        "points": 3, "position": 5, "meta": {"type": "clean"}},
    ],
    "catch_up": [
        {"title": "Check in with family",                          "points": 8, "position": 0, "meta": {"type": "people"}},
        {"title": "Reach out to a close friend",                   "points": 8, "position": 1, "meta": {"type": "people"}},
        {"title": "Follow up on open threads with people",         "points": 5, "position": 2, "meta": {"type": "people"}},
        {"title": "Reconnect with someone you haven't spoken to",  "points": 5, "position": 3, "meta": {"type": "people"}},
    ],
}


# ── Infrastructure helpers ────────────────────────────────────────────────────

def _parse_ts(ts: str) -> datetime:
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))


def _safe_tz(tz_str: str) -> ZoneInfo:
    try:
        return ZoneInfo(tz_str)
    except (ZoneInfoNotFoundError, Exception):
        return ZoneInfo("America/Los_Angeles")


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


def _daily_period_key(dt: datetime, tz: ZoneInfo, day_start_hour: int) -> str:
    return _ritual_date(dt, tz, day_start_hour).isoformat()  # '2026-06-07'


def _weekly_period_key(dt: datetime, tz: ZoneInfo, day_start_hour: int) -> str:
    d = _ritual_date(dt, tz, day_start_hour)  # apply day_start_hour shift first
    return d.strftime("%G-W%V")  # '2026-W23'


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


# ── Ownership helpers ─────────────────────────────────────────────────────────

def _assert_thread_owner(db: Client, thread_id: str, user_id: str) -> dict:
    """Return the thread row if it belongs to user_id, else 404."""
    rows = (
        db.table("v2_threads")
        .select("*")
        .eq("id", thread_id)
        .eq("user_id", user_id)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Thread not found")
    return rows[0]


def _assert_task_owner(db: Client, task_id: str, user_id: str) -> dict:
    """Return the task row if it belongs to user_id, else 404."""
    rows = (
        db.table("v2_tasks")
        .select("*")
        .eq("id", task_id)
        .eq("user_id", user_id)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Task not found")
    return rows[0]


# ── Row mappers ───────────────────────────────────────────────────────────────

def _row_to_thread(row: dict, tasks: list[dict] | None = None) -> ThreadOut:
    if tasks is None:
        tasks = []
    task_count = len(tasks)
    done_count = sum(1 for t in tasks if t.get("status") == "done")
    points_earned = sum(t.get("points", 0) for t in tasks if t.get("status") == "done")
    points_total = sum(t.get("points", 0) for t in tasks)
    return ThreadOut(
        id=row["id"],
        user_id=row["user_id"],
        template=row["template"],
        coach_id=row["coach_id"],
        tag=row["tag"],
        title=row.get("title"),
        period_key=row.get("period_key"),
        archived_at=row.get("archived_at"),
        meta=row.get("meta") or {},
        created_at=row["created_at"],
        task_count=task_count,
        done_count=done_count,
        points_earned=points_earned,
        points_total=points_total,
    )


def _row_to_task(row: dict) -> TaskOut:
    scheduled_for = row.get("scheduled_for")
    if scheduled_for and not isinstance(scheduled_for, str):
        scheduled_for = str(scheduled_for)
    return TaskOut(
        id=row["id"],
        thread_id=row["thread_id"],
        user_id=row["user_id"],
        title=row["title"],
        status=row.get("status", "open"),
        priority=row.get("priority", "med"),
        points=row.get("points", 0),
        section=row.get("section"),
        scheduled_for=scheduled_for,
        due_at=row.get("due_at"),
        position=row.get("position", 0),
        meta=row.get("meta") or {},
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _row_to_message(row: dict) -> MessageOut:
    return MessageOut(
        id=row["id"],
        thread_id=row["thread_id"],
        role=row["role"],
        content=row["content"],
        task_ref=row.get("task_ref"),
        meta=row.get("meta") or {},
        created_at=row["created_at"],
    )


# ── Occurrence upsert ─────────────────────────────────────────────────────────

def _upsert_occurrence(db: Client, user_id: str, template: str, period_key: str) -> tuple[dict, bool]:
    """Idempotently create a ritual thread occurrence. Returns (row, created_bool).

    Uses insert-then-fallback to handle concurrent requests safely — the partial
    unique index v2_threads_ritual_uniq enforces one row per (user, template, period_key).
    """
    tag = THREAD_TAGS.get(template, "#Thread")
    title = THREAD_TITLES.get(template, template)
    coach_id = DEFAULT_COACHES.get(template, "arjun")

    try:
        row = (
            db.table("v2_threads")
            .insert({
                "user_id": user_id,
                "template": template,
                "tag": tag,
                "title": title,
                "period_key": period_key,
                "coach_id": coach_id,
                "meta": {},
            })
            .execute()
            .data[0]
        )
    except PostgRESTAPIError as e:
        msg = str(e)
        if "duplicate key" in msg or "v2_threads_ritual_uniq" in msg:
            # Lost the race — another request already created this occurrence.
            existing = (
                db.table("v2_threads")
                .select("*")
                .eq("user_id", user_id)
                .eq("template", template)
                .eq("period_key", period_key)
                .execute()
                .data
            )
            if existing:
                return existing[0], False
        raise

    thread_id = row["id"]

    # Seed tasks for newly created thread
    seed = SEED_TASKS.get(template, [])
    if seed:
        db.table("v2_tasks").insert(
            [{**task, "thread_id": thread_id, "user_id": user_id} for task in seed]
        ).execute()

    return row, True


# ── Daily / weekly reset jobs ─────────────────────────────────────────────────

def _scope_label(tz_key: str | None, hour: int | None) -> str:
    if tz_key is None or hour is None:
        return "all"
    return f"{tz_key}@{hour:02d}"


def _daily_reset_job(target_tz_key: str | None = None, target_hour: int | None = None) -> dict:
    """Upsert today's morning and evening ritual occurrences for all users.

    Without args, processes every user (manual /cron/daily-reset trigger).
    With (target_tz_key, target_hour), processes only users matching that schedule.
    """
    db = get_supabase()
    now = datetime.now(timezone.utc)
    scoped = target_tz_key is not None and target_hour is not None

    # Get all users from v2_profiles (not v2_threads — new users have no threads yet)
    try:
        profile_rows = (
            db.table("v2_profiles")
            .select("id, timezone, day_start_hour")
            .execute()
            .data or []
        )
    except Exception:
        profile_rows = []

    # Always include the dev user if no profiles exist
    if not profile_rows:
        profile_rows = [{"id": None, "timezone": DEFAULT_TZ.key, "day_start_hour": DEFAULT_DAY_START_HOUR}]

    created, skipped = 0, 0
    for profile in profile_rows:
        uid = profile.get("id")
        if not uid:
            continue
        tz, day_start_hour = _row_to_schedule(profile)
        if scoped:
            if (tz.key, day_start_hour) != (target_tz_key, target_hour):
                continue
        period_key = _daily_period_key(now, tz, day_start_hour)
        for template in ("morning_ritual", "evening_ritual"):
            _, was_created = _upsert_occurrence(db, uid, template, period_key)
            if was_created:
                created += 1
            else:
                skipped += 1

    return {"created": created, "skipped": skipped, "scope": _scope_label(target_tz_key, target_hour)}


def _weekly_reset_job(target_tz_key: str | None = None, target_hour: int | None = None) -> dict:
    """Upsert this week's weekly ritual occurrence for all users."""
    db = get_supabase()
    now = datetime.now(timezone.utc)
    scoped = target_tz_key is not None and target_hour is not None

    try:
        profile_rows = (
            db.table("v2_profiles")
            .select("id, timezone, day_start_hour")
            .execute()
            .data or []
        )
    except Exception:
        profile_rows = []

    created, skipped = 0, 0
    for profile in profile_rows:
        uid = profile.get("id")
        if not uid:
            continue
        tz, day_start_hour = _row_to_schedule(profile)
        if scoped:
            if (tz.key, day_start_hour) != (target_tz_key, target_hour):
                continue
        period_key = _weekly_period_key(now, tz, day_start_hour)
        _, was_created = _upsert_occurrence(db, uid, "weekly_ritual", period_key)
        if was_created:
            created += 1
        else:
            skipped += 1

    return {"created": created, "skipped": skipped, "scope": _scope_label(target_tz_key, target_hour)}


def _sync_reset_schedules() -> dict:
    """Register one daily + one weekly cron job per distinct (timezone, day_start_hour)
    in v2_profiles. Idempotent — removes stale schedules and adds new ones.
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
        pass

    desired_daily_ids = {f"reset:{tz_key}:{hour:02d}" for tz_key, hour in schedules}
    desired_weekly_ids = {f"weekly:{tz_key}:{hour:02d}" for tz_key, hour in schedules}
    desired_job_ids = desired_daily_ids | desired_weekly_ids

    existing_resets = {
        j.id for j in _scheduler.get_jobs()
        if j.id.startswith("reset:") or j.id.startswith("weekly:")
    }

    for stale in existing_resets - desired_job_ids:
        _scheduler.remove_job(stale)

    for tz_key, hour in schedules:
        daily_id = f"reset:{tz_key}:{hour:02d}"
        _scheduler.add_job(
            _daily_reset_job,
            "cron",
            hour=hour,
            minute=0,
            timezone=tz_key,
            id=daily_id,
            kwargs={"target_tz_key": tz_key, "target_hour": hour},
            replace_existing=True,
        )
        weekly_id = f"weekly:{tz_key}:{hour:02d}"
        _scheduler.add_job(
            _weekly_reset_job,
            "cron",
            day_of_week="mon",
            hour=hour,
            minute=0,
            timezone=tz_key,
            id=weekly_id,
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


# ── Cron endpoints ────────────────────────────────────────────────────────────

@app.post("/cron/daily-reset")
def trigger_daily_reset(x_cron_secret: str = Header(default="")) -> dict:
    """Manually trigger the daily reset job across all users."""
    expected = os.environ.get("CRON_SECRET", "")
    if not expected or x_cron_secret != expected:
        raise HTTPException(status_code=403, detail="Forbidden")
    return _daily_reset_job()


@app.post("/cron/weekly-reset")
def trigger_weekly_reset(x_cron_secret: str = Header(default="")) -> dict:
    expected = os.environ.get("CRON_SECRET", "")
    if not expected or x_cron_secret != expected:
        raise HTTPException(status_code=403, detail="Forbidden")
    return _weekly_reset_job()


@app.get("/cron/schedules")
def list_schedules(x_cron_secret: str = Header(default="")) -> dict:
    """List the currently-registered reset cron schedules."""
    expected = os.environ.get("CRON_SECRET", "")
    if not expected or x_cron_secret != expected:
        raise HTTPException(status_code=403, detail="Forbidden")
    jobs = []
    for j in _scheduler.get_jobs():
        if not (j.id.startswith("reset:") or j.id.startswith("weekly:")):
            continue
        jobs.append({
            "id": j.id,
            "next_run_at": str(j.next_run_time) if j.next_run_time else None,
        })
    return {"jobs": sorted(jobs, key=lambda x: x["id"])}


# ── Threads ───────────────────────────────────────────────────────────────────

@app.get("/threads", response_model=list[ThreadOut])
def list_threads(template: str | None = None, today: bool = False):
    user_id = get_dev_user_id()
    db = get_supabase()
    now = datetime.now(timezone.utc)

    q = db.table("v2_threads").select("*").eq("user_id", user_id)
    if template:
        q = q.eq("template", template)
    threads = q.execute().data

    if not threads:
        return []

    tz, day_start_hour = _get_user_schedule(db, user_id)

    # Lazy-upsert today's / this-week's occurrence for scheduled templates
    thread_ids = [t["id"] for t in threads]
    for t in threads:
        cadence = TEMPLATE_CADENCE.get(t["template"], "none")
        if cadence == "daily":
            pk = _daily_period_key(now, tz, day_start_hour)
            if t.get("period_key") != pk:
                # Check if today's occurrence already exists for this template
                existing = (
                    db.table("v2_threads")
                    .select("id")
                    .eq("user_id", user_id)
                    .eq("template", t["template"])
                    .eq("period_key", pk)
                    .execute()
                    .data
                )
                if not existing:
                    new_row, _ = _upsert_occurrence(db, user_id, t["template"], pk)
                    threads.append(new_row)
                    thread_ids.append(new_row["id"])
        elif cadence == "weekly":
            pk = _weekly_period_key(now, tz, day_start_hour)
            if t.get("period_key") != pk:
                existing = (
                    db.table("v2_threads")
                    .select("id")
                    .eq("user_id", user_id)
                    .eq("template", t["template"])
                    .eq("period_key", pk)
                    .execute()
                    .data
                )
                if not existing:
                    new_row, _ = _upsert_occurrence(db, user_id, t["template"], pk)
                    threads.append(new_row)
                    thread_ids.append(new_row["id"])

    # Fetch all tasks in one query; build per-thread map
    all_tasks: list[dict] = []
    if thread_ids:
        all_tasks = (
            db.table("v2_tasks")
            .select("*")
            .in_("thread_id", thread_ids)
            .execute()
            .data or []
        )
    tasks_by_thread: dict[str, list[dict]] = {}
    for task in all_tasks:
        tasks_by_thread.setdefault(task["thread_id"], []).append(task)

    out = [_row_to_thread(t, tasks_by_thread.get(t["id"], [])) for t in threads]

    if today:
        # Filter to threads whose period_key matches today's / this week's key
        daily_pk = _daily_period_key(now, tz, day_start_hour)
        weekly_pk = _weekly_period_key(now, tz, day_start_hour)
        filtered = []
        for thread_out, thread_row in zip(out, threads):
            cadence = TEMPLATE_CADENCE.get(thread_row["template"], "none")
            if cadence == "daily" and thread_row.get("period_key") == daily_pk:
                filtered.append(thread_out)
            elif cadence == "weekly" and thread_row.get("period_key") == weekly_pk:
                filtered.append(thread_out)
            # freeform (cadence == 'none') is excluded from today filter
        return filtered

    return out


@app.post("/threads/occurrence")
def upsert_occurrence(body: OccurrenceBody, response: Response):
    """Idempotent ritual thread upsert. Returns 201 on create, 200 if already existed."""
    user_id = get_dev_user_id()
    db = get_supabase()

    if body.template not in SCHEDULED_TEMPLATES:
        raise HTTPException(
            status_code=422,
            detail=f"template '{body.template}' is not a scheduled template",
        )

    row, created = _upsert_occurrence(db, user_id, body.template, body.period_key)

    # Fetch tasks for this thread to compute counts
    tasks = (
        db.table("v2_tasks")
        .select("*")
        .eq("thread_id", row["id"])
        .execute()
        .data or []
    )
    thread_out = _row_to_thread(row, tasks)

    if created:
        response.status_code = 201
    return {"thread": thread_out, "created": created}


@app.post("/threads", response_model=ThreadOut, status_code=201)
def create_thread(body: CreateThreadBody):
    user_id = get_dev_user_id()
    db = get_supabase()

    if body.template not in API_TEMPLATES:
        raise HTTPException(
            status_code=422,
            detail=f"POST /threads only supports on-demand templates: {sorted(API_TEMPLATES)}. Use POST /threads/occurrence for scheduled templates.",
        )

    tag = THREAD_TAGS.get(body.template, "#Thread")
    title = body.title or THREAD_TITLES.get(body.template, "New Thread")
    coach_id = body.coach_id or DEFAULT_COACHES.get(body.template, "arjun")

    row = (
        db.table("v2_threads")
        .insert({
            "user_id": user_id,
            "template": body.template,
            "tag": tag,
            "title": title,
            "coach_id": coach_id,
            "period_key": None,
            "meta": {},
        })
        .execute()
        .data[0]
    )

    # Seed tasks for newly created thread
    seed = SEED_TASKS.get(body.template, [])
    thread_id = row["id"]
    if seed:
        db.table("v2_tasks").insert(
            [{**task, "thread_id": thread_id, "user_id": user_id} for task in seed]
        ).execute()

    return _row_to_thread(row, [])


@app.get("/threads/{thread_id}")
def get_thread(thread_id: str):
    user_id = get_dev_user_id()
    db = get_supabase()

    thread_row = _assert_thread_owner(db, thread_id, user_id)

    tasks = (
        db.table("v2_tasks")
        .select("*")
        .eq("thread_id", thread_id)
        .order("section", nullsfirst=True)
        .order("position")
        .execute()
        .data or []
    )
    messages = (
        db.table("v2_thread_messages")
        .select("*")
        .eq("thread_id", thread_id)
        .order("created_at")
        .execute()
        .data or []
    )

    return {
        "thread": _row_to_thread(thread_row, tasks),
        "tasks": [_row_to_task(t) for t in tasks],
        "messages": [_row_to_message(m) for m in messages],
    }


# ── Tasks ─────────────────────────────────────────────────────────────────────

@app.get("/threads/{thread_id}/tasks", response_model=list[TaskOut])
def list_tasks(thread_id: str, status: str | None = None):
    user_id = get_dev_user_id()
    db = get_supabase()

    _assert_thread_owner(db, thread_id, user_id)

    q = (
        db.table("v2_tasks")
        .select("*")
        .eq("thread_id", thread_id)
        .order("section", nullsfirst=True)
        .order("position")
    )
    if status:
        q = q.eq("status", status)
    rows = q.execute().data or []
    return [_row_to_task(r) for r in rows]


@app.post("/threads/{thread_id}/tasks", response_model=TaskOut, status_code=201)
def create_task(thread_id: str, body: CreateTaskBody):
    user_id = get_dev_user_id()
    db = get_supabase()

    _assert_thread_owner(db, thread_id, user_id)

    payload: dict[str, Any] = {
        "thread_id": thread_id,
        "user_id": user_id,
        "title": body.title,
        "priority": body.priority,
        "points": body.points,
        "position": body.position,
        "meta": body.meta,
    }
    if body.section is not None:
        payload["section"] = body.section
    if body.scheduled_for is not None:
        payload["scheduled_for"] = body.scheduled_for
    if body.due_at is not None:
        payload["due_at"] = body.due_at

    row = db.table("v2_tasks").insert(payload).execute().data[0]
    return _row_to_task(row)


@app.patch("/tasks/{task_id}", response_model=TaskOut)
def patch_task(task_id: str, body: PatchTaskBody):
    user_id = get_dev_user_id()
    db = get_supabase()

    existing = _assert_task_owner(db, task_id, user_id)

    patch = body.model_dump(exclude_unset=True)
    if not patch:
        return _row_to_task(existing)

    # Shallow-merge meta rather than replacing
    if "meta" in patch and patch["meta"] is not None:
        merged_meta = {**(existing.get("meta") or {}), **patch["meta"]}
        patch["meta"] = merged_meta

    rows = db.table("v2_tasks").update(patch).eq("id", task_id).execute().data
    if not rows:
        raise HTTPException(status_code=404, detail="Task not found")
    return _row_to_task(rows[0])


@app.delete("/tasks/{task_id}", response_model=TaskOut)
def drop_task(task_id: str):
    """Soft-delete: sets status='dropped'."""
    user_id = get_dev_user_id()
    db = get_supabase()

    _assert_task_owner(db, task_id, user_id)

    rows = (
        db.table("v2_tasks")
        .update({"status": "dropped"})
        .eq("id", task_id)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Task not found")
    return _row_to_task(rows[0])


# ── Messages ──────────────────────────────────────────────────────────────────

@app.get("/threads/{thread_id}/messages", response_model=list[MessageOut])
def list_messages(thread_id: str):
    user_id = get_dev_user_id()
    db = get_supabase()

    _assert_thread_owner(db, thread_id, user_id)

    rows = (
        db.table("v2_thread_messages")
        .select("*")
        .eq("thread_id", thread_id)
        .order("created_at")
        .execute()
        .data or []
    )
    return [_row_to_message(r) for r in rows]


@app.post("/threads/{thread_id}/messages", response_model=MessageOut, status_code=201)
def create_message(thread_id: str, body: CreateMessageBody):
    user_id = get_dev_user_id()
    db = get_supabase()

    if body.role not in ("user", "ai", "system", "tool"):
        raise HTTPException(status_code=422, detail="role must be one of: user, ai, system, tool")

    _assert_thread_owner(db, thread_id, user_id)

    payload: dict[str, Any] = {
        "thread_id": thread_id,
        "role": body.role,
        "content": body.content,
        "meta": body.meta,
    }
    if body.task_ref is not None:
        payload["task_ref"] = body.task_ref

    row = db.table("v2_thread_messages").insert(payload).execute().data[0]
    return _row_to_message(row)


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "3001"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
