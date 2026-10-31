# BuildX: rules for Claude sessions

## Start of every session
Read `docs/SESSION_LOG.md` and continue from NEXT STEPS. Update it after every meaningful step
(timestamp in IST), and commit + push it with the code. The user's laptop can restart at any time
and terminal chat history is lost; this log is the only memory.

## Hard rules
- No Claude / AI co-author or "Generated with" lines in commits or PRs. Ever.
- No em dashes in user-facing copy.
- PRD (`docs/BuildX_PRD.pdf`): never invent prices, stock, ratings, reviews, delivery promises,
  supplier coverage or statistics. Sample data must be labelled as sample.
- Backend (apps/api) is authoritative for prices, stock, roles and order status.
- Auth is Firebase phone OTP, plus Google sign-in on the seller and buyer websites (user decision
  2026-10-31: free, SMS needs the paid Firebase plan). Ops console and mobile app stay phone OTP.
  Do not add any other auth provider.
- Every asset (images, logos, fonts, animations) lives in the repo and is pushed.

## Map
- apps/buyer-web: public storefront, deployed on Vercel (https://buildx-vgud.vercel.app/)
- apps/seller-web: supplier portal | apps/web: admin (PRD says it needs repair)
- apps/api: Express + MongoDB | apps/mobile: Expo app | packages/web-core: shared API client
- Design system: `docs/DESIGN_SYSTEM.md` (shared by web and the mobile app)
