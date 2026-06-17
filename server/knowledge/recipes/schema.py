"""Pydantic models for the recipe library.

A `Food` is an atomic unit with macros (raw ingredient or packaged item).
A `Recipe` is a composition of foods that yields N servings.
A `ComputedRecipe` is the same recipe with per-serving + total macros baked in.

Ported from V1 (server/data/recipes/schema.py) — the source data is identical,
only the on-disk format changed from YAML to JSON.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Unit = Literal["g", "ml", "serving"]
Source = Literal["usda", "nutrition_label", "estimate"]


class Macros(BaseModel):
    model_config = ConfigDict(extra="forbid")

    calories: float = Field(ge=0)
    protein_g: float = Field(ge=0)
    carbs_g: float = Field(ge=0)
    fat_g: float = Field(ge=0)


class FoodBasis(BaseModel):
    model_config = ConfigDict(extra="forbid")

    per: float = Field(gt=0)
    unit: Unit


class Food(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    basis: FoodBasis
    macros: Macros
    source: Source
    aliases: list[str] = Field(default_factory=list)
    serving_label: str | None = None
    notes: str | None = None


class RecipeIngredient(BaseModel):
    model_config = ConfigDict(extra="forbid")

    food: str
    qty: float = Field(gt=0)
    unit: Unit


class RecipePrep(BaseModel):
    model_config = ConfigDict(extra="forbid")

    method: str
    notes: str | None = None


class Recipe(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    aliases: list[str] = Field(default_factory=list)
    yields_servings: float = Field(gt=0)
    ingredients: list[RecipeIngredient]
    seasonings: list[str] = Field(default_factory=list)
    prep: RecipePrep | None = None


class ResolvedIngredient(BaseModel):
    model_config = ConfigDict(extra="forbid")

    food_id: str
    food_name: str
    qty: float
    unit: Unit
    macros: Macros


class ComputedRecipe(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    aliases: list[str] = Field(default_factory=list)
    yields_servings: float
    per_serving_macros: Macros
    total_macros: Macros
    ingredients_resolved: list[ResolvedIngredient]
    seasonings: list[str] = Field(default_factory=list)
    prep: RecipePrep | None = None
