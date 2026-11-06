# Sthiva: construction materials marketplace

Sthiva helps people building a house or site in India order cement, steel, sand, bricks and blocks from
verified local suppliers, with one clear price and cash on delivery. Starting in Karnataka.

[![CI](https://github.com/Harishrs2006/sthiva/actions/workflows/ci.yml/badge.svg)](https://github.com/Harishrs2006/sthiva/actions/workflows/ci.yml)

| | Address |
|---|---|
| Shop (buyers) | https://sthiva.com |
| Supplier portal | https://seller.sthiva.com |
| API | https://api.sthiva.com |
| Support | support@sthiva.com |

## How it works

- **Buyers** enter their site PIN code and see only items that verified suppliers can deliver there.
- **One price per item.** Sthiva sets the selling price from supplier rates plus a commission set by ops.
- **Orders go to one supplier at a time.** If a supplier does not answer in time, the order is offered to the next one.
- **Delivery** by the supplier's own vehicle or a Sthiva driver. A 4-digit delivery code is handed over only
  after the buyer checks the material.
- **Cash on delivery.** Online payments come after company registration.
- **Verified suppliers.** GST certificate plus shop licence or Udyam, reviewed by ops. Every Monday suppliers
  confirm stock and prices; a supplier who misses it is hidden from buyers until they confirm.
- **Payouts.** Ops records settlements for suppliers and drivers; each sees their own statement.

## Apps

One Expo codebase (`apps/mobile`) builds three Android apps, chosen with `APP_VARIANT`:

| App | Package | For |
|---|---|---|
| Sthiva | `com.sthiva.app` | Buyers |
| Sthiva Partner | `com.sthiva.partner` | Suppliers |
| Sthiva Driver | `com.sthiva.driver` | Delivery partners |

## Repository

```
apps/
  api/          Express + MongoDB (Mongoose) REST API, the source of truth for prices, stock, roles and order status
  buyer-web/    Next.js shop (sthiva.com)
  seller-web/   Next.js supplier portal
  web/          Next.js ops console
  mobile/       Expo app (buyer, partner and driver variants)
packages/
  shared/       Shared types
  web-core/     API client shared by the websites
deploy/vultr/   Docker Compose + Caddy setup for a single server
docs/           Launch runbook, design system, platform checklist
```

| Layer | Technology |
|---|---|
| API | Node.js, Express, TypeScript, MongoDB Atlas, Zod |
| Websites | Next.js, React, Tailwind CSS |
| Mobile | React Native (Expo, Expo Router), TanStack Query, Zustand |
| Sign-in | Firebase Authentication: phone OTP, plus Google on the websites and apps |
| Files | Cloudinary (product photos public, supplier documents private) |
| Hosting | Vercel (websites), Render (API), Cloudflare DNS; Vultr setup ready in `deploy/vultr` |

## Run locally

```bash
git clone https://github.com/Harishrs2006/sthiva.git
cd sthiva
npm install

cp apps/api/.env.example apps/api/.env   # fill MONGODB_URI and the Firebase values
npm run dev:api                          # http://localhost:4000/health

npm run dev:buyer-web                    # shop
npm run dev:seller-web                   # supplier portal
npm run dev:web                          # ops console

cd apps/mobile && APP_VARIANT=buyer npx expo start   # or partner / driver
```

Websites read `NEXT_PUBLIC_API_URL`; the mobile app reads `EXPO_PUBLIC_API_URL`
(`http://10.0.2.2:4000` from the Android emulator).

Tests: `cd apps/api && npm test` (runs against an in-memory MongoDB).

## Docs

- [docs/LAUNCH.md](docs/LAUNCH.md): launch runbook and paid switches
- [docs/PLATFORM_CHECKLIST.md](docs/PLATFORM_CHECKLIST.md): what the platform does today
- [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md): colours, type and components for web and mobile
- [deploy/vultr/README.md](deploy/vultr/README.md): moving everything to one server

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Changes go through pull requests; direct pushes to `main` are disabled.

## Copyright

© Harish R S. All rights reserved.
