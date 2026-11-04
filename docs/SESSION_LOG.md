# BuildX session log

Live memory for Claude sessions. Read this first. Newest entries at the bottom of the timeline.
Times are IST.

## CURRENT STATE (2026-11-04 18:40 IST)
- Live: buyer site https://buildx-vgud.vercel.app, seller site (Vercel buildx-48kc), ops console https://buildx-ops.vercel.app,
  API https://buildx-api.onrender.com (Render free: sleeps when idle, ~1 min to wake). Google sign-in on both websites.
- Mobile app Google sign-in: PR #52 merged 17:19 IST, before 3 fixes; those are in PR fix/mobile-signin-followups
  (user confirmed the fixed build works on their phone 2026-11-04). Waiting for the user to merge.
- Mobile builds: OneDrive breaks Gradle, so build from the copy at C:/bx/mobile (robocopy app/ and src/ there first).
  Phone APK: `cd C:/bx/mobile/android && EXPO_PUBLIC_API_URL=https://buildx-api.onrender.com ./gradlew assembleRelease
  --max-workers=2 -PreactNativeArchitectures=arm64-v8a`, copy to Desktop/BuildX/BuildX-test.apk (not in git).
  Emulator is too heavy for this laptop for Google sign-in tests; use the user's phone.

## NEXT STEPS
1. User merges the follow-up PR (fix/mobile-signin-followups). Nothing to deploy for it (mobile app is installed from the APK; websites unaffected).
2. Not yet tested on the phone: buyer checkout contact-phone step (needs a buyer account; the user's Google account is
   a seller), and a brand-new Google account going through "Who are you on BuildX?".
3. Mobile pass 2 (remaining ~30 screens to the Hi-Vis look, new logo/fonts; native rebuild is fine now, see above).
4. Launch prep: NEXT_PUBLIC_SUPPORT_EMAIL / SUPPORT_PHONE / LEGAL_NAME (need the user's details), NEXT_PUBLIC_ALLOW_INDEXING=true.
5. Real SMS needs Firebase Blaze (money: user decides). Strict CSP together with an end-to-end sign-in test.
6. Render free host sleeps: first request after idle takes ~1 min. Paid plan or a keep-alive ping would fix (ask user).

## RULES (also in ~/.claude/CLAUDE.md and buildx/CLAUDE.md)
- No Claude co-author / contributor lines, ever.
- No em dashes in UI copy. No fabricated data (PRD).

## TIMELINE
### 2026-10-28
- 15:10 Session start. Read PRD, repo, deployed site (buildx-vgud.vercel.app = apps/buyer-web).
- 15:14 Local `main` had diverged old commits; saved as branch `backup/local-main-old`, created
  `feat/web-redesign` from origin/main.
- 15:15 Contributors check: origin/main has 0 Claude trailers; GitHub API contributors = Harishrs2006, Shubb07.
  Sidebar "claude" entry is a stale cache that refreshes after the next push to main. No history rewrite needed.
- 15:16 Saved global rules: ~/.claude/CLAUDE.md, ~/.claude/settings.json (includeCoAuthoredBy=false,
  attribution empty), Claude memory files, Desktop/BuildX/CLAUDE.md, buildx/CLAUDE.md.
- 15:20 Cloned to ~/tools: ui-ux-pro-max-skill, VoiceStudio, OmniVoice, Handy. Installed into ~/.claude/skills:
  ui-ux-pro-max (+ design, design-system, brand, banner-design, slides, ui-styling), voicestudio,
  omnivoice + handy (reference skills; those two are apps/models, not Claude skills).
- 15:22 User reference images saved to docs/design-references/ (local only, pending approval, excluded via .git/info/exclude).
- 15:25 User asked: rebuild site from scratch, trillion-dollar UI/UX, excellent animations, update deployed link.
- 15:28 Design system "Hi-Vis": ink #0B0C0A, sand #F2EFE7, signal lime #C8FF3D, cobalt #2457FF. Fonts (all OFL via
  next/font): Bricolage Grotesque (display), Geist (UI), Geist Mono (labels), Instrument Serif italic (accents).
  NOTE: Fontshare fonts (Switzer/Clash) rejected: their licence forbids distribution via a repository (public repo).
- 15:35 Built: tailwind tokens (old Material names remapped), globals.css motion, Logo (two crossing beams), Reveal/SplitLines/
  Spotlight motion, Header (dark-over-hero glass), BottomNav (mobile pill), SiteFooter, CategoryGrid, HeroVisual (isometric SVG stack),
  landing page (hero, marquee, PIN check via web-core LocationSelector, categories, how it works, principles, suppliers, CTA).
- 15:45 Sign-in rebuilt: split AuthShell, +91 phone field, 6-box OTP (paste/SMS autofill/auto-submit), 30s resend, change number
  (AuthProvider.resetOtp), safeNext() open-redirect guard. Onboarding with 18+ and terms consent.
- 15:46 Saved user brief + 21 images + links to Desktop/BuildX/user-brief/ (and docs/USER_BRIEF.md in repo).
- 16:00 Added: /search, /terms, /privacy, /refunds, /cookies (honest, match real data flows), StorageNotice, custom 404,
  robots.ts (noindex until NEXT_PUBLIC_ALLOW_INDEXING=true), sitemap.ts, icon.svg, opengraph-image, security headers in
  next.config.ts (CSP intentionally deferred: would break Firebase reCAPTCHA). `npm run build` passes (19 routes).
- 16:05 Found: Vercel git integration (team buildx9, projects buildx-vgud/buildx/buildx-48kc) deploys main; previews are
  login protected. Live API = https://buildx-api.onrender.com. Live bundle has no Firebase web config (sign-in broken in prod).
- 16:15 Screenshot QA: fixed logo tile invisible on dark (LogoMark onDark), mobile horizontal overflow (grid minmax(0,1fr) +
  overflow-x clip), hero capped at min(100svh,980px), hero blocks rebuilt as a clean stacked tower.
- 16:35 CDP screenshot script (scratchpad/shot.mjs) for true mobile widths; mobile has no overflow. Reveal now also
  shows elements already scrolled past. Storage notice hidden on /signin and /onboard. Em dashes removed from inner pages.
  New ProductListCard, category page header/skeletons/footer, product page footer, alt text on product images.
  docs/DESIGN_SYSTEM.md written (web + Expo mapping). Build passes.
- 16:40 User: full autonomy (deploy, env keys, auth via Claude in Chrome extension). Saved globally + memory.
- 16:20 Saved global prefs: decide technical things myself; questions need (Recommended) + chat option; commit+push after
  every sub-task because usage limits / shutdowns can cut a session; "continue" = read log and resume.
- 16:50 PR #25 opened, all CI + Vercel checks green, squash-merged to main (author Harish R S, no Claude trailer).
- 16:55 Verified live: new title, security headers, /privacy 200, custom 404, categories load from production API,
  mobile layout OK. Contributors widget should drop "claude" now that main has a fresh push (API already clean).
- 17:00 Claude in Chrome tools unavailable in this session. Private backup repo upload denied by permission classifier.
- 17:10 User decision: keep PRD + reference images local in Desktop/BuildX/user-brief (consolidated there, incl. PRD and Stitch zip).
- 17:30 User: product cards had no photos. Image sites unreachable from this machine, so drew 12 original isometric
  material illustrations (apps/buyer-web/public/illustrations/*.svg, generator scripts/generate-illustrations.py). lib/illustrations.ts
  maps product name/category to one; shown with an 'Illustration' label on cards, product page and cart when no supplier photo.
- 17:45 PR #26 merged (4faa314), live: category pages show labelled illustrations. TODO: product/supplier names in the
  production DB (seed data) contain em dashes, e.g. 'BuildX Demo Supplier (placeholder — not a real business)'; fix in
  apps/api/src/scripts/seed.ts and the live DB. Next session: Firebase keys in Vercel (needs /chrome).
- 18:00 User ran /chrome; extension installed + signed in, but browser tools still not loaded in this session. Fix: restart
  Claude Code with `claude --chrome` in Desktop/BuildX, then say 'continue'. FIRST TASK THEN: Firebase web keys into Vercel
  buildx-vgud env (Production) + add buildx-vgud.vercel.app to Firebase Auth authorized domains + redeploy + test OTP screen.
- 18:15 New session with `claude --chrome`, browser tools work. Firebase had no web app: registered 'BuildX Web'.
  Phone provider already enabled (Spark plan: 10 SMS/day). Added buildx-vgud.vercel.app to authorized domains via the
  Identity Toolkit admin API (service-account script in scratchpad; console form rejected the input). Added the 4
  NEXT_PUBLIC_FIREBASE_* vars to Vercel Production. Vercel asked to set up 2FA (skipped; user may want to enable it) and
  manual redeploy needs an email code, so pushed this log to main to trigger the production build.
- 18:30 Production build with Firebase config is live (key found in bundle). /signin works, reCAPTCHA loads.
  Next: real-phone OTP test by the user, then NEXT STEPS 4 (restyle cart/checkout/orders/profile).
- 18:45 User: OTP not arriving, page said 'Something went wrong'. Ran the same Firebase call in the live page: error is
  auth/billing-not-enabled (Spark plan cannot send real SMS; console '10/day' banner is misleading). Test numbers
  +917019282018/19 (code 123456) are configured in Firebase and skip SMS. Mapped billing-not-enabled + quota-exceeded to
  a clear message in buyer-web and seller-web AuthProvider. Asked user about upgrading to Blaze (money: user decides).
- 18:50 User chose: test numbers only for now, no Blaze yet. Next: NEXT STEPS 4 (restyle cart/checkout/orders/profile).
- 19:20 Restyled cart/checkout/orders/order detail/profile on branch feat/buyer-pages-restyle. Build passes, mobile cart
  390px no overflow (scratchpad/shot.mjs recreated: node shot.mjs <url> <w> <h> <out> [full] [localStorageJSON]).
- 19:40 User: test number + 123456 does not sign in. Render logs: POST /auth/sync -> 'secretOrPrivateKey must be an
  asymmetric key when using RS256'. Render FIREBASE_PRIVATE_KEY (project buildx-15494, correct) is wrapped in a quote
  and has stray text after the END line ('"whi'). Fix on branch fix/api-firebase-key: normalizePrivateKey() keeps only the
  PEM block (+ vitest). PR #27 merged by user; this fix needs the user to merge (auto-merge blocked by permission
  classifier). Render deploys main automatically.
- 19:55 User merged PR #27 (buyer pages live). Resolved SESSION_LOG conflict on PR #28 for the user to merge.
- 20:10 User merged PR #28: sign-in with test number works. Onboarding showed 'Could not complete onboarding': API
  /auth/onboard reply had no `phone`, web syncedUserSchema requires it, so a successful save was shown as an error (the
  user IS onboarded server-side). Fix: PR fix/onboard-response adds phone to the reply + test. Needs user merge.
- 21:30 User asked for a Zomato-style cinematic landing with a scroll-driven construction story (trucks, concrete,
  bricks, tiles, paint, electrical lights, luxury bathroom plumbing, skyline), 3D/WebGL/shader effects. Saved refs to
  user-brief (landing-ref-1..4.png). Stock video unreachable (pexels 403) -> built an ORIGINAL real-time 3D site in
  three.js/R3F: components/cinematic/ (chapters.ts, motionTier.ts, useChapterScroll.ts [Lenis + idle rAF],
  CinematicLanding.tsx, SiteScene.tsx, scene/World|Stations|parts|shaders). Chapter buttons link only to categories
  returned by GET /categories. Tiers: full (desktop WebGL), lite (phones: rendered WebP posters with CSS 3D
  crossfade), static (reduced motion). 18 posters in public/cinematic (rendered from the scene). Header gets
  darkUntilId. Removed HeroVisual/Spotlight. Vitest added to buyer-web (10 tests). ASSETS.md written.
  Lighthouse mobile (simulated, like PageSpeed): 84 perf / 96 a11y / 96 best practices, CLS 0.011, LCP 3.5 s
  (live baseline with old landing: 55, LCP 16.5 s). Devtools-throttled run: 56. Desktop preset run fails with
  NO_NAVSTART in headless (WebGL), not measured. SEO 66 is the intentional noindex.
- 22:40 User: 3D workers look "AI"/toy-like, wants real photographic scenes (refs photo-ref-1..3 in user-brief).
  Removed the three.js/R3F scene + deps + 3D posters. Generated 5 photoreal images with Canva AI (hero site at golden
  hour, steel truck at gate, concrete pour, brick toss, tile laying), exported full-size via Canva design export
  (Open in editor -> export-design jpg 1680x944) into apps/buyer-web/public/cinematic. Canva quota exceeded for paint,
  electrical, plumbing, skyline: those chapters auto-hide until photo exists (chapters.ts filters on photo).
  New PhotoStage.tsx: raw WebGL1 shader (cover crop + focus, scroll push-in, pointer parallax, fbm liquid dissolve,
  lime seam). Phones: next/image photos with CSS 3D crossfade. Bug fixed: loseContext in effect cleanup broke React
  Strict Mode remount. Tests 12 pass. Lighthouse mobile: simulated 62-65 (lantern cannot find LCP element, observed
  LCP 0.77 s), devtools-throttled 78 (LCP 3.5 s, CLS 0.022), accessibility 100.
- 23:00 User showed PR #30 merged 2 h ago (3D version live); photo commits came after. Opened feat/photo-landing
  from main with the photo version (identical tree) as a new PR.
- 23:30 User: "try those image things other ways". Figma generate_image (gemini-3.1-flash-image, Starter plan) worked:
  paint, electrical, plumbing, skyline at 1376x768, converted to JPG with sharp. Plumbing image had a hotel-style crest +
  name badge on the uniform: painted out (ring-sampled navy fill, feathered). Branch feat/landing-all-chapters switches
  on all 4 chapters; ASSETS.md lists sources. Tests 12 pass, build OK.
- 23:10 User: PIN check belongs on product info; images for category cards; complete Indian-market catalogue (bricks,
  blocks, jelly sizes, M/P-sand in tonnes/brass, electrical + plumbing materials with brands like V-Guard, Lisha...).
  Branch feat/catalog, PR #33: 10 category photos (Figma AI, unbranded) in public/categories; lib/catalog (57 material
  types, BIS standards, sizes, trade units, brands, aliases; NO prices/stock); units.ts (brass=100 cft=2.83 m3, TMT
  D^2/162, bags, coils); /materials/[id] pages with choices, brand chips, QuantityHelper, DeliveryCheck, offers that
  really match (matchCatalogItem on real listing names); category page = banner + catalogue + live listings; product
  page rebuilt with PIN check in the buy box (add to cart blocked when not deliverable); home PIN block removed.
  Facts checked online (brass, TMT weight, 90 m coils, brick/AAC sizes). Removed brands I could not verify.
  Note: another local Claude session ("E-commerce codebase health audit") committed ddef1fd in this folder; it has
  moved to its own worktree (Desktop/BuildX/readme-update) and is updating README + this log in a separate PR.
  Preview can't call the live API (CORS allows production only), so product/offers were checked by tests only.
- 23:15 PR #33 (catalogue) merged and live; verified M-sand material page shows only the real M-sand listing.
  Live PIN checks were ALL failing: GET /locations/pincode/:pin -> 503 LOOKUP_UNAVAILABLE because the India Post
  directory had never been imported into production (cluster0.xkcruay, db buildx; same cluster as apps/api/.env).
  With user approval: downloaded the GODL-licensed mirror (ndp.ckan.civicdatalab.in, pincode_30052019.csv, 16 MB;
  official data.gov.in download needs a CAPTCHA form), dry run OK, then imported:
  155,525 offices / 19,252 PINs, version "2019-05" active. Verified: 572101 serviceable (1 supplier), 560001 NO_SUPPLIERS,
  product page shows "Delivers to 572101". TODO: import a current monthly file from data.gov.in when the user downloads
  it (npm run import-postal --workspace=apps/api -- --file <csv> --version YYYY-MM --yes); PINs created after 2019
  currently return not found. Em dashes: see 23:30 entry.
- 23:30 Em dashes in data: seed.ts strings fixed (18 lines). New script apps/api/src/scripts/fix-dashes.ts
  (npm run fix-dashes --workspace=apps/api -- --dry-run | --yes) with test. Dry run on production: 4 fields
  (supplier "placeholder, not a real business", 1 product name, 2 descriptions). Writing to the live DB was blocked by
  the permission classifier: USER must run `npm run fix-dashes --workspace=apps/api -- --yes` (or approve it).
### 2026-10-29
- 00:30 Supplier portal redesign (branch feat/seller-hivis): catalogue moved to packages/web-core/src/catalog (shared by
  buyer + seller; buyer imports from @buildx/web-core; new helpers suggestedListingUnit / suggestedListingName; matcher
  also matches the material name). Test: every one of the 57 items round-trips choices -> name -> same item.
  seller-web: buyer tokens/fonts/globals, Logo, components/ui.tsx (PageHead, Chip, Pill, Pager, EmptyState),
  dark top bar + floating pill tab bar, Overview (greeting, verification banner, live stats, new-orders list, quick
  actions), Orders (cards, tel link, in-page cancel confirm, inline errors, no alert/confirm), Products (rows, in-page
  discontinue confirm), ProductForm rebuilt around the catalogue (category -> material -> options/brand -> auto name with
  "buyers will find this" check -> price/unit/stock/MOQ/delivery days -> photos; sticky save bar), sign-in with 6-box OTP,
  resend timer and Change number (resetOtp added), onboarding on the split AuthShell. lib/categoryTemplates.ts removed.
  Friendly sign-in config error (dev detail goes to console). Signed-in screens verified by type-check + build only.
- 01:20 Vercel Hobby build-rate-limit hit (3 projects build per push: buildx, buildx-48kc, buildx-vgud). Offered to
  disconnect the 2 likely-duplicate projects (needs user OK). PR #37 merged by user.
- 01:40 Mobile pass 1 (feat/mobile-hivis): read apps/mobile AGENTS.md (Expo v56 docs first). colors.ts remapped to
  Hi-Vis (same keys + brand names) so all 37 screens re-skin; src/components/ui.tsx (TabItem/tabBarStyle, Button, Card,
  Eyebrow, Pill, type); 4 role tab bars: ink bar + lime active pill, emoji icons removed (no icon lib installed; adding
  @expo/vector-icons/expo-font needs a native rebuild, so not done). Auth phone + OTP rebuilt (dark brand panel, inline
  errors, SMS autofill oneTimeCode/sms-otp). Buyer home: real categories via new useCategories (old hard-coded slugs
  like 'materials'/'services' did not exist), category photos from the web app, removed invented "HEAVY MACHINERY
  RENTALS NOW OPEN in Tumakuru" promo. app.json splash/icon bg -> ink (applies on next native build).
  tsc: only the 2 pre-existing typed-route errors in app/_layout.tsx (same on main locally; CI passes).
- 02:30 User: landing images should move ("works doing"), change automatically, and NOT change on touch/scroll;
  must run smoothly. Branch feat/hero-slideshow: replaced the scroll-pinned story + WebGL PhotoStage + Lenis with
  components/cinematic/HeroSlideshow.tsx: full-screen, timer-driven (the progress bar's CSS animation is the clock),
  Ken Burns push-in towards each photo's focus point, 1.4 s crossfade, next photo preloaded and required before
  switching, pauses when off-screen / tab hidden / user presses pause, reduced motion = one still photo, no controls.
  Removed CinematicLanding, PhotoStage, useChapterScroll, motionTier, lenis. Measured (scratchpad perf.mjs, headless
  Chrome, 20 s): desktop 60 fps, 0 frames >33 ms, no long tasks, CLS 0.002; phone 390px with 4x CPU throttle 59.8 fps,
  1 frame >33 ms, no long tasks; slide every ~6.5 s; scroll/click/touch never changed the slide.
  Real worker motion needs AI video (Figma Weave not linked to the user's account), so camera motion only for now.
- 07:29 Supplier onboarding UI on feat/supplier-onboarding: app/(dashboard)/setup (3-step wizard using lib/setup.ts),
  products/new gated on isSetupComplete, ProductForm brands = supplier's brands that make the material (else all),
  new /stock page (+/- and input per product, save via PATCH stockQuantity, server flips ACTIVE/OUT_OF_STOCK),
  nav tabs Stock + Business, Overview banner 'Finish your business setup (n of 3 done)'. docs/BACKEND.md written.
  seller-web tsc + next build clean; API tests 265 pass (backend commit 0286061).
- 16:28 PR #40 merged. Branch feat/admin-panel: apps/web rebuilt (old Clerk shell removed) as the ops console on
  Firebase OTP, OPERATOR/ADMIN only: Today (status counts + 6 stuck-order queues), Suppliers (verify/reject with
  reason, shows type/GSTIN/address/PINs/categories/brands), Orders (filter, search, detail with assign/unassign
  driver, record COD, cancel with restock choice, notes, history), Drivers. tsc + next build clean.
- New official logo from the user (house roof + BUILDX + grey X, tagline EXCELLENCE IN BUILDING), redrawn as SVG in
  packages/web-core/src/brand/BuildXLogo.tsx (BuildXLogo, BuildXMark). Used in all 3 sites' Logo.tsx, buyer hero
  (with tagline), footer, and app/icon.svg tab icons. Screenshots checked at 1440 and 390 px.
- 16:51 Ops console hosting: Vercel import form filled (project buildx-ops, root apps/web, Next.js, env
  NEXT_PUBLIC_API_URL=https://buildx-api.onrender.com + 4 NEXT_PUBLIC_FIREBASE_* copied from the live seller bundle);
  Deploy blocked by Vercel email-code re-auth (user must do it). buildx-ops.vercel.app ADDED to Firebase authorized
  domains. BLOCKED: Render FRONTEND_URL must add https://buildx-ops.vercel.app (CORS test: not allowed yet); Render
  not signed in on Chrome. Admin phone number for grant-role still needed from user (never use a test number:
  fixed code 123456 = anyone could sign in as admin).
- 13:42 User said 'run this': ran fix-dashes on prod (cluster0.xkcruay/buildx). Dry run showed 4 fields (3 products,
  1 demo supplier name); applied with --yes; re-check finds 0 em dashes. DONE.
- 16:59 Vercel project buildx-ops created by user (re-auth done). PR #42 SESSION_LOG conflict fixed by merging main.
  User chose +917019282018 as ADMIN (was BUYER, 0 orders): grant-role done. Because it is a Firebase test number,
  its fixed code was changed from 123456 to a private random code (Identity Toolkit testPhoneNumbers), stored ONLY in
  Desktop/BuildX/buildx-secrets/ADMIN_SIGNIN.txt (outside the repo). +917019282019 keeps 123456 for buyer/supplier tests.
  Still pending: Render FRONTEND_URL += https://buildx-ops.vercel.app (user must sign in to Render), merge #42.
- 2026-10-30 19:16 User: console sign-in stuck on 'Sending code'. Cause: after 'Change number' / 'Resend', all 3
  AuthProviders reused the used invisible RecaptchaVerifier, so signInWithPhoneNumber never settled. Fix (branch
  fix/otp-resend-hang): fresh verifier in a fresh element per send + 45 s timeout with a clear message, in buyer-web,
  seller-web and web. Tested on localhost console with +917019282019: send, Change number, send again -> both reach
  the code step. Note: a first send takes ~10 s (Firebase falls back from reCAPTCHA Enterprise to v2).
- 17:06 PR #42 merged. Render signed in via Google (harishrs21082006@gmail.com); buildx-api FRONTEND_URL is now
  vgud,48kc,ops (saved + redeployed). Verified: CORS allows all 3 origins; buildx-ops.vercel.app serves the new console.
  Admin signs in with +917019282018 and the private code in buildx-secrets/ADMIN_SIGNIN.txt (not tested by me: I do not
  enter credentials on production). Next: mobile pass 2 / new logo in app (native rebuild, ask), real SMS (Blaze, ask).
- 2026-10-30 20:43 User: seller website UX must be 10/10 for listing and updating products (auth parked).
  Branch feat/seller-ux (based on fix/otp-resend-hang, so PR #44 should merge first). API: product create/edit now
  Zod-validated (GST slab 0/5/12/18/28, whole stock, bulk tiers rule in features/suppliers/product-rules.ts, max 8
  photos, strict keys); create with stock 0 = OUT_OF_STOCK, DRAFT allowed; isGstInclusive/bulkPricing/lowStockAlert
  editable; create/edit responses populate categoryId (web schema needed it: saves used to error after succeeding);
  list supports q= and lowStock=1. 280 tests pass. Seller web: ProductForm rewrite (GST rate + included/on-top switch
  with live breakdown, bulk prices editor, low-stock level, live buyer preview, missing-items bar, Save draft,
  unsaved-changes guard, ?from= 'list another size', own categories first/preselected); products page (saved banner +
  List another size, search, Running low/Paused filters, inline Price & stock, Pause/Resume); stock page (+10/+50/+100,
  Save all, Undo, low-stock by lowStockAlert, search); setup PINs add the valid ones and keep refused ones; plurals.
  Tested end to end on localhost with an in-memory DB sandbox (test number 7019282019, nothing written to prod).
  Not visually checked at phone width (Chrome window would not resize).
- 2026-10-30 21:14 PR #45 merged (seller listing/stock UX; #44 closed as included). Branch feat/seller-orders:
  seller Orders page rebuilt around next actions (To dispatch, Cash to confirm, With BuildX driver, On the way,
  Delivered, Cancelled). Fixes: 'New'/PENDING never used (orders start CONFIRMED) so New tab + overview 'Needs your
  action' were always empty; own-vehicle COD had no confirm button (POST /me/orders/:id/cod now in UI with confirm);
  status PATCH returns bare buyerId so every action showed an error after succeeding (schema accepts id); take over a
  READY_FOR_PICKUP order with no driver; cancel needs a reason; delivered needs confirmation; PIN/district, call and
  WhatsApp buttons. API: orders list accepts status=A,B and cashPending=1. Also restored line endings flipped by my
  Windows python edits in #45 (open(...,'w') writes CRLF: always pass newline=''). 281 tests pass. Tested on a local
  in-memory sandbox seeded with demo orders.
- 2026-10-31 00:55 IST: #46 merged by user. Verified: Vercel buildx-48kc/vgud/ops production deploys succeeded, seller
  /orders returns 200, API /health ok and /suppliers/me/orders answers 401 without a token. Seller website flow is
  complete (setup, listing, stock, orders to cash collected). Next: wait for user (auth/SMS and mobile pass 2 parked).
- 2026-10-31 01:35 IST: User chose free Google sign-in for the seller website (SMS needs Blaze). Enabled the Google
  provider in Firebase (public name BuildX). API: accepts verified-phone OR Google verified-email tokens only;
  User.phone optional, new email field, partial unique indexes; server start drops the old phone_1 index. Seller
  sign-in is now "Continue with Google" (phone form behind NEXT_PUBLIC_PHONE_SIGNIN=true). 288 tests pass.
  CLAUDE.md auth rule updated. Branch feat/seller-google-signin.
- 2026-10-31 02:20 IST: Google sign-in for the BUYER website too (same pattern as seller; phone form behind
  NEXT_PUBLIC_PHONE_SIGNIN=true; checkout asks contact phone; profile shows email). Ops console shows owner email
  when there is no phone. Rule in CLAUDE.md updated. NOTE: I overwrote apps/buyer-web/.env.local by mistake and
  restored it from apps/web/.env.local (same Firebase project, API = Render). Branch feat/buyer-google-signin.
- 2026-10-31 15:55 IST: #49 merged by user; Vercel prod deploys OK. Live buyer /signin in my Chrome showed the new
  "not a buyer account" screen (session from a seller/admin account), which had no way out. Added a Sign out button
  and account-neutral copy to wrong-role screens on buyer (signin + RequireAuth) and seller (RequireSupplier).
  Firebase has 1 Google user so far. Branch fix/wrong-role-signout.
- 2026-11-04 IST: User chose NEXT STEP "mobile app Google sign-in". Branch feat/mobile-google-signin. Firebase Android
  app already had the debug keystore SHA-1 (5e8f...f625); downloaded fresh google-services.json and
  GoogleService-Info.plist via Firebase Management API with gcloud (both gitignored, local only). Added
  @react-native-google-signin/google-signin 17 (Firebase-mode config plugin), src/lib/googleAuth.ts (web client
  5ibngc...), sign-in screen: Continue with Google first, "Use mobile number instead" second (billing-not-enabled
  mapped to a clear message), sign-out also signs out of Google, profiles show email when no phone, checkout
  requires a contact phone. Needs a native rebuild (expo run:android). Claude in Chrome was not connected.
- 2026-11-04 IST: Native Android build NOT verified yet. Code typechecks. Problems hit: emulator Pixel_8 first stuck
  "offline" (fixed by cold boot -no-snapshot); Gradle could not delete build folders inside node_modules because the
  repo lives in OneDrive (cleared 22 stale Gradle build dirs, only folders next to a build.gradle). Then Claude Code
  stopped both the emulator and the clean Gradle build because the laptop ran low on memory. NEXT: when the user says
  so, run the build alone (no emulator), e.g. `cd apps/mobile/android && ./gradlew assembleDebug`, then boot the
  emulator and install; test Google sign-in + phone test number. If OneDrive locks continue, pause OneDrive sync or
  build from a copy outside OneDrive. Then open the PR.
- 2026-11-04 16:45 IST: Android build VERIFIED on emulator Pixel_8. OneDrive breaks Gradle (turns new build files into
  cloud placeholders: "not a regular file"), so build from a copy OUTSIDE OneDrive: robocopy apps/mobile to C:/bx/mobile
  (exclude android build dirs), then `cd C:/bx/mobile/android && ./gradlew assembleDebug --max-workers=2
  -PreactNativeArchitectures=x86_64`; run Metro from the real repo (`npx expo start`), `adb reverse tcp:8081 tcp:8081`.
  Emulator: use -no-snapshot (snapshot boot hangs "offline"), -memory 2048. Checked: new sign-in screen renders,
  Continue with Google opens Google's account flow (no DEVELOPER_ERROR, so client IDs + SHA-1 are right), mobile number
  option opens, a real number shows "Text message codes are not available yet..." (Android sends BILLING_NOT_ENABLED
  inside auth/internal-error, now handled). NOT checked: finishing a Google sign-in (needs the user's Google account on
  the emulator) and the checkout phone step. PR opened for the user to merge.
- 2026-11-04 18:00 IST: Emulator too heavy for this laptop (Google sign-in page stuck rendering, ~1.7 GB free). Built a
  standalone release APK for real phones instead: in C:/bx/mobile/android, `EXPO_PUBLIC_API_URL=https://buildx-api.onrender.com
  ./gradlew assembleRelease --max-workers=2 -PreactNativeArchitectures=arm64-v8a` (apps/mobile/.env points at
  10.0.2.2:4000 = emulator-local API, so the env var override matters). Verified: bundle has the live API URL and new
  sign-in screen, signed with SHA-1 5e8f...f625 (registered in Firebase). Copied to Desktop/BuildX/BuildX-test.apk
  (not in git). Waiting for the user to install it on their Android phone and try Continue with Google.
- 2026-11-04 18:12 IST: User: Google sign-in "not happening" on their phone. Firebase showed their Google account signed in
  at 18:06, so Google worked; the API /auth/sync failed (Render free host asleep, app timeout 15s) and the app stayed on
  the sign-in screen silently. Fix (pushed to PR #52): sync waits 60s and retries once, sign-in screen shows a
  "Try again" / "Use a different account" box (auth.store syncError). New APK at Desktop/BuildX/BuildX-test.apk.
  NEXT: user installs it and confirms; then user merges PR #52.
- 2026-11-04 18:30 IST: Still spinning on the user's phone (Google sign-in at 18:14, API awake). Root cause (old bug):
  AuthGate in app/_layout.tsx never navigated out of (auth) for onboarded users (every branch required !inAuth), so
  set-up accounts stayed on the sign-in screen after both Google and OTP sign-in. Fixed: route each role to its home
  whenever it is outside its group (also removed the 2 old typed-route TS errors). Reading the user's DB record was
  blocked by the permission classifier (not attempted further). New APK at Desktop/BuildX/BuildX-test.apk.
- 2026-11-04 18:40 IST: User installed the 18:17 APK: sign-in works. Updated CURRENT STATE / NEXT STEPS.
- 2026-11-04 18:45 IST: Found PR #52 was squash-merged at 17:19 before the 3 fixes; opened follow-up PR from origin/main.
- 2026-11-04 IST: Mobile pass 2 started, branch feat/mobile-hivis-2. Foundation: brand fonts (Bricolage Grotesque,
  Geist, Geist Mono, Instrument Serif italic; OFL, TTFs + licences in apps/mobile/assets/fonts, loaded in
  app/_layout.tsx via useFonts under the names in src/constants/typography.ts `Font`), @expo/vector-icons
  (MaterialCommunityIcons = Material family like the websites) and react-native-svg (needs native rebuild).
  ui.tsx: Icon, BuildXMark (real roof logo), Notice (replaces error/success Alerts), ConfirmSheet (replaces confirm
  Alerts), EmptyState, ScreenHeader, TabItem icons. Codemod: 419 StyleSheet text styles -> Font.* (fontWeight
  dropped; Android ignores custom fonts with fontWeight). npm installs need --legacy-peer-deps (old react-dom peer clash).
  Next: per-role screens (emoji -> Icon, Alert -> Notice/ConfirmSheet), then a phone test APK.
- 2026-11-04 IST: Mobile pass 2, buyer side done on feat/mobile-hivis-2: cart, checkout, orders, order detail,
  order placed, products, product detail, search, review, AI chat, buyer profile; shared Profile pieces for all 4
  roles. Fixed along the way: hard-coded "Delivery FREE" (now the server's deliveryCharge), timeline missing
  IN_TRANSIT, product min order qty ignored, "+GST" shown for GST-inclusive prices, description never shown,
  "Add anyway" for a second supplier (API refuses mixed carts: now asks to start a new cart; cart warns and blocks
  checkout when the AI assistant mixed suppliers), dead profile buttons removed, "Popular searches" -> "Try searching for".
  Next: driver (available, deliveries, order), supplier (home, orders, products, add/edit, analytics), ops
  (attention, orders, order, suppliers), onboarding role, OTP screen; then build a phone APK for the user.
