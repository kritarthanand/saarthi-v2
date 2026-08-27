# Voice Sessions with the Pandavas — Design

> How to extend the existing voice + threads stack so you can long-press the mic,
> pick a Pandava, talk for 2 minutes, and either keep going, get a reply, or dump
> it — with every session landing in an Obsidian vault.

> **Superseded in part.** This is the design as written before the feature was
> built; it is kept for the reasoning, not as a description of the code.
> What changed once it ran:
>
> - **Obsidian was replaced by Notion** (`server/notion.py`; `obsidian.py` is
>   deleted, see git history). Owning the pages outright removed the marker
>   fences, splicing, atomic writes and mtime races below — and the unsaved-buffer
>   hazard in *Risks*, which that design could not solve. It also frees the server
>   from having to run on the same machine as the vault.
> - **Export is no longer voice-thread-only.** Sittings are collected from the
>   messages, so clips spoken inside a ritual or freeform thread export too,
>   merged into that coach's page for the day and labelled with their source.
> - **Threads are named after the Pandava** (`#Arjun`, not `#Voice`).
> - **The same sitting loop runs from inside a thread**, not just the floating
>   mic; dictation moved to a long press.

## Where we are today

Voice is currently **dictation into whichever thread is open**:

```
FloatingMic.onPress
  → AppRoot.setVoiceOpen(true)
  → <VoiceSession>            expo-audio, 120s cap already
  → stop → Whisper (client-direct XHR, useTranscribe)
  → onTranscribed(text)
  → AppRoot.pendingComposerText
  → <Composer> of the open ThreadDetail   ← user still has to hit send
```

Relevant facts, all verified in the tree:

- [`FloatingMic.tsx`](../../src/components/voice/FloatingMic.tsx) is a bare `Pressable` — `onPress` only, no long-press.
- [`VoiceSession.tsx`](../../src/components/voice/VoiceSession.tsx) already caps at `maxSeconds={120}` and auto-finalizes on the cap. The 2-minute rule is effectively built.
- `VoiceSavePayload` / `onSave` is a **dead stub** — `AppRoot.handleSave` just `console.warn`s "Voice save dropped — note template not yet wired." That's the hook the new flow claims.
- [`POST /threads/{id}/messages`](../../server/main.py) **always** generates an AI reply when `role == 'user'`. There is no way to persist a message without a reply.
- `_generate_ai_reply(db, user_id, thread_row, user_message_row)` **never reads `user_message_row`** — it rebuilds system prompt, tasks and history from the DB. A reply-without-a-new-message endpoint is therefore almost free.
- Coach persona is deliberately *not* on the server. `_BASE_SYSTEM` is generic; per-thread `system_prompt` is the only persona layer (per the chat-audio-thread-editing spec). `COACHES` lives client-side in [`pandavas.ts`](../../src/constants/pandavas.ts) with `accent` / `domain` / `spirit` / `sadhanas` per brother.
- `v2_profiles.tts_voice` exists in the schema and in `types/profile.ts` — and is **completely unused**.
- The server runs on the Mac Mini behind a cloudflared tunnel (`server/README.md`). That matters a lot for Obsidian.

## The shape of the change

Four pieces. None of them need a new parallel data model.

---

### 1. Long-press → Pandava picker

"Deep press" as 3D Touch is deprecated hardware; the current iOS equivalent is Haptic Touch, which RN surfaces as **`onLongPress`** (`delayLongPress`, 500ms default). So:

- `FloatingMic` grows `onLongPress` + `delayLongPress={350}` and fires `expo-haptics` `impactAsync(Medium)` on trigger.
- New `src/components/voice/CoachPicker.tsx` — the 5 brothers laid out radially around the mic, each in its own `accent`. Everything it renders (`name`, `domain`, `accent`, `accentDim`) already exists in `COACHES`, so it's pure presentation over current data. Drag-out-and-release selection reads best for a gesture that starts as a long-press; a bottom sheet is the cheaper first cut.

Press semantics:

| gesture | behavior |
|---|---|
| short press | unchanged — dictate into the open thread's Composer |
| long press | coach picker → **coach voice session** (new flow below) |

---

### 2. A voice session *is* a thread

The strong move here is to not invent anything. A voice session is a `v2_threads` row; each 2-minute clip is a `v2_thread_messages` row. That inherits the thread list, detail pane, edit sheet, model picker, AI reply path, and task extraction for free.

**New template: `voice_session`**

- `coach_id` — the chosen Pandava (column already exists).
- `period_key = "<YYYY-MM-DD>:<coach_id>"` — the existing partial unique index
  `v2_threads_ritual_uniq (user_id, template, period_key) WHERE period_key IS NOT NULL`
  then gives you **one thread per coach per day** for free, no index change. Date comes from `_ritual_date()` so it respects `day_start_hour`.
- `tag = '#Voice'`, `title = "Voice · Arjun"`.
- `cadence: 'none'`, `creation: 'api'` — created on demand when you pick a coach, *not* by the daily reset cron. As a `'none'` cadence template it also lands in the Today filter via the existing `_is_today(created_at)` branch, so no change to `list_threads` is needed.
- `system_prompt` **seeded from the coach's registry entry** at creation (domain + spirit + sadhanas). This keeps persona as a DB row — editable in the existing `ThreadEditSheet`, and it honors the "no COACH_PERSONAS on the server" decision rather than working around it.

**Each 2-minute clip is one `user` message:**

```jsonc
{
  "role": "user",
  "content": "<whisper transcript>",
  "meta": {
    "voice": true,
    "session_id": "<client uuid>",   // groups the segments of one sitting
    "segment": 1,
    "duration_s": 118
  }
}
```

`session_id` is the unit that "a conversation" means — it's what the Obsidian
exporter groups on and what a reply is scoped to. Segments of one sitting share it;
tomorrow's sitting with the same coach gets a new one in the same thread.

**Server work:** register `voice_session` in `THREAD_TAGS` / `THREAD_TITLES` /
`DEFAULT_COACHES` / `TEMPLATE_CADENCE`, plus a `POST /threads/voice-session`
that upserts on the composite period_key and seeds `system_prompt`. `POST /threads`
can't be reused as-is — it gates on `API_TEMPLATES` and hardcodes `period_key: None`.

**Client work:** add `voice_session` to `TEMPLATE_REGISTRY` with a
`VoiceSessionSummary` view — transcript blocks with timestamps, coach reply below.

---

### 3. Continue / Respond / Dump

Today the server replies to every user message, so all three options are currently
one option. Two small changes decouple it:

1. **`CreateMessageBody.reply: bool = True`** — segments post with `reply=false`.
   Backwards compatible; every existing caller keeps its behavior.
2. **`POST /threads/{id}/reply`** — generate a reply from existing history with no
   new user row. As noted above, `_generate_ai_reply` already ignores its
   `user_message_row` argument, so this is: drop the param, add the route.

Then the choice screen maps cleanly:

| option | call | result |
|---|---|---|
| **Continue** | new `VoiceSession`, same `session_id`, `segment: n+1`, `reply=false` | timer resets, another 2 minutes |
| **Respond** | `POST /threads/{id}/reply` | **one** coach reply to the whole session, not one per segment |
| **Dump** | *(nothing)* | segments are already saved; close |

**Ordering invariant:** transcribe → POST the segment (`reply=false`) → *then* show
the choice screen. If segments only persisted on Respond/Dump, a crash or a
backgrounded app loses the recording. Persist first, decide second.

For Respond, the prompt should know it's answering a monologue rather than a
message — wrap the session's segments in a `<voice_session>` block in
`_assemble_system_prompt`, or pass a flag that swaps `_BASE_SYSTEM`.

---

### 4. Appending into the Obsidian daily note

The server runs on the Mac Mini. An Obsidian vault is a folder of markdown files.
So **the server writes the note directly** — no sync service, no client-side
filesystem work, and it works identically whether the phone is on the LAN or
coming in through the cloudflared tunnel.

The target is **your existing daily note**, not a Saarthi-owned file. That's the
decision that shapes everything else here: the note is a file *you* also write in,
so the exporter has to be a well-behaved guest.

**The managed-region rule.** Saarthi owns exactly one fenced region of the note and
never touches a byte outside it:

```markdown
## Voice

<!-- saarthi:voice:begin -->
### Arjun · 14:02
coach:: arjun
duration:: 236s
session:: 8f2c1d

<transcript segment 1>

<transcript segment 2>

**Arjun —** <coach reply>

### Bheem · 19:40
...
<!-- saarthi:voice:end -->
```

- On every write: read the note, find the marker pair, **replace the region wholesale**
  with a fresh render from the DB, leave everything else byte-identical. Idempotent
  inside the region, non-destructive outside it. A reply arriving after a dump just
  rewrites the region correctly.
- Markers missing → append `## Voice` + an empty region at the end of the note.
  Note missing → create it with just that block. Never try to instantiate the user's
  daily-note template; that's Obsidian's job, and guessing at it is how you corrupt
  someone's vault.
- Write to a temp file and `os.replace()` so Obsidian never reads a half-written file.
- **Don't touch frontmatter.** It's the user's. Metadata goes in as Dataview *inline*
  fields (`coach:: arjun`) inside the managed region, which stays queryable without
  Saarthi ever editing a YAML block it doesn't own.
- Multiple sittings and multiple brothers in one day all render as `###` subsections
  inside the one region, ordered by first-segment timestamp — deterministic, so a
  re-render never reshuffles the note.

**Config** (`server/.env`, mirroring Obsidian's Daily Notes plugin settings):

```env
OBSIDIAN_VAULT_PATH=/Users/kritarth/Obsidian/<vault>
OBSIDIAN_DAILY_FOLDER=Daily
OBSIDIAN_DAILY_FORMAT=YYYY-MM-DD     # must match your Daily Notes plugin
```

Vault path unset → export silently disabled, matching the "missing data degrades to
empty rather than raising" convention in `AGENT.md`.

**Trigger:** after segment insert and after reply insert, on the voice path only.
Run it in a FastAPI `BackgroundTasks` so a slow or failing disk write never blocks or
fails the API response. Add `POST /threads/{id}/export` for backfill and manual repair.

**Caveats worth knowing up front:**

- **Concurrent editing is the real risk here.** If you have today's note open in
  Obsidian with unsaved changes while the server rewrites the file, one side loses.
  Obsidian reloads on external change, but an unsaved buffer can clobber the region.
  Mitigations, in order of cost: only write on session end rather than per segment;
  skip the write if the file's mtime moved since the read and retry once; or fall back
  to a Saarthi-owned file when a conflict is detected.
- If the vault lives in iCloud Drive and isn't materialized locally, writes succeed
  but Obsidian may lag behind. Local disk or Obsidian Sync is safer.
- This binds the export to the server host. If the backend ever moves off the Mac Mini,
  the fallback is Obsidian's Local REST API plugin or a pull-based sync script hitting
  `/threads/{id}/export`.

---

## What shipped

Built and verified end-to-end on 2026-08-25.

| Layer | File | Change |
|---|---|---|
| client | `components/voice/FloatingMic.tsx` | `onLongPress` + `expo-haptics`, `delayLongPress={350}` |
| client | `components/voice/CoachPicker.tsx` | **new** — bottom-sheet picker over `COACHES` |
| client | `components/voice/VoiceSession.tsx` | reduced to "record one clip, return the text": single `onFinish(result \| null)` contract replacing `onClose`/`onTranscribed`/`onSave`/`existingThreads` |
| client | `components/voice/SessionChoice.tsx` | **new** — Keep talking / Ask ⟨coach⟩ to respond / Just leave it |
| client | `components/voice/VoiceOverlay.tsx` | **new** — renders the current step; shared by the phone Modal and the iPad/web card |
| client | `hooks/useVoiceFlow.ts` | **new** — the flow state machine (`idle → picking → preparing → recording → saving → choosing`) |
| client | `lib/coachPrompt.ts` | **new** — renders a Pandava's registry entry into their thread's `system_prompt` |
| client | `components/thread/VoiceSessionSummary.tsx` | **new** — voice threads render through `ThreadChat` |
| client | `lib/threadTemplates.ts`, `lib/threads.ts` | register `voice_session` |
| client | `lib/threads.hooks.ts` | `useStartVoiceSession`, `useRequestReply`, `useExportThread`; `useSendMessage` takes an options bag with `reply` + `meta` |
| client | `constants/theme.ts` | `#Voice` thread theme |
| client | `app/index.tsx` | dead `handleSave` stub replaced by the real flow |
| server | `main.py` | `voice_session` metadata; `POST /threads/voice-session`; `CreateMessageBody.reply`; `POST /threads/{id}/reply`; `POST /threads/{id}/export`; voice-specific base system prompt |
| server | `main.py` | `_generate_ai_reply` — dropped the unused `user_message_row` param |
| server | `obsidian.py` | **new** — daily-note resolver, managed-region renderer, atomic write |
| server | `.env.example` | `OBSIDIAN_VAULT_PATH`, `OBSIDIAN_DAILY_FOLDER`, `OBSIDIAN_DAILY_FORMAT` |
| deps | `package.json` | `expo-haptics@~56.0.3` |

**No migration was needed.** `coach_id`, `period_key`, `system_prompt` and
`meta jsonb` already existed, and `template` has been an open text column since
the enum was dropped in `20260607_v2_threads_full_feature.sql`.

### Verified

Against the real backend (a scratch thread, since deleted) and a scratch vault:

- `POST /threads/voice-session` → 201 on create, 200 + same id on repeat, 422 on an unknown coach.
- `period_key` came out `2026-08-24:arjun` while UTC was already the 26th — the composite key correctly follows `_ritual_date()` and the user's `day_start_hour`, not UTC.
- Two clips posted with `reply=false` → both `ai_message: null`.
- `POST /threads/{id}/reply` → message count went 2 → 3, i.e. exactly one AI row and no phantom user row.
- The reply answered the sitting as a whole ("You're avoiding. Good catch."), confirming `_VOICE_SYSTEM` reached the model.
- Export into a daily note pre-seeded with real hand-written content left frontmatter, prose and a checkbox list byte-identical, with one managed region and one `## Voice` heading.
- Re-export after the reply landed updated the region in place; a third export returned `unchanged`.
- The voice thread appears in `GET /threads?today=true` via the `cadence: 'none'` → `_is_today(created_at)` branch, as designed.

## Decisions

Settled 2026-08-25:

- **Monologue, text reply.** No TTS, no Realtime API. `v2_profiles.tts_voice`
  stays provisioned-but-unused; adding speech later is additive.
- **Append into the existing daily note**, under a Saarthi-managed region (§4).
- **DB per clip, note on session end.** Each clip is persisted the moment it
  transcribes, so nothing on the choice screen can lose a recording — but the
  daily note is only written when the sitting ends (a reply, or a dump). That
  keeps the concurrent-edit window in §4 as narrow as possible.
- **Backing out of the choice screen dumps** rather than silently abandoning.
  The clips are in the DB either way; skipping the export would leave them out
  of the vault with nothing explaining why.
- **Bottom-sheet picker, not radial.** The fan-out reads nicer for a gesture
  that starts as a long-press, but it needs a drag-tracking state machine to do
  properly. The sheet is robust across phone/iPad/web and can be swapped later
  without touching anything below the UI.

## Still open

- **Short-pressing the floating mic still dictates into nothing.** That button
  is only rendered when no thread is open (`hidden={... || !!openThreadId}`), so
  its transcript lands in `pendingComposerText` with no Composer mounted to
  receive it — it only surfaces if you happen to open a thread afterwards. This
  predates the voice work and was left alone rather than quietly redefined.
  The obvious fix is to make short-press open the picker too; the mic *inside* a
  thread's Composer is where dictation actually works.
- **Obsidian holding an unsaved buffer.** The mtime check in `write_region`
  catches another process writing between our read and our replace, but nothing
  on this side can detect an unsaved editor buffer. Exporting only at session end
  narrows the window; it does not close it.
- **No tests.** The repo has no suite yet. `obsidian.py` is the piece most worth
  covering first — it is pure functions over strings plus one filesystem write,
  and it is the only component that can damage something the user owns.
