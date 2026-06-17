"""Knowledge layer — generic, file-based reference banks linked to threads.

A *knowledge source* is a folder of repo files (data + an optional prose guide)
that a thread can link to. The agent (when the LLM runtime lands) reads a
source's preamble and is handed its tool specs so it can look facts up.

Sub-packages:
  recipes/   — foods + recipes + computed macros (the meal-logging bank)

Top-level modules:
  sources.py — registry of knowledge sources (list_sources / get_source)
  links.py   — thread ↔ source wiring (TEMPLATE_KNOWLEDGE, linked_sources)
  tools.py   — agent tool specs + dispatch over the loaders
  context.py — per-thread context assembly stub (THREADS.md §5)
"""
