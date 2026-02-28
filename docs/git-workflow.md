# Git Workflow

Guidelines for branching, commits, and collaboration.

## Branches

- **`main`** (or `master`) – Production-ready code. Protect this branch; require review before merge.
- **`develop`** (optional) – Integration branch for features; merge to `main` for releases.
- **Feature branches** – Create from `main` or `develop`, e.g. `feature/user-auth`, `feature/dashboard`, `fix/login-error`.
- **Hotfix branches** – For urgent production fixes, e.g. `hotfix/critical-patch`.

## Commits

- Write clear, present-tense messages: “Add user login” not “Added user login”.
- One logical change per commit when possible.
- Reference issue/ticket numbers if you use them: `Add login form (fixes #12)`.

## Pull requests / Code review

- Open a PR for feature branches into `main` (or `develop`).
- Describe what changed and why; link any related issues.
- Address review comments before merging.
- Keep PRs reasonably small so they are easier to review.

## What to commit

- Do commit: source code, config templates (no secrets), docs, and script changes.
- Do not commit: `node_modules/`, `.env` (use `.env.example` or docs for required vars), build artifacts, IDE-only config if it’s personal preference. Keep `.gitignore` up to date.
