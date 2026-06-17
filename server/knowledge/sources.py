"""Knowledge-source registry.

A *knowledge source* is a named, file-backed reference bank that threads can
link to. Each source exposes a small, uniform surface so the generic layer
(links / tools / context) and the HTTP routes don't need to know about any one
bank's internals:

    .manifest          → id / name / description / kind / tool_names
    .guide()           → prose agent guide (markdown), for the prompt preamble
    .search(query)     → list[dict] of matching entries (agent-friendly shape)
    .index(limit)      → compact one-line-per-entry text index for the preamble
    .entry(id)         → a single entry by id/alias, or None

The registry is explicit (a dict). Add a new bank by writing a source class and
registering it here — that's the seam that makes the system reusable beyond
recipes.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

from knowledge import recipes as recipes_lib

_KNOWLEDGE_ROOT = Path(__file__).parent


class KnowledgeSource:
    """Base class. A source is identified by `source_id`, which is also its
    folder name under server/knowledge/."""

    source_id: str = ""

    @property
    def _dir(self) -> Path:
        return _KNOWLEDGE_ROOT / self.source_id

    @lru_cache(maxsize=1)  # noqa: B019 — singleton sources, cache is fine
    def _manifest_raw(self) -> dict[str, Any]:
        import json

        path = self._dir / "manifest.json"
        return json.loads(path.read_text())

    @property
    def manifest(self) -> dict[str, Any]:
        m = dict(self._manifest_raw())
        m.pop("guide", None)  # internal pointer, not part of the public manifest
        return m

    @property
    def tool_names(self) -> list[str]:
        return list(self._manifest_raw().get("tools") or [])

    def guide(self) -> str:
        """Prose agent guide (markdown). Empty string if the source has none."""
        rel = self._manifest_raw().get("guide")
        if not rel:
            return ""
        path = self._dir / rel
        return path.read_text() if path.exists() else ""

    # -- subclasses override these ------------------------------------------
    def search(self, query: str) -> list[dict[str, Any]]:
        raise NotImplementedError

    def index(self, limit: int | None = None) -> str:
        raise NotImplementedError

    def entry(self, entry_id: str) -> dict[str, Any] | None:
        raise NotImplementedError


class _RecipesSource(KnowledgeSource):
    source_id = "recipes"

    @staticmethod
    def _recipe_to_dict(r: recipes_lib.ComputedRecipe) -> dict[str, Any]:
        return {
            "kind": "recipe",
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

    @staticmethod
    def _food_to_dict(f: recipes_lib.Food) -> dict[str, Any]:
        return {
            "kind": "food",
            "id": f.id,
            "name": f.name,
            "basis": {"per": f.basis.per, "unit": f.basis.unit},
            "serving_label": f.serving_label,
            "macros": f.macros.model_dump(),
            "aliases": f.aliases,
        }

    def meals(self) -> list[dict[str, Any]]:
        """The list of meals (recipes) with macros — the bank's headline view."""
        return [self._recipe_to_dict(r) for r in recipes_lib.list_recipes()]

    def foods(self) -> list[dict[str, Any]]:
        return [self._food_to_dict(f) for f in recipes_lib.list_foods()]

    def search(self, query: str) -> list[dict[str, Any]]:
        hits = [self._recipe_to_dict(r) for r in recipes_lib.search_recipes(query)]
        hits += [self._food_to_dict(f) for f in recipes_lib.search_foods(query)]
        return hits

    def entry(self, entry_id: str) -> dict[str, Any] | None:
        r = recipes_lib.get_recipe(entry_id)
        if r is not None:
            return self._recipe_to_dict(r)
        f = recipes_lib.get_food(entry_id)
        if f is not None:
            return self._food_to_dict(f)
        return None

    def index(self, limit: int | None = None) -> str:
        """Compact meals index for the prompt preamble: one line per recipe with
        per-serving macros, so the agent knows what's available without a lookup."""
        recipes = recipes_lib.list_recipes()
        if limit is not None:
            recipes = recipes[:limit]
        lines = []
        for r in recipes:
            m = r.per_serving_macros
            lines.append(
                f"- {r.name} ({r.yields_servings:g} servings) — per serving: "
                f"{m.calories:g} cal, {m.protein_g:g}P / {m.carbs_g:g}C / {m.fat_g:g}F"
            )
        return "\n".join(lines)


# ── Registry ──────────────────────────────────────────────────────────────────

_REGISTRY: dict[str, KnowledgeSource] = {
    "recipes": _RecipesSource(),
}


def list_sources() -> list[KnowledgeSource]:
    return list(_REGISTRY.values())


def get_source(source_id: str) -> KnowledgeSource | None:
    return _REGISTRY.get(source_id)
