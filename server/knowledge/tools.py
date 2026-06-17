"""Agent tool specs + dispatch over the knowledge banks.

These are the tools the LLM agent will be given when a thread links a knowledge
source (see context.assemble_thread_knowledge). The specs are Anthropic
tool-use shaped (`name` / `description` / `input_schema`) — V2 targets Claude
models (see src/lib/chatModels.ts). `dispatch()` runs a tool call against the
loaders and returns a JSON-serialisable result.

There is no live LLM runtime yet, so nothing calls `dispatch()` in production
today — but it is pure and unit-testable, and is what the future message
endpoint will hand tool-use blocks to. Ported in spirit from V1
(server/agents/tools.py: query_recipe / query_food).
"""
from __future__ import annotations

from typing import Any

from knowledge.recipes import get_food, get_recipe
from knowledge.sources import get_source

# ── Tool specs (Anthropic tool-use shape) ──────────────────────────────────────

TOOL_SPECS: dict[str, dict[str, Any]] = {
    "query_recipe": {
        "name": "query_recipe",
        "description": (
            "Look up a recipe in the user's recipe bank by name or alias. Returns "
            "id, name, yields_servings, per-serving macros, total batch macros, and "
            "the resolved ingredient list. Call this BEFORE logging a meal so you can "
            "confirm the resolved name + macros with the user."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "name_or_alias": {
                    "type": "string",
                    "description": "Natural name of the dish, e.g. 'tandoori', 'fried rice'.",
                }
            },
            "required": ["name_or_alias"],
        },
    },
    "query_food": {
        "name": "query_food",
        "description": (
            "Look up a single food (raw ingredient or packaged item) in the catalog "
            "by name or alias. Returns id, name, basis, serving_label, and macros."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "name_or_alias": {
                    "type": "string",
                    "description": "Natural name of the food, e.g. 'chicken thigh', 'protein shake'.",
                }
            },
            "required": ["name_or_alias"],
        },
    },
    "search_knowledge": {
        "name": "search_knowledge",
        "description": (
            "Search a knowledge source for entries matching a query (substring over "
            "names and aliases). Use when you're not sure of the exact item name."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "source": {
                    "type": "string",
                    "description": "Knowledge source id, e.g. 'recipes'.",
                },
                "query": {"type": "string", "description": "Free-text search query."},
            },
            "required": ["source", "query"],
        },
    },
}


def specs_for(tool_names: list[str]) -> list[dict[str, Any]]:
    """Return the tool specs for the given names, in order, skipping unknowns."""
    return [TOOL_SPECS[n] for n in tool_names if n in TOOL_SPECS]


# ── Dispatch ────────────────────────────────────────────────────────────────────

def dispatch(tool_name: str, args: dict[str, Any]) -> dict[str, Any]:
    """Run a tool call. Returns a JSON-serialisable dict, or {"error": ...}."""
    if tool_name == "query_recipe":
        name = args.get("name_or_alias", "")
        r = get_recipe(name)
        if r is None:
            return {"error": f"unknown recipe: {name!r}"}
        return {
            "id": r.id,
            "name": r.name,
            "yields_servings": r.yields_servings,
            "per_serving_macros": r.per_serving_macros.model_dump(),
            "total_macros": r.total_macros.model_dump(),
            "ingredients": [
                {"name": ing.food_name, "qty": ing.qty, "unit": ing.unit}
                for ing in r.ingredients_resolved
            ],
            "aliases": r.aliases,
        }

    if tool_name == "query_food":
        name = args.get("name_or_alias", "")
        f = get_food(name)
        if f is None:
            return {"error": f"unknown food: {name!r}"}
        return {
            "id": f.id,
            "name": f.name,
            "basis": {"per": f.basis.per, "unit": f.basis.unit},
            "serving_label": f.serving_label,
            "macros": f.macros.model_dump(),
            "aliases": f.aliases,
        }

    if tool_name == "search_knowledge":
        source = get_source(args.get("source", ""))
        if source is None:
            return {"error": f"unknown source: {args.get('source')!r}"}
        return {"results": source.search(args.get("query", ""))}

    return {"error": f"unknown tool: {tool_name!r}"}
