# Follow-up: Make the Settings (Profile) page functional

## TL;DR

The Settings/Profile page currently looks interactive but is effectively a
**read-only view** in dev: most controls don't load or save. Root cause is that
`ProfilePane` reads/writes `v2_profiles` **directly through the client Supabase
client** (scoped by `auth.uid()`), but the app has **no Supabase sign-in flow**,
so there is no session — the profile never loads and every profile-backed
control renders disabled.

This doc covers two things:

1. **Make the whole Settings page work** by routing profile reads/writes through
   the FastAPI server (dev user id), consistent with how threads/today already
   work.
2. **Add the "auto-create daily threads" dropdown** (deferred from PR #18) as one
   control on that now-working page.

## Why it's just a view today

- `src/app/_layout.tsx` boots straight into `index` — there is no auth
  bootstrap, sign-in screen, or anonymous session.
- `src/lib/profile.ts` (`getUserProfile` / `upsertUserProfile` /
  `ensureUserProfile`) calls `getSupabase().auth.getUser()` and queries
  `v2_profiles` under RLS (`id = auth.uid()`).
- With no session, `getUserId()` returns `null` → `ensureUserProfile()` throws →
  `ProfilePane` catches and leaves `profile = null` → `interactive = false` →
  controls disabled, nothing reflected.
- Meanwhile threads/today work fine because they go through the FastAPI server,
  which identifies the user via `SAARTHI_DEV_USER_ID` and uses the Supabase
  **service key** (RLS-bypassing). The Profile page is the odd one out.

### Control inventory (current behavior)

| Control | Backing | Works today? |
|---|---|---|
| Name | `v2_profiles.name` | ❌ needs profile |
| About you (bio) | `v2_profiles.bio` | ❌ |
| Coach Style (personality) | `v2_profiles.personality` | ❌ |
| Chat Model (preferred_chat_model) | `v2_profiles.preferred_chat_model` | ❌ |
| TTS voice (tts_voice) | `v2_profiles.tts_voice` | ❌ |
| Timezone | `v2_profiles.timezone` | ❌ |
| New day starts at (day_start_hour) | `v2_profiles.day_start_hour` | ❌ |
| Morning session until (morning_deadline_hour) | `v2_profiles.morning_deadline_hour` | ❌ |
| Evening session from (evening_start_hour) | `v2_profiles.evening_start_hour` | ❌ |
| Voice transport | AsyncStorage (device-local) | ✅ already works |
| Proxy URL | AsyncStorage (device-local) | ✅ already works |
| Sign Out | Supabase `auth.signOut()` | ⚠️ no-op without a session |

## Part 1 — Make profile reads/writes work via the server

Route the profile through the FastAPI server (dev user id + service key), the
same pattern as threads. This makes the entire page work in dev with no auth.

### Server (`server/main.py`)

Add Pydantic models + endpoints. Validate against the same constraints as the
`v2_profiles` CHECK definitions (see `supabase/migrations/20260531_v2_profiles.sql`).

```python
class ProfilePatchBody(BaseModel):
    name: str | None = None
    bio: str | None = None
    personality: str | None = None
    preferred_chat_model: str | None = None
    tts_voice: str | None = None
    timezone: str | None = None
    day_start_hour: int | None = None
    morning_deadline_hour: int | None = None
    evening_start_hour: int | None = None
    auto_create_templates: list[str] | None = None

PROFILE_DEFAULTS = {
    "name": "", "bio": "", "personality": "stoic",
    "preferred_chat_model": "gpt_4o", "tts_voice": "nova",
    "timezone": "America/Los_Angeles", "day_start_hour": 0,
    "morning_deadline_hour": 12, "evening_start_hour": 17,
    "auto_create_templates": DEFAULT_AUTO_CREATE_TEMPLATES,
}

@app.get("/profile")
def get_profile() -> dict:
    user_id = get_dev_user_id()
    db = get_supabase()
    row = (db.table("v2_profiles").select("*").eq("id", user_id)
           .maybe_single().execute().data)   # maybe_single(), NOT maybeSingle()
    if not row:
        row = (db.table("v2_profiles")
               .upsert({"id": user_id, **PROFILE_DEFAULTS}, on_conflict="id")
               .execute().data[0])
    return row

@app.put("/profile")
def update_profile(body: ProfilePatchBody) -> dict:
    user_id = get_dev_user_id()
    db = get_supabase()
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    # TODO: validate enums (personality / preferred_chat_model / tts_voice) and
    # hour ranges before writing; reject with 422 on bad values.
    row = (db.table("v2_profiles")
           .upsert({"id": user_id, **patch}, on_conflict="id")
           .execute().data[0])
    return row
```

Note: the Supabase Python client method is `maybe_single()`, not `maybeSingle()`.
`_get_user_schedule` previously swallowed this in a try/except (silently
returning defaults); it was fixed in PR #18. Use `maybe_single()` in new reads.

### Client (`src/lib/profile.ts`)

Swap the Supabase calls for `apiFetch` against the new endpoints. Keep the same
exported function signatures so `ProfilePane` needs no changes:

```ts
import { apiFetch } from '@/lib/api'; // extract apiFetch from threads.hooks.ts

export async function getUserProfile(): Promise<UserProfile | null> {
  return apiFetch<UserProfile>('/profile');
}
export async function upsertUserProfile(patch: ProfilePatch): Promise<UserProfile> {
  return apiFetch<UserProfile>('/profile', { method: 'PUT', body: JSON.stringify(patch) });
}
export async function ensureUserProfile(): Promise<UserProfile> {
  return apiFetch<UserProfile>('/profile'); // GET auto-creates the row server-side
}
```

Promote `apiFetch` out of `threads.hooks.ts` into a small `src/lib/api.ts` so
non-hook modules can import it cleanly.

With this, every profile-backed control in the table above starts loading and
saving. `interactive` becomes true once the GET resolves.

### Sign Out

Without a real auth session, "Sign Out" is a no-op. Either hide it until auth
lands, or repurpose it (e.g. "Reset preferences"). Decide during implementation.

## Part 2 — Auto-create daily threads dropdown (deferred from PR #18)

The auto-create *mechanism* already shipped in PR #18 and works:

- `v2_profiles.auto_create_templates` (opt-in list, default morning + evening)
  and `v2_profiles.auto_create_marks` (server-managed `template -> last
  period_key`, so a manual delete isn't resurrected until the period rolls over).
  Migration: `supabase/migrations/20260615_v2_profiles_auto_create.sql`.
- `POST /threads/ensure-today` creates the current period's occurrence for each
  enabled scheduled template, skipping any already marked this period.
- `AppRoot` calls `ensureToday()` once per launch (`useEnsureToday`).

Net effect: Morning + Evening rituals auto-create daily and deletes stick until
the next day — but there's no UI to change the set. A prototype UI was removed
because it relied on the (broken) Supabase profile load.

Once Part 1 lands, `auto_create_templates` is just another profile field, so the
dropdown can read/write it through the same `/profile` endpoints (no separate
endpoint needed).

Eligible templates = occurrence-based (scheduled) ones only: `morning_ritual`,
`evening_ritual`, `weekly_ritual`, `meal_logging`, `clean_ritual`, `catch_up`.
On-demand templates (workout, focus, freeform) are excluded — they aren't
idempotent, so auto-creating them daily would pile up duplicates.

### Dropdown UX (`src/components/profile/AutoCreateThreadsSetting.tsx`)

- **Collapsed:** a row "Auto-create on open" with a value summary, e.g.
  "Morning Ritual, Evening Ritual" (or "None"), plus a chevron.
- **Tap to expand:** the eligible templates as checkable rows — color dot
  (`threadTheme(tag)`), title + cadence (`TEMPLATE_REGISTRY[t]`), check mark when
  selected.
- **Toggle:** optimistic update → `upsertUserProfile({ auto_create_templates })`
  → on enable, also call `useEnsureToday()` so today's occurrence appears now.
  Revert + inline error on failure.
- Optional: lift `refresh` from `AppRoot`'s `useThreads` so an enable reflects in
  Today immediately (else it shows on next navigation/relaunch).

## Acceptance criteria

- [ ] Opening Settings loads the saved profile (name, bio, coach style, chat
      model, voice, schedule) with no Supabase session.
- [ ] Editing any profile control persists across app relaunch.
- [ ] Device-local controls (proxy URL, voice transport) keep working.
- [ ] Auto-create dropdown shows current selection (default Morning + Evening),
      toggling persists, enabling creates today's occurrence immediately.
- [ ] Deleting an auto-created thread still stays gone until the next period.
- [ ] Bad enum/hour values are rejected by the server (422), not silently saved.
- [ ] Sign Out is either hidden or given a sensible no-auth behavior.

## Files to touch

- `server/main.py` — `GET /profile`, `PUT /profile` (+ models, validation).
- `src/lib/api.ts` — extract `apiFetch` for non-hook imports.
- `src/lib/profile.ts` — point at the server endpoints; keep signatures.
- `src/components/profile/AutoCreateThreadsSetting.tsx` — new dropdown.
- `src/components/profile/ProfilePane.tsx` — render the dropdown; revisit Sign Out.

## Open questions

- When real Supabase auth lands, keep profile server-routed or move back to
  direct RLS queries? (Server-routed matches the current threads architecture.)
- Should device-local settings (proxy URL, voice transport) eventually move to
  the profile for cross-device parity, or stay local? (Intentionally local today
  — see the note in `src/lib/config.ts`.)
- "Create now" button next to the auto-create dropdown for a one-off manual
  ensure?
