# App Store & Google Play roadmap

**Product:** Bar 4 Bar Studio  
**Bundle ID:** `studio.bar4bar.app` ([capacitor.config.ts](../capacitor.config.ts))  
**Hosted app:** https://bar4bar.ink  

**Marketing first:** Use PWA + web ads until signups convert reliably. See [MARKETING_QUICKSTART.md](./MARKETING_QUICKSTART.md).

**PWA install (Phase A):** [MOBILE_STORE_GUIDE.md](./MOBILE_STORE_GUIDE.md) Phase 1 — no store review.

---

## Phase A — Now (PWA, no stores)

- [ ] Show “Add to Home Screen” in TikTok/Reels (iOS Share → Add to Home Screen; Android Install app)
- [ ] Bio links use `?ref=tiktok` / `?ref=ig` for attribution
- [ ] Legal pages live: `/terms`, `/privacy`, `/cookies`

---

## Phase B — Google Play (Capacitor Android)

### Prerequisites

- [ ] [Google Play Console](https://play.google.com/console) account ($25 one-time)
- [ ] Android Studio installed
- [ ] Privacy policy URL: `https://bar4bar.ink/privacy`
- [ ] Terms URL: `https://bar4bar.ink/terms`
- [ ] Account deletion: users cancel/delete via **Usage → Settings** and support email in privacy policy

### Build

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios @capacitor/network @capacitor/splash-screen @capacitor/status-bar
set CAPACITOR_SERVER_URL=https://bar4bar.ink
npx cap sync
npx cap open android
```

- [ ] Generate signed **AAB** (Android Studio → Build → Generate Signed Bundle)
- [ ] `versionCode` / `versionName` bumped in `android/app/build.gradle`

### Play Console listing

- [ ] App name: **Bar 4 Bar Studio**
- [ ] Short + full description (use positioning from [90-DAY-WEB-REVENUE-PLAN.md](./90-DAY-WEB-REVENUE-PLAN.md))
- [ ] **5–8 screenshots** (phone frames from real device — reuse TikTok screen recordings)
- [ ] Feature graphic (1024×500)
- [ ] App icon (512×512) — match PWA icon
- [ ] **Content rating** questionnaire completed
- [ ] **Data safety** form: Firebase Auth, Firestore (lyrics), AI processing (Gemini), Stripe payments
- [ ] Target audience: not primarily children
- [ ] Contact email + website URL

### Billing on Play

- [ ] **Decision:** Web Stripe checkout vs Google Play Billing for digital subscriptions
- [ ] If keeping Stripe on web: comply with Play policies for external purchases (may require disclosure; review [Google payments policy](https://support.google.com/googleplay/android-developer/answer/10281818) before launch)
- [ ] Do not promise “subscribe in app” until IAP is implemented

### Submit

- [ ] Internal testing track → closed test → production
- [ ] Review typical 1–7 days

---

## Phase C — Apple App Store (Capacitor iOS)

### Prerequisites

- [ ] [Apple Developer Program](https://developer.apple.com) ($99/year)
- [ ] Mac with Xcode
- [ ] Same privacy/terms URLs as Android
- [ ] Account deletion path documented (Settings in app → Usage)

### Build

```bash
set CAPACITOR_SERVER_URL=https://bar4bar.ink
npx cap sync
npx cap open ios
```

- [ ] Xcode: Team, Bundle ID `studio.bar4bar.app`, signing certificate
- [ ] Archive → Upload to App Store Connect
- [ ] TestFlight internal test first

### App Store Connect

- [ ] App name, subtitle, keywords (lyric writer, rhyme book, songwriting, rap)
- [ ] **Privacy Nutrition Labels** — data linked to user (account, lyrics, usage)
- [ ] **AI disclosure** — generative AI for lyrics assistance; user-provided prompts
- [ ] Screenshots: 6.7" and 5.5" iPhone sizes (reuse marketing captures)
- [ ] Preview video (optional): 15–30s from TikTok ad clip
- [ ] Age rating questionnaire
- [ ] Export compliance / encryption (standard HTTPS → usually exempt)

### Billing on iOS

- [ ] Same decision as Play: external Stripe link vs In-App Purchase
- [ ] Apple **Guideline 3.1.1** — digital subscriptions inside iOS app generally require IAP unless qualified exception (e.g. reader app). **Get legal/product advice** before marketing “upgrade on website” inside the iOS shell.
- [ ] Capacitor WebView loads hosted app — behavior matches mobile Safari + PWA today

### Submit

- [ ] App Review can take 24–48h to 2 weeks
- [ ] Respond quickly to rejection notes (AI, account deletion, metadata)

---

## Phase D — Store marketing assets (reuse content)

| Asset | Source |
|-------|--------|
| 15–30s preview | Best TikTok Spark Ad clip |
| Screenshots | Phone screen record: Vault, Editor, Generate Next Line, Usage |
| Description bullets | Pro $7.77/mo, free 250 Ink demo, bar-by-bar workstation |

---

## Phase E — Post-launch store ops

- [ ] Monitor reviews; reply within 48h
- [ ] Crash-free sessions (Firebase Crashlytics optional)
- [ ] Keep `CAPACITOR_SERVER_URL` pointed at production after each deploy
- [ ] Firestore rules deployed: `npm run firebase:deploy:rules`

---

## Security before store launch

- [ ] Live Stripe keys only in server env (not committed)
- [ ] `GEMINI_API_KEY` server-side only
- [ ] Rotate any key if `.firebase/` was ever committed to a public repo

---

## Timeline suggestion

| When | Milestone |
|------|-----------|
| Month 1 | PWA + TikTok/Reels only ([MARKETING_QUICKSTART.md](./MARKETING_QUICKSTART.md)) |
| Month 2 | Repeatable web signups + 30+ Pro users |
| Month 3 | Play Internal Test build |
| Month 3–4 | TestFlight + Play closed test |
| Month 4+ | Production store listing if web funnel is healthy |

---

*Native projects: `android/`, `ios/`. Setup commands also in [MOBILE_STORE_GUIDE.md](./MOBILE_STORE_GUIDE.md).*
