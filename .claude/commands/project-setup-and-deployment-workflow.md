---
name: project-setup-and-deployment-workflow
description: Workflow command scaffold for project-setup-and-deployment-workflow in UI-TARS-desktop.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /project-setup-and-deployment-workflow

Use this workflow when working on **project-setup-and-deployment-workflow** in `UI-TARS-desktop`.

## Goal

Sets up or finalizes project configuration, environment, deployment scripts, and provides setup/testing documentation.

## Common Files

- `apps/agent-tars-web/.env.example`
- `apps/agent-tars-web/.eslintrc.json`
- `apps/agent-tars-web/.gitignore`
- `apps/agent-tars-web/next.config.ts`
- `apps/agent-tars-web/Dockerfile`
- `apps/agent-tars-web/docker-compose.yml`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Add or update environment and configuration files (e.g., .env.example, .eslintrc.json, .gitignore, next.config.ts).
- Add or update deployment and dockerization files (e.g., Dockerfile, docker-compose.yml, DEPLOY_VERCEL.md, DOCKER.md).
- Add or update setup, testing, and verification scripts and guides (e.g., TESTING.md, VERIFY_BUILD.sh, MASTER_GUIDE.md).

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.