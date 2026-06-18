"""Compute per-serving macros for recipes and write recipes.computed.json.

Usage (run from `server/`):
    uv run python -m knowledge.recipes.compute          # write the computed file
    uv run python -m knowledge.recipes.compute --check  # exit 1 if computed file is stale

Validates that every ingredient resolves to a known food, ids/aliases are
unique, and ingredient units match their food's basis unit.

Ported from V1 (server/data/recipes/compute.py). Logic is identical; the only
change is YAML → JSON for the source and output files.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from knowledge.recipes.schema import (
    ComputedRecipe,
    Food,
    Macros,
    Recipe,
    ResolvedIngredient,
)

_PKG = Path(__file__).parent
FOODS_PATH = _PKG / "foods.json"
RECIPES_PATH = _PKG / "recipes.json"
COMPUTED_PATH = _PKG / "recipes.computed.json"

_PRECISION = 2  # decimal places for computed macro values


def _round(x: float) -> float:
    return round(x, _PRECISION)


def load_foods(path: Path = FOODS_PATH) -> dict[str, Food]:
    raw = json.loads(path.read_text(encoding="utf-8")) or []
    foods = [Food.model_validate(item) for item in raw]
    by_id: dict[str, Food] = {}
    for f in foods:
        if f.id in by_id:
            raise ValueError(f"duplicate food id: {f.id!r}")
        by_id[f.id] = f
    return by_id


def load_recipes(path: Path = RECIPES_PATH) -> list[Recipe]:
    raw = json.loads(path.read_text(encoding="utf-8")) or []
    recipes = [Recipe.model_validate(item) for item in raw]
    seen: set[str] = set()
    for r in recipes:
        if r.id in seen:
            raise ValueError(f"duplicate recipe id: {r.id!r}")
        seen.add(r.id)
    return recipes


def validate(foods: dict[str, Food], recipes: list[Recipe]) -> None:
    """Cross-check ingredient references and enforce alias uniqueness.

    Uniqueness is enforced *per namespace* — foods among foods, recipes among
    recipes — because the runtime resolves them through separate caches
    (`get_food` vs `get_recipe`). A food and a recipe may share an alias without
    conflicting at runtime, so we don't reject that here either.
    """
    def claim_into(owners: dict[str, str], kind: str, alias: str, owner: str) -> None:
        key = alias.lower()
        if key in owners:
            raise ValueError(
                f"alias collision within {kind}s: {alias!r} claimed by both "
                f"{owners[key]!r} and {owner!r}"
            )
        owners[key] = owner

    food_aliases: dict[str, str] = {}
    for f in foods.values():
        claim_into(food_aliases, "food", f.id, f.id)
        for a in f.aliases:
            claim_into(food_aliases, "food", a, f.id)

    recipe_aliases: dict[str, str] = {}
    for r in recipes:
        claim_into(recipe_aliases, "recipe", r.id, r.id)
        for a in r.aliases:
            claim_into(recipe_aliases, "recipe", a, r.id)

        for ing in r.ingredients:
            if ing.food not in foods:
                raise ValueError(
                    f"recipe {r.id!r} references unknown food {ing.food!r}"
                )
            food = foods[ing.food]
            if ing.unit != food.basis.unit:
                raise ValueError(
                    f"recipe {r.id!r} ingredient {ing.food!r}: "
                    f"unit {ing.unit!r} does not match food basis unit {food.basis.unit!r}"
                )


def _scale(m: Macros, factor: float) -> Macros:
    return Macros(
        calories=_round(m.calories * factor),
        protein_g=_round(m.protein_g * factor),
        carbs_g=_round(m.carbs_g * factor),
        fat_g=_round(m.fat_g * factor),
    )


def _add(a: Macros, b: Macros) -> Macros:
    return Macros(
        calories=_round(a.calories + b.calories),
        protein_g=_round(a.protein_g + b.protein_g),
        carbs_g=_round(a.carbs_g + b.carbs_g),
        fat_g=_round(a.fat_g + b.fat_g),
    )


def compute_recipe(r: Recipe, foods: dict[str, Food]) -> ComputedRecipe:
    resolved: list[ResolvedIngredient] = []
    total = Macros(calories=0, protein_g=0, carbs_g=0, fat_g=0)
    for ing in r.ingredients:
        f = foods[ing.food]
        scale = ing.qty / f.basis.per
        ing_macros = _scale(f.macros, scale)
        resolved.append(
            ResolvedIngredient(
                food_id=f.id,
                food_name=f.name,
                qty=ing.qty,
                unit=ing.unit,
                macros=ing_macros,
            )
        )
        total = _add(total, ing_macros)
    per_serving = _scale(total, 1 / r.yields_servings)
    return ComputedRecipe(
        id=r.id,
        name=r.name,
        aliases=r.aliases,
        yields_servings=r.yields_servings,
        per_serving_macros=per_serving,
        total_macros=total,
        ingredients_resolved=resolved,
        seasonings=r.seasonings,
        prep=r.prep,
    )


def render() -> str:
    """Compute everything and return the JSON payload as a string."""
    foods = load_foods()
    recipes = load_recipes()
    validate(foods, recipes)
    computed = [compute_recipe(r, foods) for r in recipes]
    payload = {
        "_generated": "AUTO-GENERATED by knowledge/recipes/compute.py — do not hand-edit. "
        "Edit foods.json or recipes.json, then run: "
        "(cd server && uv run python -m knowledge.recipes.compute)",
        "recipes": [c.model_dump(mode="python", exclude_none=True) for c in computed],
    }
    return json.dumps(payload, indent=2, ensure_ascii=False) + "\n"


def write_computed() -> tuple[Path, int]:
    body = render()
    # Write to a temp file then atomically replace, so a concurrent reader (the
    # runtime's mtime cache) never sees a half-written / truncated JSON file.
    tmp = COMPUTED_PATH.with_suffix(".tmp")
    tmp.write_text(body, encoding="utf-8")
    os.replace(tmp, COMPUTED_PATH)  # atomic on POSIX; near-atomic on Windows
    n = len(json.loads(body).get("recipes", []))
    return COMPUTED_PATH, n


def check_computed() -> bool:
    """Return True when the on-disk computed file matches what render() produces."""
    expected = render()
    actual = COMPUTED_PATH.read_text(encoding="utf-8") if COMPUTED_PATH.exists() else ""
    return expected == actual


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Exit 1 if recipes.computed.json is out of date.",
    )
    args = parser.parse_args(argv)

    if args.check:
        if check_computed():
            print(f"OK: {COMPUTED_PATH.name} is up to date")
            return 0
        print(
            f"ERROR: {COMPUTED_PATH.name} is out of date. Run:\n"
            f"  (cd server && uv run python -m knowledge.recipes.compute)",
            file=sys.stderr,
        )
        return 1

    path, n = write_computed()
    print(f"Wrote {path} ({n} recipe{'s' if n != 1 else ''})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
