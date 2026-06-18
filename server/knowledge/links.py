"""Thread ↔ knowledge-source wiring.

Context assembly is server-side only (THREADS.md invariant #4), so the canonical
link between a thread and the knowledge banks it can see lives here, not on the
client.

Two layers, merged by `linked_sources`:
  1. Template default — every thread of a template links these sources.
  2. Per-thread override — `thread.meta.knowledge` (a list of source ids) adds
     sources to (or, with a bare list, augments) the template default. This rides
     on the existing `meta` jsonb column, so no migration is needed.

The frontend template registry (src/lib/threadTemplates.ts) mirrors the template
default for display only; this module is the source of truth.
"""
from __future__ import annotations

from typing import Any

from knowledge.sources import get_source

# Sources linked by default for each template.
TEMPLATE_KNOWLEDGE: dict[str, list[str]] = {
    "meal_logging": ["recipes"],
}


def linked_source_ids(template: str | None, meta: dict[str, Any] | None) -> list[str]:
    """Resolve the ordered, de-duplicated list of source ids a thread links to.

    Combines the template default with any `meta.knowledge` override, keeping
    only ids that resolve to a registered source.
    """
    ids: list[str] = []
    for sid in TEMPLATE_KNOWLEDGE.get(template or "", []):
        if sid not in ids:
            ids.append(sid)

    override = (meta or {}).get("knowledge")
    if isinstance(override, list):
        for sid in override:
            if isinstance(sid, str) and sid not in ids:
                ids.append(sid)

    # Drop anything that isn't actually registered.
    return [sid for sid in ids if get_source(sid) is not None]


def linked_sources(template: str | None, meta: dict[str, Any] | None):
    """Resolve to the KnowledgeSource objects a thread links to."""
    return [get_source(sid) for sid in linked_source_ids(template, meta)]
