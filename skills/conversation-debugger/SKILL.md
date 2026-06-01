---
name: conversation-debugger
description: TODO — port from V1. Open the Saarthi conversation debug dashboard to inspect flows, context, and stage progression.
---

# Conversation Debugger

**TODO: port from V1.**

- V1 version assumed: launches a web dashboard reading from V1's `conversations`, FlowLoop traces, and stage-resolver outputs.
- V2 needs: a rethink — V2 has no FlowLoop, no session stages, and no `conversations` table. The V2 analogue would inspect a single `v2_threads` row plus its `v2_thread_messages` (and any tool/meta trail once the server actually streams responses).

Skip until the V2 server gains a real conversation surface.
