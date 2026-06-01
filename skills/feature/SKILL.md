---
name: feature
description: TODO — port from V1. Multi-workstream orchestrated dev pipeline (PM → implementers → reviewer → tester) for a single feature.
---

# Feature

**TODO: port from V1.**

- V1 version assumed: `PM` decomposes a feature, implementers fan out in worktrees with Tier A hooks, Codex reviews, Quinn validates. Full kanban lifecycle backed by `agent-memory/pipeline.md` guardrails.
- V2 needs: the same shape, but only once V2 has enough surface to be worth orchestrating. The pipeline's load-bearing pieces (FlowLoop guardrails, worktree bootstrap, `agent-memory/pipeline.md`, reviewer + tester subagents) do not exist in V2 yet.

Skip until V2 stands up worktree tooling and at least one server route worth feature-decomposing.
