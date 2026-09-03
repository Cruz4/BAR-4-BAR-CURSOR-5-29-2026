# Stripe go-live checklist (AKAsheet)

**Full tracked pre-launch checklist (ads + live Stripe + QA):** [PRE_LAUNCH_CHECKLIST.md](./PRE_LAUNCH_CHECKLIST.md)  
**Automated checks:** `npm run prelaunch:check`

## Pricing model (Suno-calibrated ink economy)

| Tier | Price | Residency ink/mo |
|------|-------|------------------|
| Visitor (free) | $0 | 250 signup + 150/mo refresh (pool caps at 400) |
| Pro Monthly | $7.77/mo | 1,777 |
| Pro Yearly | $4.44/mo ($53.28/yr) | 3,444 |

**Per-action Ink:** see `src/lib/costs.ts` (e.g. Generate Next Line **15**, Rhyme Pulse **10**, draft **2/bar**, effects **10**). Do not advertise tracks/month in UI.

**Permanent ink packs** (one-time, never expire):

| Pack | Price | Ink | Yearly Pro (50% off) |
|------|-------|-----|----------------------|
| Studio | $7.77 | 1,000 | $3.89 |
| Artist | $17.77 | 2,500 | $8.89 |
| Vault | $34.44 | 5,000 | $17.22 |

Stripe prices are immutable — after changing amounts, run `npm run stripe:create-ink-packs` (test or live key in `.env`) or `npm run stripe:create-live-prices` for all six prices, then update `STRIPE_PRICE_INK_*` in `.env` and `functions/.env`. Move superseded Artist/Vault IDs to `STRIPE_PRICE_INK_ARTIST_LEGACY` / `STRIPE_PRICE_INK_VAULT_LEGACY` so old checkouts still fulfill.

Yearly Pro: **50% off** ink packs at checkout (`STRIPE_COUPON_YEARLY_INK_50` — percent coupon, works on any pack list price).

**Pro preview:** Stripe checkout does not create a billing trial. Eligible new Visitor accounts can receive a separate 48-hour Pro **feature preview**; it does not change their Ink balance or Visitor catalog limits.

**Test coupon:** `npm run stripe:create-test-yearly-ink-coupon` (requires `sk_test_...`), then add the printed line to `.env` and `functions/.env` before deploy.

---

**Custom domain:** [CUSTOM_DOMAIN.md](./CUSTOM_DOMAIN.md) (`https://akasheet.com`)

## Cloud Run runtime (SSR function)

Firebase Hosting builds a Cloud Function (`ssrlyricaistudiootgxn`) for Next.js. The project pins **Node.js 22** via `package.json` → `"engines": { "node": "22" }` and `firebase-tools` ≥ 15. After upgrading, redeploy with `npm run deploy:live`. In Google Cloud Console the runtime should show **Node.js 22**, not 20 (Node 20 is deprecated Oct 2026).

---

## Test mode (local / staging)

Use **test** keys (`sk_test_...`, `pk_test_...`) in `.env`.

Create or refresh **test** prices:

```bash
node scripts/stripe-create-pricing-v2.mjs   # subscriptions + ink packs (test)
node scripts/stripe-create-monthly-777.mjs  # Pro Monthly $7.77/mo (test)
node scripts/stripe-create-yearly-444.mjs   # Pro Yearly $53.28/yr (test)
npm run stripe:verify
```

Local webhook forwarding:

```bash
stripe listen --forward-to localhost:9002/api/stripe/webhook
# CLI whsec_ is for local listen only — do NOT deploy it to Firebase
```

### Sandbox webhook (Test mode on production URL)

If Stripe emails **400 signature** errors for your production domain (`akasheet.com` or legacy `.web.app`):

1. Stripe Dashboard → **Test mode** on → **Developers → Webhooks** → endpoint **`b4b-b4b`** (URL `.../api/stripe/webhook`).
2. **Reveal** signing secret → set in project root `.env`:
   ```
   STRIPE_WEBHOOK_SECRET_TEST=whsec_...
   ```
3. Keep `STRIPE_SECRET_KEY=sk_test_...` while testing sandbox checkouts.
4. Run `npm run stripe:webhook-env` — compare printed prefixes to Dashboard.
5. Deploy: `npm run deploy:live` (Firebase copies `.env` to Cloud Run).
6. Stripe → failed event → **Resend** → expect **HTTP 200**.

The server tries **test secret first**, then live (`STRIPE_WEBHOOK_SECRET`). Test and live Dashboard endpoints each have a **different** `whsec_`.

**Heartbeat:** `GET https://akasheet.com/api/stripe/webhook` returns `hasTestSecret`, `hasLiveSecret`, and `testPrefix` / `livePrefix` (first characters only) — match those to Dashboard **Reveal**.

For Firestore fulfillment locally, add `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON string) to `.env`. After checkout, the app credits Ink on return via `/api/stripe/fulfill-session` (no `stripe listen` required for ink packs). For subscription renewals in production, still configure the live webhook.

---

## Go live (production)

Follow these steps in order. Production site: `https://akasheet.com`.

### 1. Switch Stripe to Live mode

In the [Stripe Dashboard](https://dashboard.stripe.com), toggle **Test mode** off (top right). All keys and prices from here on must be **live**.

### 2. Create live prices (one command)

Set your live secret in `.env`:

```
STRIPE_SECRET_KEY=sk_live_...
```

Run:

```bash
npm run stripe:create-live-prices
# Optional: also create the 50% yearly ink coupon
npm run stripe:create-live-prices -- --with-coupon
```

The script prints five active `STRIPE_PRICE_*` IDs (and optional `STRIPE_COUPON_YEARLY_INK_50`). **Save them** — live price IDs differ from test IDs.

Verify against live Stripe:

```bash
npm run stripe:verify
```

### 3. Live API keys

From Stripe **Developers → API keys** (Live mode):

| Variable | Value |
|----------|-------|
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` |

Never commit live keys. Set them only in production secrets (below).

### 4. Live webhook

**Dashboard shows “no webhooks” in Live?** That is normal until you add one. Test-mode endpoints (e.g. `b4b-b4b`) only appear when **Test mode** is ON; they do not copy to Live. You must create a **separate** Live endpoint (new `whsec_`).

**Option A — Dashboard (recommended)**

1. Stripe **Developers → Webhooks → Add endpoint**
2. **URL:** `https://akasheet.com/api/stripe/webhook`
3. **Events:**
   - `checkout.session.completed`
   - `invoice.paid`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `account.updated` (First Drop artist payouts / Stripe Connect)
4. Save and **Reveal** the signing secret → `STRIPE_WEBHOOK_SECRET=whsec_...` (Live mode endpoint)

Use the **Dashboard** signing secret in production — not the secret from `stripe listen` (CLI is local-only). For sandbox traffic on the same URL, also set `STRIPE_WEBHOOK_SECRET_TEST` from the **Test mode** endpoint.

**Option B — CLI (after `sk_live_` is saved in `.env`)**

```bash
npm run stripe:create-live-webhook              # list live endpoints
npm run stripe:create-live-webhook -- --create  # creates endpoint + updates STRIPE_WEBHOOK_SECRET in .env
```

Then copy `STRIPE_WEBHOOK_SECRET` into `.firebase/lyricai-studio-otgxn/functions/.env` and deploy.

**Heartbeat check:** open `https://akasheet.com/api/stripe/webhook` — `ok: true` when at least one secret is set; compare `testPrefix` / `livePrefix` to Dashboard **Reveal**.

### 5. Customer Portal (billing management)

Stripe **Settings → Billing → Customer portal** — enable so Pro users can update payment method or cancel. The app links to `/api/stripe/portal`.

### 6. Production environment variables

Set **all** of these on the deployed Firebase/Cloud function (and in `.firebase/lyricai-studio-otgxn/functions/.env` before deploy if you use that file):

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_WEBHOOK_SECRET_TEST=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_APP_URL=https://akasheet.com

STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
# Optional legacy Session Pack (webhook fulfillment only): STRIPE_PRICE_INK_STARTER=price_...
STRIPE_PRICE_INK_REFILL=price_...
STRIPE_PRICE_INK_ARTIST=price_...
STRIPE_PRICE_INK_VAULT=price_...

# Optional — Yearly Pro 50% off permanent ink at checkout
STRIPE_COUPON_YEARLY_INK_50=...
```

Google Cloud: **Functions → `ssrlyricaistudiootgxn` → Edit → Runtime environment variables**. Redeploy after changes.

### 7. Deploy

```bash
npm run build
firebase deploy
```

### 8. Production smoke test

1. Pricing page shows Pro Yearly **$4.44/mo** ($53.28/yr billed).
2. Complete a **live** checkout with a real card (or Stripe’s live test card if your account allows it).
3. Stripe webhook log shows **200** for `checkout.session.completed`.
4. User profile: `residencyBalance` = **1777** (monthly) or **3444** (yearly); ink packs add permanent balance.
5. Billing portal opens from account settings.

If ink does not update after payment, see `docs/STRIPE_MASTER_GUIDE.md` (signing secret mismatch is the most common cause).

---

## Environment variables (reference)

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Server API key (`sk_test_` or `sk_live_`) |
| `STRIPE_WEBHOOK_SECRET` | Live webhook signing secret (`whsec_`) |
| `STRIPE_WEBHOOK_SECRET_TEST` | Sandbox / Test mode webhook signing secret (`whsec_`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client key (`pk_test_` or `pk_live_`) |
| `NEXT_PUBLIC_APP_URL` | Production URL (checkout success/cancel redirects) |
| `STRIPE_PRICE_*` | Five active price IDs (must match the mode of your secret key) |
| `STRIPE_COUPON_YEARLY_INK_50` | Optional coupon for Yearly Pro ink discount |

## npm scripts

| Command | Purpose |
|---------|---------|
| `npm run stripe:create-live-prices` | Create all six **live** prices |
| `npm run stripe:create-monthly-777` | Create test Pro Monthly $7.77/mo |
| `npm run stripe:create-yearly-444` | Create test Pro Yearly $53.28/yr |
| `npm run stripe:create-pricing-v2` | Create test catalog (legacy helper) |
| `npm run stripe:verify` | Validate price IDs against current `STRIPE_SECRET_KEY` |
| `npm run stripe:create-live-webhook` | List or create **live** webhook for production URL |

## Source of truth

| Concern | File |
|---------|------|
| Stripe IDs + fulfillment ink | `src/lib/stripe-catalog.ts` |
| UI prices & copy | `src/lib/studio-tiers.ts` |
| Per-action Ink costs | `src/lib/costs.ts` |
| Free tier limits | `src/lib/subscription.ts` |
| Checkout / webhook | `src/app/api/stripe/` |
