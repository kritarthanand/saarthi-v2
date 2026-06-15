# Follow-up: Settings UI to choose auto-created daily/weekly threads

## Status

- **Shipped in PR #18:** the auto-create *mechanism* — works with a fixed default.
- **Deferred (this doc):** the *Settings UI* to change which templates auto-create.

The settings UI was prototyped in PR #18 and then **removed** because it was
non-functional in dev (see "Why the first attempt didn't work"). The backend and
the launch-time behavior remain and work; only the user-facing toggle is missing.

## What already works (do not rebuild)

- `v2_profiles.auto_create_templates jsonb` — opt-in list, default
  `["morning_ritual","evening_ritual"]`.
- `v2_profiles.auto_create_marks jsonb` — server-managed map of
  `template -> last period_key auto-created`, so a manual delete is not
  resurrected until the period rolls over.
  (Migration: `supabase/migrations/20260615_v2_profiles_auto_create.sql`.)
- `POST /threads/ensure-today` — on app launch, creates the current
  period's occurrence for each enabled scheduled template, skipping any
  already marked for this period. Idempotent + delete-aware.
- `AppRoot` calls `ensureToday()` once per launch (`useEnsureToday`).

Net effect today: Morning + Evening rituals auto-create each day; deleting one
keeps it gone until the next day. There is just no way to change the set from
the UI yet.

## The goal

In **Settings → Daily threads**, a **dropdown-style multi-select** that lets the
user pick which scheduled templates auto-create. Defaults to Morning + Evening.

Eligible templates = the occurrence-based (scheduled) ones only:
`morning_ritual`, `evening_ritual`, `weekly_ritual`, `meal_logging`,
`clean_ritual`, `catch_up`. On-demand templates (workout, focus, freeform) are
**excluded** — they aren't idempotent, so auto-creating them daily would pile up
duplicates.

## Why the first attempt didn't work

The Profile screen (`ProfilePane`) reads/writes `v2_profiles` **directly through
the client Supabase client**, scoped by `auth.uid()` (see `src/lib/profile.ts`).
But the app has **no Supabase sign-in flow** yet (`src/app/_layout.tsx` boots
straight to `index`; there is no auth bootstrap). So `getUserId()` returns
`null`, `ensureUserProfile()` fails, `profile` stays `null`, and every Profile
control renders disabled — including the toggles. Nothing saved or reflected.

Meanwhile the threads/today data path does **not** use Supabase auth at all — it
goes through the FastAPI server, which identifies the user via
`SAARTHI_DEV_USER_ID` and uses the service key (RLS-bypassing). That's why
threads work in dev but the Profile screen doesn't.

## Proposed approach: route the preference through the server

Make the auto-create preference server-authoritative (like threads), so it works
regardless of client Supabase session. Do **not** depend on `ProfilePane`'s
Supabase-auth profile load for this control.

### 1. Server endpoints (`server/main.py`)

```python
class AutoCreateBody(BaseModel):
    templates: list[str]

@app.get("/profile/auto-create")
def get_auto_create() -> dict:
    user_id = get_dev_user_id()
    db = get_supabase()
    prof = (
        db.table("v2_profiles")
        .select("auto_create_templates")
        .eq("id", user_id)
        .maybe_single()      # NOTE: maybe_single(), not maybeSingle()
        .execute()
        .data
    )
    templates = (prof or {}).get("auto_create_templates") or DEFAULT_AUTO_CREATE_TEMPLATES
    return {"templates": templates, "options": list(SCHEDULED_TEMPLATES)}

@app.put("/profile/auto-create")
def set_auto_create(body: AutoCreateBody) -> dict:
    user_id = get_dev_user_id()
    db = get_supabase()
    templates = [t for t in body.templates if t in SCHEDULED_TEMPLATES]  # validate
    db.table("v2_profiles").upsert(
        {"id": user_id, "auto_create_templates": templates},
        on_conflict="id",
    ).execute()
    return {"templates": templates}
```

`DEFAULT_AUTO_CREATE_TEMPLATES` and `SCHEDULED_TEMPLATES` already exist in
`server/main.py`.

### 2. Client hooks (`src/lib/threads.hooks.ts`)

```ts
export function useGetAutoCreate(): () => Promise<string[]> {
  return useCallback(async () => {
    const r = await apiFetch<{ templates: string[] }>('/profile/auto-create');
    return r.templates;
  }, []);
}

export function useSetAutoCreate(): (templates: string[]) => Promise<string[]> {
  return useCallback(async (templates) => {
    const r = await apiFetch<{ templates: string[] }>('/profile/auto-create', {
      method: 'PUT',
      body: JSON.stringify({ templates }),
    });
    return r.templates;
  }, []);
}
```

### 3. Settings component (`src/components/profile/AutoCreateThreadsSetting.tsx`)

A self-contained component that loads/saves via the server hooks above — **not**
gated on `ProfilePane`'s `interactive`/`profile` state. Drop it into
`ProfilePane` as its own `SettingsSection` (where the removed one was, before the
"Server" section).

Dropdown UX:

- **Collapsed:** a row labeled "Auto-create on open" with a value summary, e.g.
  "Morning Ritual, Evening Ritual" (or "None"), plus a chevron.
- **Tap to expand:** reveal the eligible templates, each as a checkable row with
  the template's color dot, title, and cadence ("daily"/"weekly"). A check mark
  on the right indicates membership.
- **Toggle a row:** optimistic local update → `useSetAutoCreate(next)` →
  on enable, also call `useEnsureToday()` so today's occurrence appears
  immediately. On error, revert and surface a small inline message.
- Reuse existing pieces: `SettingsSection`/`SettingsRow`, `threadTheme(tag)` for
  the dot color, `TEMPLATE_REGISTRY[t].title`/`.cadence` for labels.

Optional: lift `refresh` from `AppRoot`'s `useThreads` (or expose a callback) so
enabling a template reflects in Today without waiting for the next refresh.
Acceptable to defer — it shows on next navigation/relaunch.

## Acceptance criteria

- [ ] Settings shows a collapsed dropdown summarizing the current selection.
- [ ] Expanding lists the 6 scheduled templates with correct selected state
      loaded from the server (defaults: Morning + Evening).
- [ ] Toggling persists across app relaunch (server-backed; no Supabase session
      required).
- [ ] Enabling a template creates today's/this-week's occurrence immediately.
- [ ] Disabling stops future auto-creation; existing threads are left alone.
- [ ] Deleting an auto-created thread still stays gone until the next period
      (existing `auto_create_marks` behavior is unaffected).

## Files to touch

- `server/main.py` — add the two endpoints.
- `src/lib/threads.hooks.ts` — add `useGetAutoCreate` / `useSetAutoCreate`.
- `src/components/profile/AutoCreateThreadsSetting.tsx` — new component.
- `src/components/profile/ProfilePane.tsx` — render the component.

## Open questions

- Should the auto-create preference eventually move to the Supabase-auth profile
  path once real auth lands, or stay server-routed? (Server-routed matches the
  current threads architecture; revisit when auth is wired.)
- Worth a "Create now" button next to the dropdown for one-off manual ensure?
