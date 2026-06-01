---
name: supabase-query
description: TODO — port from V1. Run a SQL query directly against the Saarthi Supabase project using the Management API.
---

# Supabase Query

**TODO: port from V1.**

- V1 version assumed: hits the Supabase Management API for project `pedalbyxrzkltfbzbewc` with a stored access token.
- V2 needs: the same surface. The project ID is unchanged because V2 shares the Supabase project with V1. Only difference: V2 tables are prefixed `v2_`, so default examples should target `v2_threads` / `v2_thread_messages` rather than V1's tables.

Until ported, run ad-hoc SQL via the Supabase dashboard or the project's `psql` connection string.
