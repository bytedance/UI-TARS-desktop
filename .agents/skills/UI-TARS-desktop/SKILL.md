```markdown
# UI-TARS-desktop Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill teaches you the core development patterns, coding conventions, and workflows used in the `UI-TARS-desktop` TypeScript codebase. While no framework is detected, the repository emphasizes modular code, clear documentation, and robust project setup practices. You'll learn how to structure files, write and organize code, and follow the main workflows for feature development, project setup, and dependency management.

---

## Coding Conventions

### File Naming

- **CamelCase** is used for file names.
  - Example: `userProfile.tsx`, `apiRoutes.ts`

### Import Style

- **Alias imports** are preferred.
  - Example:
    ```typescript
    import { fetchData } from '@lib/apiUtils';
    import UserCard from '@components/UserCard';
    ```

### Export Style

- **Named exports** are standard.
  - Example:
    ```typescript
    // In userProfile.tsx
    export function UserProfile(props: Props) { ... }

    // In apiUtils.ts
    export const fetchData = async () => { ... };
    ```

### Commit Messages

- **Conventional commits** with the `feat` prefix are used.
  - Example: `feat: add user authentication flow`

---

## Workflows

### Feature Development with Docs and Implementation

**Trigger:** When adding a major feature or completing a milestone, including both code and documentation.  
**Command:** `/new-feature-with-docs`

1. **Create or update implementation files**  
   - Add or modify components, API routes, utilities, and state management modules.
   - Example:
     ```typescript
     // apps/agent-tars-web/components/NewWidget.tsx
     export function NewWidget() { ... }
     ```
2. **Add or update documentation**  
   - Edit or create files like `README.md`, `QUICKSTART.md`, or `COMPONENTS_OVERVIEW.md` to reflect new features.
   - Example:
     ```
     ## NewWidget Component
     This component handles ...
     ```
3. **Update configuration files as needed**  
   - Adjust `tsconfig.json`, `package.json`, or `.env.example` if your feature introduces new dependencies or settings.

**Files Involved:**
- `apps/agent-tars-web/app/**/*.tsx`
- `apps/agent-tars-web/app/api/**/*.ts`
- `apps/agent-tars-web/components/**/*.tsx`
- `apps/agent-tars-web/lib/**/*.ts`
- Documentation: `README.md`, `QUICKSTART.md`, `COMPONENTS_OVERVIEW.md`, etc.

---

### Project Setup and Deployment Workflow

**Trigger:** When preparing the project for deployment or onboarding, including environment setup, Docker, and deployment guides.  
**Command:** `/setup-deployment`

1. **Add or update environment/configuration files**
   - Edit `.env.example`, `.eslintrc.json`, `.gitignore`, `next.config.ts`, etc.
2. **Add or update deployment and dockerization files**
   - Maintain `Dockerfile`, `docker-compose.yml`, and deployment guides like `DEPLOY_VERCEL.md` or `DOCKER.md`.
3. **Add or update setup, testing, and verification scripts**
   - Update `TESTING.md`, `VERIFY_BUILD.sh`, or `MASTER_GUIDE.md` to document setup and testing procedures.

**Files Involved:**
- `.env.example`, `.eslintrc.json`, `.gitignore`, `next.config.ts`
- `Dockerfile`, `docker-compose.yml`
- `DEPLOY_VERCEL.md`, `DOCKER.md`, `TESTING.md`, `MASTER_GUIDE.md`
- `VERIFY_BUILD.sh`

---

### Dependency and Startup Fix Workflow

**Trigger:** When fixing startup errors or resolving missing dependencies to ensure the app runs correctly.  
**Command:** `/fix-startup`

1. **Update dependencies**
   - Edit `package.json` and `package-lock.json` to add or update dependencies.
2. **Update configuration**
   - Adjust `next.config.ts` as needed for compatibility.
3. **Add or update type declarations**
   - Edit or create files like `next-env.d.ts` for TypeScript support.

**Files Involved:**
- `package.json`, `package-lock.json`
- `next.config.ts`
- `next-env.d.ts`

---

## Testing Patterns

- **Test files** follow the `*.test.*` naming convention.
  - Example: `userProfile.test.ts`
- **Testing framework** is not specified; check `TESTING.md` or similar documentation for details.
- Place tests alongside implementation or in a dedicated `__tests__` directory.

---

## Commands

| Command                  | Purpose                                                      |
|--------------------------|--------------------------------------------------------------|
| /new-feature-with-docs   | Start a new feature with documentation and implementation    |
| /setup-deployment        | Prepare project setup, environment, and deployment configs   |
| /fix-startup             | Resolve startup issues or dependency problems                |

---
```