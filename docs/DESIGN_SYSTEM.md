# BuildX design system: "Hi-Vis"

One visual language for the buyer website, seller portal, admin and the Expo mobile app.
Reference implementation: `apps/buyer-web` (tailwind.config.ts, app/globals.css, components/).

## Idea
Construction sites run on high-visibility gear: near-black machinery, sand and cement, and one
fluorescent colour that means "look here". BuildX uses exactly that. Dark ink and warm sand carry
the page, and **signal lime appears only where the user should act**.

## Colour

| Token | Hex | Use |
|---|---|---|
| ink | `#0B0C0A` | Primary text, dark sections, primary buttons on light |
| ink-2 / ink-3 / ink-4 | `#141512` `#1D1F1A` `#2A2C26` | Raised surfaces on dark |
| sand | `#F2EFE7` | Page background (light) |
| sand-2 | `#FAF8F3` | Cards, inputs |
| sand-3 / sand-4 | `#E8E4D9` `#DCD7C9` | Muted fills, borders |
| lime | `#C8FF3D` | THE action colour: CTAs on dark, focus glow, active tab, badges |
| lime-deep | `#A6E01C` | Lime hover |
| cobalt | `#2457FF` | Links, info, focus outline on light, supplier section |
| stone | `#5E5B52` | Secondary text on sand (contrast 6.1:1) |
| error | `#C8282E` | Errors |
| success | `#1F7A3A` | Confirmations, in stock |

Rules
- Lime is never text on sand (fails contrast). Use lime as a fill with ink text, or as text on ink.
- One lime element per view region. If everything is lime, nothing is.
- Primary button on light = ink fill + sand text. On dark = lime fill + ink text.

## Type (all SIL Open Font License, free for apps)

| Role | Family | Web | Expo |
|---|---|---|---|
| Display / headlines | Bricolage Grotesque, 700-800, tracking -0.045em, line-height 0.92-0.98 | next/font/google | `@expo-google-fonts/bricolage-grotesque` |
| UI and body | Geist, 400-600 | next/font/google | `@expo-google-fonts/geist` |
| Labels, numbers, codes | Geist Mono, uppercase eyebrows at 11px, tracking 0.18em | next/font/google | `@expo-google-fonts/geist-mono` |
| Editorial accent | Instrument Serif italic, one word per headline max | next/font/google | `@expo-google-fonts/instrument-serif` |

Do not use Fontshare fonts (Switzer, Clash, Satoshi) in this repo: their licence forbids
distribution through a repository.

Scale: display clamp(3rem, 8.4vw, 7.25rem) hero, clamp(2.25rem, 4.6vw, 3.75rem) section, 22-24px card
titles, 15-17px body, 13px meta. Body never below 14px.

## Shape and space
- Radius: 12-16px cards on mobile, 24px large cards, full pills for buttons and chips, 12px inputs.
- Spacing on a 4px grid; sections 80px (mobile) / 112px (desktop) vertical.
- Touch targets at least 44x44 (buttons 52-56px tall on forms).
- Borders over shadows. Shadows only on hover/lift: `0 24px 60px -28px rgba(11,12,10,.45)`.
- Texture: 56px blueprint grid lines at 4-6% opacity and a light grain on dark heroes.

## Motion
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (out-expo) for everything that enters or lifts.
- Durations: 200ms colour/hover, 500ms lifts and fills, 900ms reveals.
- Patterns: headline lines rise from a mask (staggered 90ms); sections fade up 28px on first view;
  cards lift 4px and fill ink from the bottom on hover; hero blocks drop in then breathe; marquee 38s.
- Always honour reduced motion (web: `prefers-reduced-motion`; Expo: `AccessibilityInfo.isReduceMotionEnabled`
  or Reanimated `useReducedMotion`). Never hide content until JS runs.

## Icons
Material Symbols Outlined (weight 400, fill 1 only for the active state). Mobile: `@expo/vector-icons`
MaterialIcons or the same symbol set. Never emoji as icons.

## Components (web reference -> mobile equivalent)
- Header: transparent over dark hero, sand glass after scroll -> mobile app top bar on sand.
- Bottom tabs: floating ink pill, active tab lime fill (Home, Search, Cart, Orders, Account) -> identical in Expo.
- Phone sign-in: +91 prefix field, 6 separate OTP boxes with paste/SMS autofill and auto-submit, 30s resend,
  "Change number" link -> identical flow in Expo (use `textContentType="oneTimeCode"` / `autoComplete="sms-otp"`).
- Category tile: index number, icon chip, title, arrow appears on hover/press.
- Product card: image in inset rounded frame, name, "by Supplier", price / unit, round ink arrow button.

## Honesty rules (from the PRD)
No invented ratings, stock, delivery promises, supplier counts or statistics in any design.
Placeholder data in mockups must be labelled "Sample".
