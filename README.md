# BuildX

BuildX is a B2B marketplace for construction materials in India: contractors and builders
browse, compare and order cement, bricks, sand, steel, plumbing, electricals and more from
verified local suppliers, with real time stock, per item GST and Cash on Delivery. Built for
tier 2/3 India, starting with Tumakuru, Karnataka.

[![CI](https://github.com/Harishrs2006/buildx/actions/workflows/ci.yml/badge.svg)](https://github.com/Harishrs2006/buildx/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

## Live

| App | URL | Status |
|---|---|---|
| Buyer storefront | [buildx-vgud.vercel.app](https://buildx-vgud.vercel.app) | Live, Hi-Vis design |
| Seller portal | [buildx-48kc.vercel.app](https://buildx-48kc.vercel.app) | Live, pending Hi-Vis restyle |
| API | [buildx-api.onrender.com](https://buildx-api.onrender.com) | Live (free tier, sleeps when idle) |
| Mobile app | not published | Expo app, run locally for now |

Sign in uses Firebase phone OTP. Real SMS needs a Firebase Blaze (billing) plan, which this
project has not enabled yet, so only two test numbers work on the live sites for now:
`+91 7019282018` and `+91 7019282019`, OTP code `123456`.

## Apps in this monorepo

| App | What it is |
|---|---|
| `apps/buyer-web` | The public storefront (Next.js). Cinematic landing page, category and material browsing, cart, checkout, orders, profile. |
| `apps/seller-web` | The supplier portal (Next.js). Phone sign-in, a category aware product form, order management. |
| `apps/api` | The backend (Express, MongoDB, TypeScript). Authoritative for prices, stock, roles and order status. |
| `apps/mobile` | The original React Native (Expo) app: buyer, supplier, delivery partner and ops roles. |
| `apps/web` | An older Next.js admin panel. Currently broken, not a priority. |
| `packages/web-core` | Shared API client, location picker and product hooks used by both web apps. |
| `packages/shared` | Shared TypeScript types and constants used by the API and the web apps. |

## Tech stack

| Layer | Technology |
|---|---|
| Web apps | Next.js (App Router), TypeScript, Tailwind CSS |
| Mobile app | React Native (Expo), TypeScript, Expo Router |
| Backend API | Node.js, Express, TypeScript |
| Database | MongoDB Atlas (Mongoose) |
| Auth | Firebase Authentication, phone OTP only |
| Images | Cloudinary |
| Hosting | Vercel (web apps), Render (API) |
| CI | GitHub Actions |

## Design system

The web apps (and eventually the mobile app) share one visual language, "Hi-Vis": near black
ink, warm sand, and signal lime reserved for calls to action. See
[`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md) for colours, type, spacing and motion.

## Honesty rules

These apply everywhere in the product, not just the code:

- The API is the only source of truth for prices, stock, supplier coverage and order status.
  Nothing in the UI invents a price, a rating, a delivery promise or a statistic.
- Sample or placeholder data is always labelled as sample.
- Auth is Firebase phone OTP only. No other sign in method.

## Quick start

```bash
git clone https://github.com/Harishrs2006/buildx.git
cd buildx
npm install
```

### API

```bash
cp apps/api/.env.example apps/api/.env
# fill in MONGODB_URI, FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
cd apps/api && npm run dev
# http://localhost:4000, health check at /health
```

### Buyer storefront

```bash
cp apps/buyer-web/.env.local.example apps/buyer-web/.env.local
# fill in NEXT_PUBLIC_API_URL and the NEXT_PUBLIC_FIREBASE_* values
cd apps/buyer-web && npm run dev
# http://localhost:3001
```

### Seller portal

```bash
cp apps/seller-web/.env.local.example apps/seller-web/.env.local
cd apps/seller-web && npm run dev
# http://localhost:3002
```

### Mobile app

```bash
echo "EXPO_PUBLIC_API_URL=http://10.0.2.2:4000" > apps/mobile/.env   # Android emulator
cd apps/mobile && npx expo start --android
```

## What is still missing

- Real SMS delivery for phone OTP (needs a Firebase Blaze plan; a billing decision, not a
  code change).
- The seller portal and the mobile app still use the older design; only the buyer storefront
  has had the Hi-Vis restyle.
- Online payment (UPI, cards) is designed for in the data model but not built; every order
  today is Cash on Delivery.
- `apps/web` (the admin panel) needs repair before it is usable again.
- A strict Content Security Policy is deferred until phone sign-in has been tested end to end
  with real SMS, since a CSP that is too strict can silently break Firebase's reCAPTCHA check.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Contributions go through pull request review.

## License

MIT, see [LICENSE](./LICENSE).
