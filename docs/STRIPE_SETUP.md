# Stripe go-live checklist (Bar 4 Bar)

## Pricing model (Suno-calibrated ink economy)

| Tier | Price | Residency ink/mo |
|------|-------|------------------|
| Visitor (free) | $0 | 300 signup + 150/mo refresh |
| Pro Monthly | $7.77/mo | 1,100 |
| Pro Yearly | $4.44/mo ($53.28/yr) | 2,500 |

**Per-action Ink:** see `src/lib/costs.ts` (e.g. Next/Prev Line **10**, Rhyme Pulse **20**, draft **2/bar**, effects **10**). Do not advertise tracks/month in UI.

**Permanent ink packs** (one-time, never expire):

| Pack | Price | Ink |
|------|-------|-----|
| Session | $3.44 | 280 |
| Studio | $8.88 | 1,000 |
| Artist | $14.44 | 1,800 |
| Vault | $24.44 | 4,000 |

Yearly Pro: **50% off** ink packs at checkout (`STRIPE_COUPON_YEARLY_INK_50`).

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
# Copy the whsec_... from CLI output into .env as STRIPE_WEBHOOK_SECRET for local only
```

For Firestore fulfillment locally, add `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON string) to `.env`. After checkout, the app credits Ink on return via `/api/stripe/fulfill-session` (no `stripe listen` required for ink packs). For subscription renewals in production, still configure the live webhook.

---

## Go live (production)

Follow these steps in order. Production site: `https://lyricai-studio-otgxn.web.app`.

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

The script prints six `STRIPE_PRICE_*` IDs (and optional `STRIPE_COUPON_YEARLY_INK_50`). **Save them** — live price IDs differ from test IDs.

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

1. Stripe **Developers → Webhooks → Add endpoint**
2. **URL:** `https://lyricai-studio-otgxn.web.app/api/stripe/webhook`
3. **Events:**
   - `checkout.session.completed`
   - `invoice.paid`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Save and **Reveal** the signing secret → `STRIPE_WEBHOOK_SECRET=whsec_...`

Use the **Dashboard** signing secret in production — not the secret from `stripe listen` (CLI is local-only).

**Heartbeat check:** open `https://lyricai-studio-otgxn.web.app/api/stripe/webhook` in a browser. You should see JSON with `"hasSecret": true`. If `404`, redeploy. If `hasSecret: false`, the webhook secret is missing in Cloud.

### 5. Customer Portal (billing management)

Stripe **Settings → Billing → Customer portal** — enable so Pro users can update payment method or cancel. The app links to `/api/stripe/portal`.

### 6. Production environment variables

Set **all** of these on the deployed Firebase/Cloud function (and in `.firebase/lyricai-studio-otgxn/functions/.env` before deploy if you use that file):

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_APP_URL=https://lyricai-studio-otgxn.web.app

STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_INK_STARTER=price_...
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
4. User profile: `residencyBalance` = **1100** (monthly) or **2500** (yearly); ink packs add permanent balance.
5. Billing portal opens from account settings.

If ink does not update after payment, see `docs/STRIPE_MASTER_GUIDE.md` (signing secret mismatch is the most common cause).

---

## Environment variables (reference)

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Server API key (`sk_test_` or `sk_live_`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (`whsec_`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client key (`pk_test_` or `pk_live_`) |
| `NEXT_PUBLIC_APP_URL` | Production URL (checkout success/cancel redirects) |
| `STRIPE_PRICE_*` | Six price IDs (must match the mode of your secret key) |
| `STRIPE_COUPON_YEARLY_INK_50` | Optional coupon for Yearly Pro ink discount |

## npm scripts

| Command | Purpose |
|---------|---------|
| `npm run stripe:create-live-prices` | Create all six **live** prices |
| `npm run stripe:create-monthly-777` | Create test Pro Monthly $7.77/mo |
| `npm run stripe:create-yearly-444` | Create test Pro Yearly $53.28/yr |
| `npm run stripe:create-pricing-v2` | Create test catalog (legacy helper) |
| `npm run stripe:verify` | Validate price IDs against current `STRIPE_SECRET_KEY` |

## Source of truth

| Concern | File |
|---------|------|
| Stripe IDs + fulfillment ink | `src/lib/stripe-catalog.ts` |
| UI prices & copy | `src/lib/studio-tiers.ts` |
| Per-action Ink costs | `src/lib/costs.ts` |
| Free tier limits | `src/lib/subscription.ts` |
| Checkout / webhook | `src/app/api/stripe/` |
