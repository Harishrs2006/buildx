# Sthiva launch runbook

The order of work to go from today's pilot setup to a real public launch. Prices were checked on
4 Nov 2026 (USD, about Rs 88 to the dollar); confirm them on each provider's page before paying.

Rule: nothing below that costs money happens without the owner saying yes. Never paste a secret into
GitHub, chat or a screenshot. Secrets live only in the provider's dashboard and in
`C:/dev/BuildX/buildx-secrets` (outside the repo).

## 0. Already done (free)

- Test sign-in number +91 70192 82019 has a private code (in `buildx-secrets/TEST_SIGNIN.txt`); the
  old public code no longer works. The admin test number also has a private code (`ADMIN_SIGNIN.txt`).
- Storefront: page titles, full sitemap, typo-tolerant search, phone buy bar, account deletion.
- API: `DELETE /api/v1/users/me` (account deletion).
- Mobile: `apps/mobile/eas.json` build profiles (preview APK for testers, production AAB for Play).
- Google sign-in on both websites works without paying. Phone SMS needs step 2.

## 1. Before launch day (owner, free)

- [ ] Remove the demo supplier "BuildX Demo Supplier (placeholder, not a real business)" and its 10
      listings (ops console, or ask Claude to run it with your OK). Buyers must never see fake stock.
- [x] Name decided (2026-11-05): **Sthiva**. buildx.in/.com were taken and BuildX clashed with existing companies.
- [ ] Register "Sthiva Private Limited" (backup Setuzo or Udvora), file the STHIVA trademark (class 35), buy sthiva.com.
- [ ] Register the business and GST with a CA. Needed for Razorpay, a Play organisation account,
      Apple, DLT SMS and the invoices contractors ask for.
- [ ] Choose a support phone (with WhatsApp) and a support email.
- [ ] Sign the first real suppliers (cement, TMT, sand, blocks) and verify them in the ops console.

## 2. Paid switches (owner pays, then Claude does the settings)

| Step | Where | Cost | What Claude sets afterwards |
| --- | --- | --- | --- |
| Firebase Blaze (pay as you go) | Firebase console, project buildx-15494 | about $0.06 per SMS (third-party estimate; first 10 a day free per Google) | Turn phone sign-in back on: `NEXT_PUBLIC_PHONE_SIGNIN=true` on buyer and seller Vercel projects if wanted; set a budget alert |
| Render Starter | Render, service buildx-api | $7/month | Change plan in `render.yaml` to `starter`; health check stays `/health` |
| MongoDB Atlas Flex | Atlas, Cluster0 | $8 to $30/month | Upgrade from M0 (daily backups, 8 kept); then restrict Network Access to Render's outbound IPs (Render dashboard, Connect, Outbound) instead of 0.0.0.0/0 |
| Vercel Pro | Vercel team buildx9 | $20/month per member | Hobby is personal, non-commercial only; nothing to change in code |
| Domain (.in) | Any registrar | roughly Rs 600 to 1,000 a year | See step 3 |
| Google Play developer account | play.google.com/console | $25 once | See step 4 |

## 3. Domain switch (after buying, for example `example.in`)

Use `www.example.in` for the shop, `sell.example.in` for suppliers, `ops.example.in` for the console,
`api.example.in` for the API.

1. Vercel: add each domain to its project (buildx-vgud, buildx-48kc, buildx-ops); copy the DNS records
   Vercel shows into the registrar.
2. Render: add `api.example.in` as a custom domain on buildx-api; add its DNS record.
3. Vercel env (Production) on buyer site: `NEXT_PUBLIC_SITE_URL=https://www.example.in`,
   `NEXT_PUBLIC_API_URL=https://api.example.in`, `NEXT_PUBLIC_SELLER_PORTAL_URL=https://sell.example.in`,
   `NEXT_PUBLIC_SUPPORT_PHONE`, `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_LEGAL_NAME`. Same API URL on
   seller and ops projects.
4. Render env: `FRONTEND_URL=https://www.example.in,https://sell.example.in,https://ops.example.in`
   (keep the vercel.app ones until the switch is verified).
5. Firebase Auth, authorized domains: add the three web domains.
6. Mobile `eas.json`: change `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_WEB_URL`, then rebuild.
7. Only when real suppliers are live: `NEXT_PUBLIC_ALLOW_INDEXING=true` on the buyer site, redeploy,
   and submit `https://www.example.in/sitemap.xml` in Google Search Console.

## 4. Android app on Google Play

1. Play Console account ($25). A personal account must run a closed test with at least 12 testers
   for 14 days before going public; an organisation account (needs D-U-N-S) does not.
2. Firebase: add the Play app signing SHA-1 and SHA-256 (Play Console, App integrity) to the Android
   app in Firebase, or Google sign-in and phone sign-in fail in the store build.
3. `google-services.json` is gitignored, so EAS cloud builds cannot see it: upload it as an EAS file
   environment variable and point `android.googleServicesFile` at it (switch `app.json` to
   `app.config.js` after the mobile Google sign-in branch is merged).
4. Build: `npx eas-cli build -p android --profile preview` (APK for testers),
   `--profile production` (AAB for Play). Free EAS builds queue; a local Gradle build also works.
5. Store listing needs: app name, short and full description, icon 512 px, feature graphic
   1024 x 500, at least 2 phone screenshots, privacy policy URL (`/privacy`), account deletion URL
   (`/account-deletion`), Data safety form (see below), content rating, target audience 18+.
6. The app must also have Delete my account inside it (API ready; button still to add in the app).

Data safety answers (match what the app really does today):
- Collected: phone number or email (account), name, delivery address and location you type or
  choose (orders), order history, photos only for suppliers' product listings.
- Not collected: contacts, SMS content, payment card data, precise background location.
- Shared: delivery address and phone with the supplier and driver of that order only.
- Encrypted in transit: yes. Deletion: yes, in the app and at `/account-deletion`.

## 5. Apple App Store (after the pilot)

$99 a year. An organisation account needs a D-U-N-S number whose legal name matches exactly; allow
several weeks. Needs a Mac or EAS cloud builds, `GoogleService-Info.plist`, and the same deletion and
privacy items as Play.

## 6. Later, at volume

- SMS: move from Firebase to an Indian OTP provider (DLT registration with the company) to cut cost.
- Payments: Razorpay after company KYC (2% plus GST per payment); keep cash on delivery.
- Photos: Cloudinary free plan until it runs out; next plan is $99/month.
- GPS to PIN: add `GOOGLE_MAPS_API_KEY` on Render (10,000 free lookups a month), restricted to the
  Geocoding API only.
