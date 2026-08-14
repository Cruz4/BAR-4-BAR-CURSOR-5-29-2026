# Studio security notes

**Pre-launch tracked checklist:** [PRE_LAUNCH_CHECKLIST.md](./PRE_LAUNCH_CHECKLIST.md)

## Environment variables

| Variable | Purpose |
|----------|---------|
| `MASTER_ADMIN_EMAIL` | Server-side master admin email (optional override) |
| `NEXT_PUBLIC_MASTER_ADMIN_EMAIL` | Client UI admin detection (optional; keep in sync with rules) |
| `NEXT_PUBLIC_APP_URL` | Canonical app origin for Stripe redirects |
| `TRUSTED_APP_ORIGINS` | Comma-separated extra allowed origins for checkout/portal/referrals |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Required in production for ink billing, gamification, referrals |
| `CRON_SECRET` | Optional — Bearer token for `/api/cron/refresh-metrics` and `/api/cron/craft-reminders` (Google Cloud Scheduler) |
| `METRICS_CACHE_TTL_HOURS` | Optional — admin metrics snapshot TTL (default 6) |

When changing the master admin email, update `firestore.rules` `isAdmin()` email check to match, or rely on `role: admin` set via Admin API only.

## Deploy checklist

1. `npm run firebase:deploy:rules` after any rules change.
2. `npm run firebase:deploy` (or `npm run deploy:live`) so hosting/API routes update.
3. Confirm production has Admin SDK credentials (AI + ink must not run in dev-skip mode).

## Key controls

- User profile bootstrap: privileged fields blocked on Firestore **create** and **update**.
- Ink balance: client writes denied; server Admin SDK only.
- AI actions: Firebase ID token + server ink deduction.
- Stripe: webhook signature + trusted redirect origins.
- DNA Drop imports: `POST /api/shares/[shareId]/import` (authenticated).
