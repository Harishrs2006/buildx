# BuildX session log

Live memory for Claude sessions. Read this first. Newest entries at the bottom of the timeline.
Times are IST.

## CURRENT STATE
- Branch in progress: `feat/web-redesign` (from origin/main 7a464be).
- Working on: premium redesign of apps/buyer-web landing page + phone sign-in + onboarding,
  new design system documented in docs/DESIGN_SYSTEM.md (to be reused by apps/mobile).

## NEXT STEPS
1. Finish buyer-web redesign (tokens, fonts, logo, landing, signin, onboard, legal pages, SEO).
2. `npm run build` in apps/buyer-web, fix errors, push, open PR, merge to main (Vercel deploys main).
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
