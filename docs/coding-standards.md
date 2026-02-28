# Coding Standards

Guidelines for writing consistent, maintainable code across the project.

## General

- Use clear, descriptive names for variables, functions, and files.
- Prefer small, single-purpose functions and modules.
- Comment non-obvious logic; keep comments up to date.
- Remove commented-out code and debug statements before committing.

## JavaScript / Node (Backend)

- **Runtime:** Node 18+ with ES modules (`"type": "module"`).
- **Formatting:** 2 spaces, trailing commas where valid, semicolons.
- **Naming:**
  - `camelCase` for variables and functions.
  - `PascalCase` for constructors, classes, and model names.
  - `UPPER_SNAKE_CASE` for constants.
- **Async:** Prefer `async/await` over raw Promises; handle errors with `try/catch` or pass to Express `next()`.

## React / Frontend

- **Components:** Prefer function components and hooks.
- **Naming:** PascalCase for components; camelCase for props and state.
- **Files:** One main component per file; name file to match component (e.g. `UserProfile.jsx`).
- **Imports:** Group and order: React, then third-party, then local (components, utils, styles).

## File and folder naming

- **Backend:** `camelCase` or `kebab-case` for files (e.g. `userController.js`, `error-handler.js`).
- **Frontend:** PascalCase for component files (e.g. `Layout.jsx`), camelCase for utilities and hooks.
- **Docs:** `kebab-case` for markdown and other docs (e.g. `api-guidelines.md`).

## Linting and formatting

- Use the project’s ESLint/Prettier config (when added); fix lint errors before committing.
- Run the configured formatter so diffs stay consistent.
