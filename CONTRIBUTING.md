# Contributing to BuildX

Thank you for your interest in contributing to BuildX — India's B2B construction materials marketplace.

## Table of Contents
- [Getting Started](#getting-started)
- [Branch Strategy](#branch-strategy)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Running Tests](#running-tests)

---

## Getting Started

### Prerequisites
- Node.js >= 20
- Docker Desktop
- Git

### Local Setup

```bash
# 1. Fork the repo on GitHub, then clone your fork
git clone https://github.com/<your-username>/buildx.git
cd buildx

# 2. Add the upstream remote
git remote add upstream https://github.com/Harishrs2006/buildx.git

# 3. Install dependencies
npm install

# 4. Start local services (Postgres + Redis)
npm run docker:up

# 5. Copy env file and fill in your values
cp .env.example .env

# 6. Run database migrations
npm run db:migrate

# 7. Seed the database
npm run db:seed

# 8. Start dev servers (frontend + backend)
npm run dev
```

The API will be at `http://localhost:4000` and the web app at `http://localhost:3000`.

---

## Branch Strategy

```
main          ← production only — PRs from develop
develop       ← integration branch — PRs from feature/*
feature/*     ← your work lives here
hotfix/*      ← emergency fixes → PR to main + develop
```

**Always branch off `develop`:**

```bash
git checkout develop
git pull upstream develop
git checkout -b feature/your-feature-name
```

**Branch naming:**
| Type | Pattern | Example |
|---|---|---|
| Feature | `feature/short-description` | `feature/product-search` |
| Bug fix | `fix/short-description` | `fix/cart-total-rounding` |
| Docs | `docs/short-description` | `docs/api-authentication` |
| Refactor | `refactor/short-description` | `refactor/order-service` |
| Hotfix | `hotfix/short-description` | `hotfix/payment-crash` |

---

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/).

```
<type>(<scope>): <short summary>

[optional body]

[optional footer]
```

**Types:**
- `feat` — new feature
- `fix` — bug fix
- `docs` — documentation only
- `style` — formatting (no logic change)
- `refactor` — code change that is neither a fix nor a feature
- `test` — adding or updating tests
- `chore` — build process, dependency updates

**Examples:**
```
feat(products): add full-text search with Postgres
fix(cart): correct tax calculation for zero-rated items
docs(api): document quotation request endpoints
refactor(orders): extract order numbering to domain service
```

---

## Pull Request Process

1. **Open a PR against `develop`** (not `main`)
2. Fill in the PR template completely
3. Ensure all CI checks pass (lint, typecheck, tests, build)
4. Request a review — at least **1 approval** is required to merge
5. Keep your branch up-to-date with `develop` before merging
6. Squash commits before merge if there are many small/wip commits

**PRs to `main` are only opened by maintainers** when releasing a new version from `develop`.

---

## Code Style

- TypeScript strict mode — no `any`
- Follow the feature-first folder structure (see [ARCHITECTURE.md](./docs/ARCHITECTURE.md))
- No inline `console.log` in production code — use the `logger` service
- Zod schemas for all API input validation
- Repository pattern — services never import Prisma directly

Run the linter before pushing:
```bash
npm run lint
npm run typecheck
```

---

## Running Tests

```bash
# All tests
npm test

# API tests only
npm test --workspace=apps/api

# Watch mode
npm run test:watch --workspace=apps/api
```

Tests require the Docker services to be running (`npm run docker:up`).

---

## Questions?

Open a [GitHub Discussion](https://github.com/Harishrs2006/buildx/discussions) or file an [issue](https://github.com/Harishrs2006/buildx/issues).
