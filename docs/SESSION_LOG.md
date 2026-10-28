# BuildX session log

Live memory for Claude sessions. Read this first. Newest entries at the bottom of the timeline.
Times are IST.

## CURRENT STATE (2026-10-28 17:05 IST)
- Redesign is LIVE on https://buildx-vgud.vercel.app (PR #25 squash-merged to main as 1b8fa24, Vercel buildx9/buildx-vgud).
- Local repo: Desktop/BuildX/buildx on branch main. Old local main saved as backup/local-main-old.
- Preview tooling: `node <scratchpad>/shot.mjs <url> <w> <h> <out.png> [full] [scrollY]` (CDP, real mobile widths).
  Recreate it if the scratchpad is gone (headless Chrome + Emulation.setDeviceMetricsOverride).

## NEXT STEPS
1. BLOCKER: add Firebase web config to Vercel project buildx-vgud (Settings > Environment Variables, Production):
   NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_APP_ID
   (Firebase console > Project settings > Your apps > Web app). Also add buildx-vgud.vercel.app to Firebase Auth
   authorized domains. Then redeploy. Until then live sign-in shows "Sign-in is not available yet".
   Claude in Chrome tools were NOT connected in the 2026-10-28 session; user must run `/chrome` (or start `claude --chrome`).
2. Optional env: NEXT_PUBLIC_SUPPORT_EMAIL, NEXT_PUBLIC_SUPPORT_PHONE, NEXT_PUBLIC_LEGAL_NAME, NEXT_PUBLIC_SELLER_PORTAL_URL
   (footer/legal/supplier CTA show them only when set). NEXT_PUBLIC_ALLOW_INDEXING=true at public launch.
3. DONE: user chose to keep PRD + images LOCAL in Desktop/BuildX/user-brief (not GitHub). Save new user files there.
   (Do not push them; repo is public.)
4. Restyle remaining buyer pages in depth (cart, checkout, orders, profile) beyond token remap.
5. Apply Hi-Vis to apps/seller-web, then apps/mobile (spec: docs/DESIGN_SYSTEM.md).
6. Add a strict CSP only together with an end-to-end OTP test.

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
