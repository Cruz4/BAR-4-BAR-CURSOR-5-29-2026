# Bar 4 Bar — Commands Cheat Sheet

Quick reference for npm scripts and common commands.  
**Local dev URL:** http://localhost:9002  
**Live site:** https://bar4bar.ink

> **Node version:** This project expects **Node 22** (`package.json` → `engines.node`).

---

## First-time setup

```bash
npm install
```

Installs dependencies and runs `patch-package` automatically (`postinstall`).

**Environment files** (create locally, never commit secrets):

- `.env` / `.env.local` — Firebase, Stripe, AI keys, etc.

---

## Daily development (most used)

| Command | What it does |
|---------|----------------|
| `npm run dev` | Starts the Next.js dev server on **port 9002**. Use this every day while coding. |
| `npm run dev:turbo` | Same as `dev`, but uses **Turbopack** (faster refresh on some machines). |
| `npm run lint` | Runs ESLint on the project. |
| `npm run typecheck` | TypeScript check only — no build output. |

**Typical workflow:**

```bash
npm run dev
```

Then open http://localhost:9002 in your browser.

---

## Build & production preview

| Command | What it does |
|---------|----------------|
| `npm run build` | Production build (`.next` folder). Run before deploy or to catch build errors. |
| `npm run redeploy` | Deletes `.next` and runs a **clean** production build. |
| `npm run start` | Serves the **already built** app (run `npm run build` first). Default Next port is 3000 unless configured otherwise. |

---

## Marketing screenshots & GIFs

Requires **`npm run dev`** running on port 9002 in another terminal.

| Command | What it does |
|---------|----------------|
| `npm run marketing:capture` | Playwright captures **6 PNG screenshots** → `public/marketing/` (vault, DNA, workstation, etc.). |
| `npm run marketing:gifs` | Records **3 animated GIFs** → `public/marketing/` (DNA & REMIX, Co-Writer, Rhyme Pulse). |
| `npm run marketing:assets` | Runs **both** capture + gifs in one go. |

**Preview capture scenes in the browser:**

- http://localhost:9002/marketing/capture/hero-workstation
- http://localhost:9002/marketing/capture/gif-dna-remix
- (other scene names match filenames in `src/lib/marketing-capture-scenes.ts`)

**First time only** (if Playwright browsers missing):

```bash
npx playwright install chromium
```

---

## Deploy to Firebase (live)

| Command | What it does |
|---------|----------------|
| `npm run firebase:deploy` | Full Firebase deploy (hosting + functions). |
| `npm run firebase:deploy:rules` | Deploy **Firestore rules only** (fast, safe for rule tweaks). |
| `npm run deploy:live` | **Full live pipeline:** Stripe webhook checks → build → Firebase deploy → Firestore rules. Use when shipping to production. |

---

## Stripe (billing & webhooks)

| Command | What it does |
|---------|----------------|
| `npm run stripe:verify` | Verifies Stripe price IDs match what the app expects. |
| `npm run stripe:webhook-env` | Checks webhook-related env vars are set correctly. |
| `npm run stripe:webhook-sync-test` | Syncs/tests webhook signing secret for local or deploy. |
| `npm run stripe:create-pricing-v2` | Script to create pricing products in Stripe (admin/setup). |
| `npm run stripe:create-yearly-444` | Creates yearly Pro price ($444 tier setup). |
| `npm run stripe:create-monthly-777` | Creates monthly Pro price setup. |
| `npm run stripe:create-live-prices` | Creates live-mode Stripe prices. |
| `npm run stripe:create-live-webhook` | Creates live Stripe webhook endpoint. |
| `npm run stripe:create-ink-packs` | Creates Ink pack products/prices in Stripe. |
| `npm run stripe:create-test-yearly-ink-coupon` | Creates test coupon for yearly Ink promo. |

See also: [STRIPE_SETUP.md](./STRIPE_SETUP.md), [STRIPE_MASTER_GUIDE.md](./STRIPE_MASTER_GUIDE.md)

---

## Pre-launch & verification

| Command | What it does |
|---------|----------------|
| `npm run prelaunch:check` | Runs pre-launch sanity checks (env, config, etc.). |
| `npm run verify:bar-units` | Verifies rhyme **bar unit** logic in scripts/tests. |

---

## AI / Genkit (local AI flows)

| Command | What it does |
|---------|----------------|
| `npm run genkit:dev` | Starts Genkit dev UI for AI flows (`src/ai/dev.ts`). |
| `npm run genkit:watch` | Same, with **file watch** — reloads on changes. |

---

## Mobile (Capacitor — Android / iOS)

| Command | What it does |
|---------|----------------|
| `npm run cap:sync` | Syncs web build into native Android/iOS projects. |
| `npm run cap:android` | Opens the Android project in Android Studio. |
| `npm run cap:ios` | Opens the iOS project in Xcode (Mac only). |

See also: [MOBILE_STORE_GUIDE.md](./MOBILE_STORE_GUIDE.md)

---

## Git (common — not npm)

| Command | What it does |
|---------|----------------|
| `git status` | See changed / untracked files. |
| `git add <files>` | Stage changes for commit. |
| `git commit -m "message"` | Create a commit. |
| `git push origin main` | Push `main` to GitHub. |

---

## Quick “what do I run when?”

| I want to… | Run |
|------------|-----|
| Code locally | `npm run dev` |
| Check for TS errors | `npm run typecheck` |
| Ship to bar4bar.ink | `npm run deploy:live` |
| Update Firestore rules only | `npm run firebase:deploy:rules` |
| Refresh landing page images | `npm run marketing:assets` (with `dev` running) |
| Fix Stripe before deploy | `npm run stripe:verify` then `npm run stripe:webhook-env` |
| Open app on phone emulator | `npm run build` → `npm run cap:sync` → `npm run cap:android` or `cap:ios` |

---

## Related docs

- [MARKETING_QUICKSTART.md](./MARKETING_QUICKSTART.md) — TikTok / social links
- [PRE_LAUNCH_CHECKLIST.md](./PRE_LAUNCH_CHECKLIST.md) — Launch checklist
- [CUSTOM_DOMAIN.md](./CUSTOM_DOMAIN.md) — Domain setup
- [USAGE_GUIDE.md](./USAGE_GUIDE.md) — In-app usage for artists
