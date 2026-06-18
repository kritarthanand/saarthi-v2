"""Per-thread knowledge context assembly (stub).

THREADS.md §5 specifies that the server assembles everything the model sees,
including (future) a knowledge preamble + the tool specs to expose. This module
is the concrete piece that does the knowledge part: given a thread's template +
meta, it returns the preamble text and the tool specs for every linked source.

It is a *stub* only in that no live LLM consumes it yet — there is no agent
runtime in V2. It is fully exercised and testable today, and is the seam the
message endpoint already calls (see main.py `assemble_message_context`) so that
when the runtime lands, the knowledge wiring is already correct.
"""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from knowledge.links import linked_sources
from knowledge.tools import specs_for


class KnowledgeContext(BaseModel):
    """What a thread's linked knowledge contributes to prompt assembly."""

    source_ids: list[str]
    preamble: str  # markdown block to inject above recent messages
    tools: list[dict[str, Any]]  # Anthropic tool specs to expose to the model


def assemble_thread_knowledge(template: str | None, meta: dict[str, Any] | None) -> KnowledgeContext:
    """Build the knowledge context for a thread from its template + meta.

    For each linked source we inject its prose guide and a compact index (e.g. the
    list of meals with per-serving macros) and collect its tool specs. Sources are
    de-duplicated and ordered by `linked_sources`.
    """
    sources = linked_sources(template, meta)

    source_ids: list[str] = []
    blocks: list[str] = []
    tool_names: list[str] = []

    for src in sources:
        source_ids.append(src.source_id)

        section = [f"## Knowledge: {src.manifest.get('name', src.source_id)}"]
        guide = src.guide().strip()
        if guide:
            section.append(guide)
        index = src.index().strip()
        if index:
            section.append("### Available entries\n" + index)
        blocks.append("\n\n".join(section))

        for tn in src.tool_names:
            if tn not in tool_names:
                tool_names.append(tn)

    return KnowledgeContext(
        source_ids=source_ids,
        preamble="\n\n---\n\n".join(blocks),
        tools=specs_for(tool_names),
    )
