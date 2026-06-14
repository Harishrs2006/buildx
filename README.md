# BuildX — Construction Materials Marketplace

> B2B platform connecting contractors and construction companies with verified local suppliers — built for tier-2/3 India (starting Tumakuru, Karnataka)

[![CI](https://github.com/Harishrs2006/buildx/actions/workflows/ci.yml/badge.svg)](https://github.com/Harishrs2006/buildx/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

---

## What is BuildX?

BuildX is a B2B marketplace mobile app where contractors and builders browse, compare, and order construction materials (cement, sand, bricks, steel, equipment rentals) directly from verified local suppliers — with real-time stock, per-item GST calculation, and Cash on Delivery.

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile App | React Native (Expo), TypeScript, Expo Router |
| Backend API | Node.js, Express.js, TypeScript |
| Database | MongoDB Atlas (Mongoose ODM) |
| Auth | Firebase Authentication (Phone OTP) |
| Storage | Cloudinary (image CDN) |
| Cache | Redis (ioredis) |
| State | Zustand + MMKV persistence |
| Data Fetching | TanStack Query v5 |
| Payments | Cash on Delivery (Razorpay integration planned) |
| Infra | Docker (Redis), GitHub Actions CI |

## Architecture

```
buildx/
├── apps/
│   ├── mobile/          # React Native (Expo) — buyer + supplier app
│   └── api/             # Express.js REST API
├── packages/
│   └── shared/          # Shared types and utilities
└── infrastructure/
    └── docker/          # docker-compose for local Redis
```

- **Feature-first structure** — code organised by domain (auth, products, orders, payments)
- **Firebase Phone OTP** — no passwords, verified Indian mobile numbers only
- **MongoDB + Mongoose** — flexible schema for construction product specs and bulk pricing
- **Per-item GST** — 5%/12%/18%/28% rates per product, accurate invoice breakdown

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/Harishrs2006/buildx.git
cd buildx
npm install

# 2. Start local Redis (optional — app works without it)
docker-compose -f infrastructure/docker/docker-compose.yml up -d

# 3. Configure API environment
cp apps/api/.env.example apps/api/.env
# Fill in: MONGODB_URI, FIREBASE_PROJECT_ID
# (Firebase: run "gcloud auth application-default login" for local dev)

# 4. Configure mobile environment
echo "EXPO_PUBLIC_API_URL=http://10.0.2.2:4000" > apps/mobile/.env

# 5. Start API
cd apps/api && npm run dev

# 6. Start mobile (separate terminal)
cd apps/mobile && npx expo start --android
```

- API: http://localhost:4000
- Health check: http://localhost:4000/health

## Environment Variables

### `apps/api/.env`

```env
MONGODB_URI=mongodb+srv://...
FIREBASE_PROJECT_ID=your-project-id

# Optional in dev (leave blank, uses gcloud ADC):
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Fill when ready:
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

### `apps/mobile/.env`

```env
# Android emulator → host machine
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000

# iOS simulator / physical device
# EXPO_PUBLIC_API_URL=http://192.168.x.x:4000
```

## Build Phases

| Phase | Status | Description |
|---|---|---|
| 1 — Foundation | ✅ Done | Monorepo, MongoDB schemas, API scaffold, Firebase setup, CI |
| 2 — Marketplace | ✅ Done | Product browse, search, cart (infinite scroll, per-item GST, multi-supplier detection) |
| 3 — Checkout & Orders | ✅ Done | Checkout flow, COD orders, stock deduction, order history |
| 4 — Supplier App | 🔄 Next | Supplier dashboard, product CRUD, order management |
| 5 — Image Uploads | ⏳ | Cloudinary integration for product photos |
| 6 — Admin Panel | ⏳ | Next.js admin dashboard, supplier verification, analytics |
| 7 — Payments | ⏳ | Razorpay UPI/card integration (post-scale) |
| 8 — AI Features | ⏳ | Smart recommendations, quotation generation |
| 9 — Cloud Deployment | ⏳ | Railway/Render API, Expo EAS build |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). All contributions go through PR review — direct pushes to `main` are disabled.

## License

MIT © [Harishrs2006](https://github.com/Harishrs2006)
