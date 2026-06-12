# BuildX — Construction Materials Marketplace

> B2B platform for sourcing construction materials from verified suppliers — powered by AI

[![CI](https://github.com/Harishrs2006/buildx/actions/workflows/ci.yml/badge.svg)](https://github.com/Harishrs2006/buildx/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

---

## What is BuildX?

BuildX is a venture-scale B2B SaaS marketplace connecting construction companies and contractors with verified material suppliers. It features AI-powered product recommendations, automated quotation generation, supplier matching, and analytics.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React, TypeScript, Tailwind CSS, Shadcn UI |
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL, Prisma ORM |
| Auth | Clerk (SSO, RBAC, multi-tenant) |
| Storage | Cloudinary (image CDN) |
| AI | OpenAI API, LangChain |
| Cache | Redis |
| Queue | BullMQ |
| Infra | Docker, GitHub Actions, AWS |

## Architecture

- **Clean Architecture** — domain logic isolated from frameworks
- **Feature-first structure** — code organized by domain, not layer
- **Repository pattern** — services never touch the ORM directly
- **DDD** — entities, value objects, domain errors

## Quick Start

```bash
# Clone and install
git clone https://github.com/Harishrs2006/buildx.git
cd buildx
npm install

# Start local services
npm run docker:up

# Configure environment
cp .env.example .env
# Fill in your Clerk, Cloudinary, OpenAI keys

# Run migrations and seed
npm run db:migrate
npm run db:seed

# Start development
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000
- DB Admin: http://localhost:8080

## Phases

| Phase | Status | Description |
|---|---|---|
| 1 — Foundation | ✅ Done | Monorepo, DB schema, API scaffold, CI/CD |
| 2 — Auth | 🔄 Next | Clerk integration, RBAC, onboarding |
| 3 — Marketplace UI | ⏳ | Product listing, search, categories |
| 4 — Products & Categories | ⏳ | CRUD, inventory, image upload |
| 5 — Cart & Orders | ⏳ | Cart, checkout, order lifecycle |
| 6 — Admin Dashboard | ⏳ | Analytics, supplier mgmt, approvals |
| 7 — AI Features | ⏳ | Recommendations, quotations, matching |
| 8 — Cloud Deployment | ⏳ | AWS ECS, RDS, CloudFront |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). All contributions go through a PR review — direct pushes to `main` and `develop` are disabled.

## License

MIT © [Harishrs2006](https://github.com/Harishrs2006)
