# Studio analytics (Firebase only)

BAR 4 BAR keeps analytics **inside Firebase and your app**. No third-party analytics dashboard is required.

## Two audiences

### Artists (in the app)

| What | Where |
|------|--------|
| XP, ranks, streaks, weekly goals | Vault sidebar, `/studio-progress`, Usage profile |
| Ink, subscription | Usage → Billing |

Data lives in Firestore (`users/{uid}/gamification/...`). Artists never see admin metrics.

### You (operator)

| What | Where |
|------|--------|
| Funnel, retention, revenue rollups | **Admin → Metrics** on your live site |
| Raw events (optional deep dive) | Firestore `analytics_events` (admin read in Firebase Console) |
| Real payments | **Stripe Dashboard** |

---

## How events are recorded

1. The signed-in app calls your own API: `POST /api/analytics/event`.
2. The server (Firebase Admin SDK) writes:
   - A row in `analytics_events`
   - Updates in `users/{uid}/analytics/summary` (first AI, checkout counts, session days, etc.)
3. Gamification may also update from the same activity.

Event names in code: `signup`, `session_start`, `page_view`, `track_editor_open`, `pricing_view`, `checkout_started`, `checkout_completed`, `upgrade_click`, `free_limit_hit`, `ai_action`, `achievement_unlocked`, `quest_step_complete`, `streak_milestone`, `share_card_generated`, `share_card_opened`, `leaderboard_view`.

Clients **cannot** write `analytics_events` directly (Firestore rules — server only).

---

## Admin metrics (cached rollups)

Heavy math (all users, summaries, transaction logs) is **not** run every time you open Admin.

| Firestore doc | Purpose |
|---------------|---------|
| `studioMetrics/snapshot` | Last full KPI scan (funnel, retention, monetization estimates) |
| `studioMetrics/marketing` | Ad spend + notes you enter in Admin |

### Daily use

1. Open your live site (e.g. `https://lyricai-studio-otgxn.web.app/admin`).
2. Sign in as **admin**.
3. Open the **Metrics** tab.
4. Click **Recompute** when you want fresh numbers (otherwise cached data loads quickly).

Cache TTL defaults to **6 hours**. Optional env on your Cloud Function:

- `METRICS_CACHE_TTL_HOURS=6`

### Optional: automatic refresh (Google Cloud)

If you want snapshots without clicking Recompute:

1. In **Google Cloud Console**, create a **Cloud Scheduler** job (e.g. every 6 hours).
2. Target URL: `https://lyricai-studio-otgxn.web.app/api/cron/refresh-metrics`
3. Add header: `Authorization: Bearer YOUR_CRON_SECRET`
4. Set `CRON_SECRET` on the same Cloud Function that runs the app (see `docs/STRIPE_SETUP.md` for where env vars go).

Manual test:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://lyricai-studio-otgxn.web.app/api/cron/refresh-metrics
```

---

## Deploy checklist

After pulling analytics changes:

```bash
npm run build
npm run firebase:deploy
npm run firebase:deploy:rules
```

Or one command: `npm run deploy:live`

(Do **not** type `firebase deploy` alone unless Firebase CLI is installed globally. This project uses `npx` via the npm scripts above.)

---

## Quick reference

| Question | Where to look |
|----------|----------------|
| Signups / activation / checkout funnel | Admin → Metrics |
| Did a user hit the free limit? | Admin → Metrics (free-tier section) or Firestore summaries |
| User XP / badges | In-app Studio Progress or Firestore gamification |
| MRR / refunds / disputes | Stripe Dashboard |
| Browse raw events | Firebase Console → Firestore → `analytics_events` |

---

## Live site env vars (Google Cloud Function)

Same place as Stripe keys (`docs/STRIPE_SETUP.md`):

| Variable | Required | Purpose |
|----------|----------|---------|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Yes (prod) | Server writes, metrics, ink |
| `CRON_SECRET` | No | Protects scheduled metrics refresh |
| `METRICS_CACHE_TTL_HOURS` | No | Snapshot cache length (default 6) |

No PostHog or other analytics SaaS keys are used.
