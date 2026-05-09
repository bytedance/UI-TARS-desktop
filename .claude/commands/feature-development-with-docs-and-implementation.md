---
name: feature-development-with-docs-and-implementation
description: Workflow command scaffold for feature-development-with-docs-and-implementation in UI-TARS-desktop.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /feature-development-with-docs-and-implementation

Use this workflow when working on **feature-development-with-docs-and-implementation** in `UI-TARS-desktop`.

## Goal

Implements a major feature or completes a project milestone by adding or updating multiple implementation files (components, API routes, utilities), state management, and updating or adding documentation and guides.

## Common Files

- `apps/agent-tars-web/app/**/*.tsx`
- `apps/agent-tars-web/app/api/**/*.ts`
- `apps/agent-tars-web/components/**/*.tsx`
- `apps/agent-tars-web/lib/**/*.ts`
- `apps/agent-tars-web/README.md`
- `apps/agent-tars-web/QUICKSTART.md`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create or update multiple implementation files (e.g., components, API routes, utilities, state management).
- Add or update related documentation files (e.g., README, guides, overview, deliverables, quickstart).
- Update configuration files as needed (e.g., tsconfig, package.json, .env.example).

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.