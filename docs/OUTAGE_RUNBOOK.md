# Bar 4 Bar — Outage & break-glass runbook

One-page guide for when **bar4bar.ink**, Firebase Hosting, or the admin UI is down but you still need control.

**Live site:** https://bar4bar.ink  
**Firebase fallback URL:** https://lyricai-studio-otgxn.web.app  
**Firebase project:** `lyricai-studio-otgxn`  
**Local dev admin:** http://localhost:9002/admin (with production `.env`)

Related: [COMMANDS.md](./COMMANDS.md) · [SECURITY.md](./SECURITY.md) · [CUSTOM_DOMAIN.md](./CUSTOM_DOMAIN.md) · [PRE_LAUNCH_CHECKLIST.md](./PRE_LAUNCH_CHECKLIST.md)

---

## 1. Break-glass kit (keep these backed up *before* an outage)

| Item | Where / why |
|------|-------------|
| Google account that owns Firebase project | [Firebase Console](https://console.firebase.google.com/project/lyricai-studio-otgxn) — 2FA + recovery codes |
| GitHub repo access | Redeploy any commit |
| Production `.env` (full copy) | Redeploy, local admin, scripts |
| `FIREBASE_SERVICE_ACCOUNT_KEY` or `firebase-service-account.json` | Admin SDK scripts when UI is down |
| Stripe Dashboard login | Payments, refunds, webhook replay |
| Domain registrar login | Fix DNS for `bar4bar.ink` |
| Master admin email | Default: `plotformaiplan@gmail.com` — must be able to sign in via Firebase Auth |
| `CRON_SECRET` | Manual cron trigger (metrics, craft reminders) |
| `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` | Alerts (only when server is running) |

Store secrets in a password manager — **never commit** `.env` or service account JSON.

---

## 2. What breaks vs what still works

| Layer | If it fails… | You lose… | You still have… |
|-------|--------------|-----------|-----------------|
| **Firebase Hosting / Next.js** | Site 500, blank page, bad deploy | `/admin` in browser, all `/api/*` routes | Firebase Console, local dev + `/admin`, redeploy / rollback |
| **Custom domain / DNS** | `bar4bar.ink` unreachable | Branded URL | `*.web.app` URL, Console, fix DNS at registrar |
| **Firestore / Auth** | DB or login down | Most app function | Stripe Dashboard (money only); wait for Google |
| **Stripe webhooks** | Site up but webhooks fail | Auto Ink / Pro sync | Stripe → resend events; manual user fixes in Console |
| **Full Firebase outage** | Console also down | Everything in-app | Stripe, GitHub, cached Telegram history on phone |

**Mental model:** User data lives in **Firestore + Auth**, not in the web app. The app is a control panel on top of that data.

---

## 3. First 5 minutes (any outage)

1. **Check if it’s just you** — try incognito, phone LTE, and https://lyricai-studio-otgxn.web.app  
2. **Check Firebase status** — [Google Cloud Status](https://status.cloud.google.com/)  
3. **Open Firebase Console** — Hosting → see last deploy; Firestore → spot-check a user doc  
4. **Check Stripe** (if “paid but no Pro/Ink”) — Developers → Webhooks → failed events  
5. **If bad deploy** — Hosting → **Release history** → Roll back to previous release  

---

## 4. Recovery paths (in order of speed)

### A. Roll back hosting (bad deploy, site loads but broken)

1. [Firebase Console → Hosting → Release history](https://console.firebase.google.com/project/lyricai-studio-otgxn/hosting)  
2. Select the last known-good release → **Rollback**  
3. Hard-refresh `bar4bar.ink` and test login + `/admin`

### B. Redeploy from your machine (rollback not enough)

```powershell
cd "G:\Bar 4 Bar App $\BAR 4 BAR FULL APP 5-28-2026 YOYO SAVE VER56"
git status
git log -5 --oneline
npm run deploy:live
```

- Full ship: `npm run deploy:live` (build + hosting + rules)  
- Hosting only: `npm run firebase:deploy`  
- Rules only: `npm run firebase:deploy:rules`  

See [COMMANDS.md](./COMMANDS.md) for all scripts.

### C. Run admin locally (site down, Firebase data OK)

```powershell
cd "G:\Bar 4 Bar App $\BAR 4 BAR FULL APP 5-28-2026 YOYO SAVE VER56"
npm run dev
```

1. Ensure `.env` / `.env.local` has production Firebase client keys + `FIREBASE_SERVICE_ACCOUNT_KEY`  
2. Open http://localhost:9002/admin  
3. Sign in with **master admin email** (Firebase Auth)  
4. Use the same tabs as production: roster, ink, config, etc.

Local dev talks to **real Firestore** when env vars point at production — treat it as live admin.

### D. Firebase Console (no code, no site)

Direct edits when you only need a quick fix:

| Task | Console path |
|------|----------------|
| Disable / inspect user | Authentication → Users |
| Edit profile, tier, role | Firestore → `users/{uid}` |
| Adjust Ink | Firestore → `users/{uid}/usage/balance` |
| Toggle feature flags | Firestore → `config/*` (see table below) |
| View ops history | Firestore → `system/logs/entries` |
| Storage files | Storage → browse buckets |

**Admin role:** set `role: "admin"` on `users/{uid}` (or sign in as master admin email — see `firestore.rules` `isAdmin()`).

### E. Admin SDK scripts (bulk / precise server-side work)

Pattern: `scripts/*.ts` with `FIREBASE_SERVICE_ACCOUNT_KEY` in `.env`.

```powershell
npx tsx scripts/backfill-achievement-ops-logs.ts
```

Existing scripts: `scripts/backfill-achievement-ops-logs.ts`, `scripts/inspect-achievement-ops-logs.ts`, `scripts/seed-agent-demo-account.mjs`, etc.

Copy an existing script for one-off fixes (grant ink, fix a user doc, backfill data).

### F. Call admin APIs with curl (site up, UI broken)

Admin routes require `Authorization: Bearer <Firebase ID token>`. Easiest token source: sign in locally, open browser devtools → Network → copy token from any `/api/admin/*` request.

Example:

```powershell
curl -H "Authorization: Bearer YOUR_ID_TOKEN" https://bar4bar.ink/api/admin/metrics
```

---

## 5. Admin UI → API → Firestore map

### `/admin` tabs

| Tab | Main actions | API routes |
|-----|--------------|------------|
| **Growth Metrics** | Funnel, marketing flags | `/api/admin/metrics`, `/api/admin/marketing` |
| **Artist Roster** | Tier, ink, role, preview, eradicate | `/api/admin/users/*`, `/api/admin/gamification/*` |
| **Studio Trophies** | Achievement backfill | `/api/admin/ops/backfill-achievements` |
| **Blacklist** | Banned emails / users | Firestore (admin UI) |
| **Ops Log** | Neural operation stream | `system/logs/entries` |
| **Config** | Feature toggles (below) | `/api/admin/*` per feature |

### Config tab → Firestore docs (Console fallback)

| Feature | Firestore doc | Admin API |
|---------|---------------|-----------|
| Invite gate | `config/inviteGate` | `/api/admin/invite-gate` |
| Finish-the-bar (Lock) | `config/lockFeature` | `/api/admin/lock-feature` |
| Folds | `config/foldsFeature` | `/api/admin/folds` |
| Collab Sheet | `config/collabSheetFeature` | `/api/admin/collab-sheet` |
| First Drops | `config/firstDrops` | `/api/admin/first-drops` |
| House Bar | `config/houseBar` | `/api/admin/house-bar` |
| Weekly Challenge | `config/weeklyChallenge` | `/api/admin/weekly-challenge` |
| Studio costs | `config/studio` | Admin Config UI |
| Marketing metrics cache | `studioMetrics/marketing` | `/api/admin/marketing` |

### All admin API routes (reference)

```
/api/admin/alerts
/api/admin/collab-sheet
/api/admin/first-drops
/api/admin/folds
/api/admin/gamification/moderate
/api/admin/gamification/reset
/api/admin/gamification/roster
/api/admin/house-bar
/api/admin/invite-gate
/api/admin/jordie/reseed-circle
/api/admin/lock-feature
/api/admin/marketing
/api/admin/metrics
/api/admin/metrics/refresh
/api/admin/neomaiya/repair
/api/admin/neomaiya/reseed-circle
/api/admin/ops/backfill-achievements
/api/admin/users/backfill-profiles
/api/admin/users/eradicate
/api/admin/users/ink
/api/admin/users/preview
/api/admin/users/role
/api/admin/weekly-challenge
```

Auth: Firebase ID token + master admin email **or** `users/{uid}.role === 'admin'` (`src/lib/server/admin-auth.ts`).

---

## 6. Scenario playbooks

### Site completely down (502 / timeout / DNS)

1. Try `https://lyricai-studio-otgxn.web.app`  
2. Firebase Console → Hosting → rollback or inspect deploy  
3. If DNS: fix A/CNAME at domain registrar ([CUSTOM_DOMAIN.md](./CUSTOM_DOMAIN.md))  
4. If deploy is fine but region is sick: wait for Google; use Console for urgent user fixes  
5. Redeploy when stable: `npm run deploy:live`

### Login works but `/admin` or API errors

1. Confirm signed-in email is master admin or has `role: admin`  
2. Run `npm run dev` → http://localhost:9002/admin  
3. Check Cloud Function logs: [Logs Explorer](https://console.cloud.google.com/logs/query?project=lyricai-studio-otgxn)  
4. Roll back hosting if a recent deploy broke API routes

### User paid — no Ink / Pro

1. [Stripe Dashboard](https://dashboard.stripe.com) → Payments → confirm charge  
2. Developers → Webhooks → `https://bar4bar.ink/api/stripe/webhook` → **Resend** failed event  
3. If webhook URL wrong: update to `https://bar4bar.ink/api/stripe/webhook`, redeploy env if needed  
4. Manual fix: Firestore `users/{uid}` (subscription fields) + `users/{uid}/usage/balance` (ink)  
5. Or local `/admin` → Artist Roster → Manual Calibration

### Need to ban / eradicate / grant admin while UI is down

| Action | Without UI |
|--------|------------|
| Grant admin | Firestore: `users/{uid}` → `role: "admin"` |
| Adjust ink | Firestore: `users/{uid}/usage/balance` or `/api/admin/users/ink` |
| Eradicate account | `/api/admin/users/eradicate` (POST) or Console Auth delete + Firestore cleanup |
| Close signup | `config/inviteGate` → `enabled: true` |

### Cron / metrics not updating

Cron routes need the **live site** + `CRON_SECRET`:

```powershell
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://bar4bar.ink/api/cron/refresh-metrics
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://bar4bar.ink/api/cron/craft-reminders
```

Or trigger metrics refresh from `/admin` → Growth Metrics when UI is up.

### Lost master admin email access

1. Use a **different** Google account that owns the Firebase project (Console access)  
2. Set `role: "admin"` on that user’s Firestore doc  
3. Update `MASTER_ADMIN_EMAIL`, `NEXT_PUBLIC_MASTER_ADMIN_EMAIL`, and `firestore.rules` master email together ([SECURITY.md](./SECURITY.md))

### Telegram alerts stopped

Alerts only send when the **server processes events** — they do not monitor uptime by themselves.

- Check `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` on the Cloud Function env  
- Add an external uptime monitor (UptimeRobot, Better Stack, etc.) pinging `https://bar4bar.ink`

---

## 7. External consoles (always bookmark these)

| Service | URL |
|---------|-----|
| Firebase (project home) | https://console.firebase.google.com/project/lyricai-studio-otgxn |
| Firebase Hosting | https://console.firebase.google.com/project/lyricai-studio-otgxn/hosting |
| Firestore | https://console.firebase.google.com/project/lyricai-studio-otgxn/firestore |
| Firebase Auth | https://console.firebase.google.com/project/lyricai-studio-otgxn/authentication/users |
| Cloud Logs | https://console.cloud.google.com/logs/query?project=lyricai-studio-otgxn |
| Stripe Dashboard | https://dashboard.stripe.com |
| GitHub repo | https://github.com/Cruz4/BAR-4-BAR-CURSOR-5-29-2026 |
| Google Cloud Status | https://status.cloud.google.com |

---

## 8. Prevention checklist (monthly, 10 min)

- [ ] Confirm break-glass kit items are saved and `.env` backup is current  
- [ ] Sign in to `/admin` on production — roster loads  
- [ ] Stripe webhook endpoint shows recent **200** responses  
- [ ] Know last good git commit (`git log -1`) before each `deploy:live`  
- [ ] Optional: uptime monitor on `https://bar4bar.ink` → Telegram/SMS  
- [ ] Optional: second admin account with `role: admin` in Firestore  

---

## 9. Quick “what do I run?”

| I need to… | Do this |
|------------|---------|
| Undo last deploy | Firebase Hosting → Rollback |
| Ship a fix | `npm run deploy:live` |
| Admin without live site | `npm run dev` → http://localhost:9002/admin |
| Fix one user in Firestore | Firebase Console → Firestore |
| Fix payment sync | Stripe → Resend webhook |
| Fix rules only | `npm run firebase:deploy:rules` |
| Check env before deploy | `npm run prelaunch:check` |

---

*Last updated: Aug 2026 — matches Firebase project `lyricai-studio-otgxn` and admin routes in `src/app/api/admin/`.*
