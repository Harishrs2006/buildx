# BuildX session log

Live memory for Claude sessions. Read this first. Newest entries at the bottom of the timeline.
Times are IST.

## CURRENT STATE
- Branch in progress: `feat/web-redesign` (from origin/main 7a464be).
- Working on: premium redesign of apps/buyer-web landing page + phone sign-in + onboarding,
  new design system documented in docs/DESIGN_SYSTEM.md (to be reused by apps/mobile).

## NEXT STEPS
1. Visual QA via headless Chrome screenshots (save to scratchpad, NOT %TEMP%): home, signin, mobile, legal, 404.
   Hero stack + mobile overflow fixes applied 16:20, need re-check. Port 3101 may be stuck: use another port.
2. Polish inner pages (cart, checkout, product, category, orders, profile): remove em dashes, add SiteFooter.
3. Write docs/DESIGN_SYSTEM.md (tokens/fonts/motion for web + mobile app).
4. Open PR feat/web-redesign -> main, merge (Vercel project buildx9/buildx-vgud auto-deploys main).
5. BLOCKER for user: production has NO Firebase web config (NEXT_PUBLIC_FIREBASE_* missing in Vercel env),
   so phone sign-in cannot work on the live site until those 4 vars are added in Vercel project settings.
3. Ask user: OK to commit docs/BuildX_PRD.pdf + docs/design-references/ (repo is PUBLIC, PRD says Confidential)?
4. Apply the same system to apps/seller-web, then apps/mobile.

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
- 16:20 Saved global prefs: decide technical things myself; questions need (Recommended) + chat option; commit+push after
  every sub-task because usage limits / shutdowns can cut a session; "continue" = read log and resume.
