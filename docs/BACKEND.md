# BuildX backend, in plain words

This is the map of how BuildX works behind the screens: who talks to what, where data lives, and
the rules the server enforces. Code lives in `apps/api` (Express + MongoDB, TypeScript).

## 1. The pieces

| Piece | What it is | Where it runs |
|---|---|---|
| Buyer website | `apps/buyer-web` (Next.js). Browse, cart, checkout, orders. | Vercel, buildx-vgud |
| Supplier portal | `apps/seller-web` (Next.js). A separate website for sellers. | Vercel, buildx-48kc |
| Mobile app | `apps/mobile` (Expo). Buyer, supplier and driver screens. | Phones |
| Admin / ops | `apps/web`. Verifies suppliers, handles stuck orders. Needs repair. | Not deployed yet |
| API | `apps/api`. The only thing that touches the database. | Render (`render.yaml`) |
| Database | MongoDB Atlas, database `buildx`. | Atlas cluster0 |
| Sign-in | Firebase phone OTP (project buildx-15494). | Google |
| Images | Product photos uploaded through `POST /upload/image`. | Cloud storage |

Every app calls the API through the shared client in `packages/web-core`. No app talks to the
database directly, so the API is the single source of truth for prices, stock, roles and order
status.

## 2. Sign-in and roles

1. The user enters their mobile number. Firebase sends a 6-digit OTP.
2. The app gets a Firebase ID token and calls `POST /auth/sync`. The API checks the token with
   Firebase Admin and finds or creates the user.
3. A new user calls `POST /auth/onboard` once and picks a role: `BUYER`, `SUPPLIER` or
   `DELIVERY_PARTNER`. `OPERATOR` and `ADMIN` are given by BuildX staff only.
4. Every later request sends the token in the `Authorization` header. Each route checks the role
   (`requireRole`), so a buyer can never call supplier routes and the other way round.

## 3. The supplier journey (supplier portal)

The portal enforces this order:

1. **Sign in with OTP** and onboard as a supplier (business name, city).
2. **Business setup** (`/setup`), saved with `PATCH /suppliers/me`:
   - business type: retail shop, authorised dealer, distributor or manufacturer
   - GSTIN (optional; checked against the 15-character GSTIN format, stored in capitals)
   - shop or yard address, WhatsApp number for order updates
3. **Delivery PIN codes**, saved with `POST /suppliers/me/service-pincodes`. Each PIN is checked
   against the India Post directory; a PIN that does not exist or has no delivery office is
   refused with a reason.
4. **Categories and brands** they deal in, from the BuildX catalogue, plus their own local brands.
5. Only now can they **list products**. The brand choices on the product form are the brands
   picked in step 4 that make that material, plus "Other".
6. **Stock** (`/stock`): set how much they can deliver right now, per product.

New suppliers start as `PENDING`. Their products go live for buyers once ops sets them to
`VERIFIED` (`PATCH /ops/suppliers/:id/verification`).

## 4. Stock rules

- Stock is a whole number in the product's selling unit (bags, tonnes, pieces...).
- Setting stock to 0 on a live product marks it `OUT_OF_STOCK`. Setting it above 0 again puts it
  back to `ACTIVE`. Drafts and discontinued products are never switched on by a stock change,
  and a status the supplier sends explicitly always wins.
- Placing an order takes the stock away in the same database step that checks it
  (`stockQuantity >= quantity`), so two buyers racing for the last bags cannot both get them.
  The loser sees "Only N left in stock".
- Cancelling an order puts the stock back, unless ops records that the goods already left.

## 5. Can this supplier deliver here? (serviceability)

- The India Post directory of post offices is imported into `PostalOffice`.
- A buyer's PIN is checked with `GET /locations/pincode/:pin/serviceability`.
- An order is accepted only if the supplier lists the buyer's PIN as a service PIN code. The
  order stores `serviceabilityCheck: VERIFIED`.

## 6. Orders

Buyer: `POST /orders/quote` (price and stock check, nothing saved), then `POST /orders` (creates
it, takes stock), `GET /orders`, `POST /orders/:id/cancel`.

Status flow (full table in `apps/api/src/features/orders/order-state.ts`):

```
CONFIRMED -> READY_FOR_PICKUP -> ASSIGNED -> PICKED_UP -> IN_TRANSIT -> DELIVERED   (BuildX driver)
CONFIRMED -> IN_TRANSIT -> DELIVERED                                                (supplier's own vehicle)
```

- Buyer or supplier can cancel only before a vehicle has the goods. Ops can cancel until delivery.
- Every status change is compare-and-set, so a double tap cannot move an order twice.
- Payment is cash on delivery for now. It is marked collected only when the person who delivered
  confirms the exact amount.

## 7. Main endpoints

All paths start with `/api/v1`.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/sync`, `POST /auth/onboard` |
| Catalogue (public) | `GET /categories`, `GET /products`, `GET /products/:id` |
| Locations (public) | `GET /locations/pincode/:pin`, `GET /locations/pincode/:pin/serviceability`, `POST /locations/reverse` |
| Buyer | `GET/PATCH /users/me`, `POST /users/me/addresses`, `/orders/*` |
| Supplier profile | `GET/PATCH /suppliers/me`, `GET /suppliers/me/stats`, `GET /suppliers/me/analytics` |
| Supplier PIN codes | `GET/POST /suppliers/me/service-pincodes`, `GET/DELETE /suppliers/me/service-pincodes/:pin` |
| Supplier products | `GET/POST /suppliers/me/products`, `GET/PATCH/DELETE /suppliers/me/products/:id` |
| Supplier orders | `GET /suppliers/me/orders`, `PATCH /suppliers/me/orders/:id/status`, `POST /suppliers/me/orders/:id/cod` |
| Driver | `/delivery/available`, `/delivery/orders/:id/assign`, `/delivery/my-orders`, `/delivery/orders/:id/status` |
| Ops | `/ops/summary`, `/ops/orders/*`, `/ops/suppliers`, `/ops/suppliers/:id/verification` |
| Uploads | `POST /upload/image` (suppliers only) |

Every response is `{ success, data }` or `{ success: false, error: { code, message, details } }`.
Request bodies are checked with Zod; unknown fields on `PATCH /suppliers/me` are refused, so a
supplier can never mark themselves verified.

## 8. Data model (MongoDB collections)

| Model | Holds |
|---|---|
| `User` | phone, name, role, addresses, active flag |
| `SupplierProfile` | business name, type, GSTIN, address, WhatsApp, service PIN codes, categories, brands, verification status |
| `Category` | the material categories shown on the site |
| `Product` | supplier, category, name, unit, price, GST, stock, minimum order, specifications (Material, Brand...), images, status |
| `Order` | buyer, supplier, line items with the price at the time, delivery address, status history, payment |
| `DeliveryPartner` | driver profile and vehicle |
| `PostalOffice` / `PostalDataset` | India Post directory and which version is imported |
| `Review` | buyer reviews |

## 9. Running and testing

```
npm install
npm run dev --workspace=apps/api        # API on http://localhost:4000
npm test --workspace=apps/api           # API tests (in-memory MongoDB)
npm run dev --workspace=apps/seller-web # supplier portal
```

Secrets (MongoDB URI, Firebase service account) live only in Render / Vercel settings and in
gitignored `.env.local` files, never in git.
