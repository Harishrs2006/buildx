# Sthiva platform: feature checklist

Audit of the code on `main` (2026-11-05) against the full business model (buyer, supplier,
delivery partner, admin). Status: DONE = works end to end, PART = some of it exists, TODO = missing.

## How the code works today vs the target model

| | Today | Target |
| --- | --- | --- |
| Catalog and price | Each supplier lists their own products at their own price | Sthiva runs one catalog and sets the buyer price (market reference + supplier margin + commission + tax) |
| Supplier stock | Stock number on each listing, edited any time | Weekly availability: product, quantity, supply price, delivery yes/no, areas |
| Who gets an order | The supplier whose listing the buyer picked; order is CONFIRMED at once | System finds suitable suppliers, they accept or reject, then it is confirmed |
| Commission | None | Admin-configured, by category and delivery arrangement |
| Delivery | Supplier picks own vehicle or Sthiva driver; drivers self-assign from a pool | Same two options, plus vehicle type by load, delivery pricing, admin allocation |

## 1. Buyer (website + Sthiva app)

| Feature | Status | Notes |
| --- | --- | --- |
| Sign in (phone OTP, Google) | DONE | Phone SMS needs Firebase Blaze |
| Profile, delete account | DONE | |
| Addresses, PIN code, location | DONE | |
| Categories, search, filters | DONE | |
| Product page (images, description, price) | DONE | |
| Product variations (size, grade, brand) | TODO | Products have no variant model |
| Cart, delivery charge, total before ordering | DONE | Delivery charge is not priced by vehicle/distance yet |
| Place order (cash on delivery) | DONE | |
| Online payment | TODO | Razorpay needs company KYC (owner) |
| Track order, history | DONE | |
| Cancel order | DONE | Allowed before dispatch |
| Notifications | DONE | Push on status changes |
| Ratings and feedback | DONE | |

## 2. Supplier (seller website + Sthiva Partner app)

| Feature | Status | Notes |
| --- | --- | --- |
| Registration: business, owner, phone, address, GSTIN | DONE | |
| PIN codes served | DONE | Checked against India Post directory |
| Verification documents upload | PART | Schema has kycDocuments; no upload screen |
| Admin verifies before selling | DONE | Ops console |
| Delivery options (own vehicle or Sthiva) | DONE | Profile setting (canDeliver) plus choice per order at dispatch |
| Weekly availability (product, qty, supply price, delivery, areas) | TODO | Core gap |
| Incoming order notification | DONE | Push |
| Accept / reject order | DONE | Phase 3: offers, next supplier on reject or timeout |
| Order view: distance, Sthiva commission, expected payout | PART | Commission and payout done; distance in phase 5 |
| Fulfil, dispatch, deliver | DONE | |

## 3. Pricing and commission

| Feature | Status | Notes |
| --- | --- | --- |
| Shared Sthiva catalog (one item, many supplier listings) | DONE | Phase 2: suppliers pick or add items; ops check and merge |
| Market reference price per product | TODO | |
| Admin commission rules (by category, by delivery arrangement) | DONE | Phase 1 settings, applied in phase 4 |
| Buyer price computed from rules | DONE | Phase 4: cheapest supplier price + commission |
| Supplier payout computed per order | DONE | Phase 4: stored per line, shown to supplier |
| Full financial breakdown for admin | PART | Per order (Money panel); totals in phase 6/7 |
| GST per item | DONE | |

## 4. Delivery partner

| Feature | Status | Notes |
| --- | --- | --- |
| Registration with vehicle, number, licence | DONE | In Sthiva Partner app |
| Admin verification of drivers | DONE | Phase 5a (existing drivers grandfathered) |
| Vehicle capacity | DONE | Phase 1 vehicle types; phase 5a picks by order weight |
| Online / offline | DONE | |
| Incoming assignments, accept / reject | DONE | Phase 5b: one driver at a time, answer time, ops assign |
| Pickup and drop details, navigation | DONE | Opens Google Maps |
| Status updates | DONE | |
| OTP / proof of delivery | DONE | Phase 5b: 4-digit buyer code; ops can confirm without it |
| History, earnings | PART | History yes; earnings need delivery pricing |
| Separate driver app | TODO | Drivers currently use Sthiva Partner |

## 5. Admin (ops console)

| Feature | Status | Notes |
| --- | --- | --- |
| Orders list, detail, cancel, notes | DONE | |
| Assign / unassign driver | DONE | |
| Supplier verification | DONE | |
| Suspend users | DONE | ADMIN only |
| Buyers and drivers lists, driver verification | PART | Drivers list only |
| Categories and catalog management | PART | Catalog items: review, edit, merge, add (phase 2). Categories still seeded |
| Commission and delivery rate settings | DONE | Phase 1 (Settings tab) |
| Supplier reassignment after rejection | DONE | Phase 3: automatic, plus ops offer / move to next supplier |
| Vehicle selection, delivery charge | PART | Phase 5a automatic; manual override in 5b |
| Failed delivery handling | DONE | Phase 5b: driver/supplier report, ops queue, resolve or cancel |
| Refunds | TODO | Only after online payment exists |
| Payouts and settlement records | TODO | |
| Analytics (orders, sales, commission, performance) | PART | Summary counts only |

## Build phases

1. Admin settings: commission rules, delivery vehicle types and rates (no default amounts).
2. Sthiva catalog with market reference prices; supplier weekly availability.
3. Order allocation: supplier offers, accept / reject, reassignment, timeouts.
4. Pricing engine: buyer price, supplier payout, commission per order; shown to each side.
5. Delivery: vehicle selection by load, delivery pricing, driver offers, OTP at handover, failed delivery.
6. Settlement records: payouts to suppliers and drivers, admin marks them paid.
7. Admin analytics and user management screens.
8. Separate delivery partner app (third app variant).

Each phase ships with API tests and working screens; no buttons without a backend.
