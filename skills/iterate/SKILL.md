---
name: iterate
description: Read the current progress tracker, implement the next pending task, open a PR, update PROGRESS.md, and push the result when the user wants the next iteration completed.
---

# Iterate

Use this skill for the repo's task-by-task implementation loop.

## Workflow

1. Read `PROGRESS.md` and `TASKS.md` to find the next pending task.
2. Implement the task according to the project rules in `CLAUDE.md`.
3. Create a PR and capture the URL.
4. Update `PROGRESS.md` so the completed task moves to Completed and the current task advances.
5. Commit and push the progress update.
6. Return the PR URL.

## Notes

- Preserve the repo's existing branch and worktree conventions.
- Keep the task list and PR links in sync.

