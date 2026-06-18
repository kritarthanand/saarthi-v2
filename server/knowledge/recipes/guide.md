# Recipe & Macro Bank — agent guide

This is the user's personal **recipe and macro knowledge bank**. It is the
reference the meal-logging thread (`#MealLog`) uses to track what the user eats
and to compute macros accurately.

## What's in it

- **Recipes** — the user's repeat meal-prep dishes (e.g. *Tandoori Chicken*,
  *Chicken Burrito*, *Turkey Kabab*, *Chicken & Basmati Fried Rice*). Each
  recipe lists its ingredients, how many servings it yields, **per-serving
  macros**, and **total batch macros**.
- **Foods** — the atomic ingredients and packaged items the recipes are built
  from (raw chicken, greek yogurt, basmati rice, protein bars, frozen meals…),
  each with macros on a stated basis (`per 100 g` or `per 1 serving`).

Every recipe and food has **aliases** — look items up by any natural name the
user might say ("tandoori", "fried rice", "burrito", "protein shake").

## Macro convention

All macros are four numbers: `calories`, `protein_g`, `carbs_g`, `fat_g`.
Foods state macros per their `basis` (`per: 100, unit: g` or `per: 1,
unit: serving`); recipe ingredient quantities are scaled against that basis.
Seasonings (spices) are listed for reference but are **not** macro-tracked.

## How to use it (when logging a meal)

1. The user describes a meal in natural language.
2. Resolve each component:
   - A known dish → `query_recipe("<name>")`. Multiply per-serving macros by how
     many servings they ate.
   - A single ingredient or packaged item → `query_food("<name>")`. Scale macros
     by the quantity (grams or servings).
   - Something not in the bank → ask the user for the macros, or estimate and
     say so.
3. **Confirm the resolved item + macros with the user before logging.**
4. Sum the day's macros for macro-tracking.

If a lookup returns an error (unknown alias), don't guess — ask the user to
clarify or add the item to the bank.
