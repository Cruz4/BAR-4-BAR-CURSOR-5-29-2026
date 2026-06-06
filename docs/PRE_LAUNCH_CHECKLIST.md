# Bar 4 Bar — Pre-launch checklist

Check boxes as you go: `[ ]` → `[x]`.

**Site:** https://bar4bar.ink ([CUSTOM_DOMAIN.md](./CUSTOM_DOMAIN.md))  
**Quick test:** `npm run prelaunch:check` (keys + prices only — not a full launch approval)

More detail: [STRIPE_SETUP.md](./STRIPE_SETUP.md) · [SECURITY.md](./SECURITY.md)

---

## Start here (read this first)

1. **Automated check** — Run `npm run prelaunch:check`. If it passes, your test price IDs and webhook secrets in `.env` look wired up.
2. **Stripe webhooks** — Your endpoint must listen for **four events** (not just one). See table below.
3. **Order** — Finish **Part 1–4** in test mode → then **Part 5** when you switch to live Stripe and real ads.

### Which webhook events do I need?

| Event | What it does for your app |
|-------|---------------------------|
| `checkout.session.completed` | Someone paid — **ink packs** and **first month of Pro** |
| `invoice.paid` | Pro **renews** each month/year — refills residency Ink (1,777 or 3,444) |
| `customer.subscription.updated` | Status changes (e.g. past due, reactivated) |
| `customer.subscription.deleted` | User **canceled** Pro — app should stop treating them as Pro |

**Ink only?** `checkout.session.completed` is enough.  
**Pro subscriptions?** You need all four, or renewals and cancel won’t sync.

In Stripe: **Developers → Webhooks → b4b-b4b → Edit → add the three you’re missing** (same URL). Repeat on your **Live** webhook later.

---

## Part 1 — Stripe (test mode)

Stripe Dashboard toggle: **Test mode** on. Keys in `.env`: `sk_test_` / `pk_test_`.

### Webhook & secrets

- [ ] Webhook URL: `https://bar4bar.ink/api/stripe/webhook`
- [ ] All **four** events enabled (see table above)
- [ ] `STRIPE_WEBHOOK_SECRET_TEST` = Dashboard → Webhooks → **Reveal** (not from `stripe listen`)
- [ ] Resend an event or pay in test → Stripe shows **HTTP 200**, body `{ "received": true }`
- [ ] `npm run stripe:verify` — all six prices OK (ink packs: **777¢ / 1111¢ / 1944¢** — create new prices with `npm run stripe:create-live-prices` if amounts mismatch)

### Test a real flow on the live site

- [ ] Buy an **ink pack** in test — Stripe opens, Ink balance goes up
- [ ] Buy **Pro Monthly** in test — account shows Pro, residency Ink (~1,777)
- [ ] Billing portal opens (Usage / account settings)
- [ ] Optional: cancel test sub in portal — app stops showing Pro

### Deploy

- [ ] `.env` and `.firebase/lyricai-studio-otgxn/functions/.env` match
- [ ] `npm run deploy:live` after any env change

---

## Part 2 — Server & login (production site)

- [ ] Cloud function `ssrlyricaistudiootgxn` has env vars (Gemini key, Stripe, prices)
- [ ] Sign up / log in works on https://bar4bar.ink
- [ ] AI action works when signed in (Ink deducts)
- [ ] `npm run firebase:deploy:rules` if you changed Firestore rules lately

---

## Part 3 — App behavior (quick pass)

- [ ] Create album + track, lyrics save
- [ ] Free account: max **1 album**, **4 tracks**
- [ ] Usage page prices match reality: Pro **$7.77/mo**, Yearly **$4.44/mo** ($53.28/yr), packs **1k / 1.8k / 4k** Ink
- [ ] `STRIPE_COUPON_YEARLY_INK_50` set on production (Yearly Pro 50% off packs at Stripe checkout)

---

## Part 4 — Legal (before public ads)

- [ ] `/terms`, `/privacy`, `/cookies` are live and accurate
- [ ] You know how to help users who “paid but got no Ink” (check Stripe webhook 200, then support)

---

## Part 5 — Go live (real money & ads)

**Only after Parts 1–4 are checked.**

- [ ] Stripe Dashboard → **Live mode**
- [ ] `npm run stripe:create-live-prices` → paste new live `STRIPE_PRICE_*` into `.env`
- [ ] `sk_live_` / `pk_live_` in env
- [ ] **Live** webhook + **live** `STRIPE_WEBHOOK_SECRET` (different `whsec_` than test)
- [ ] Same **four** webhook events on the live endpoint
- [ ] Customer portal enabled (Live)
- [ ] `npm run deploy:live`
- [ ] One small **real** test purchase + webhook **200**
- [ ] Stripe payout / business verification done if you need payouts

---

## Part 6 — After you start ads (first week)

- [ ] Follow [MARKETING_QUICKSTART.md](./MARKETING_QUICKSTART.md) — Week 1–2 organic Shorts, Week 3–4 Spark Ads ($5–10/day)
- [ ] Bio links: `?ref=tiktok` / `?ref=ig` (attribution on signup)
- [ ] Glance at Stripe webhook failures daily (should be none)
- [ ] Weekly: Admin → **Growth Metrics** — signups, activation %, ad spend notes
- [ ] YouTube: repost winners + [YOUTUBE_TUTORIAL_SCRIPT.md](./YOUTUBE_TUTORIAL_SCRIPT.md)
- [ ] App stores later: [APP_STORE_ROADMAP.md](./APP_STORE_ROADMAP.md)

---

## Commands

| What | Command |
|------|---------|
| Keys + prices check | `npm run prelaunch:check` |
| Webhook secret prefixes | `npm run stripe:webhook-env` |
| Verify prices in Stripe | `npm run stripe:verify` |
| Create live prices | `npm run stripe:create-live-prices` |
| Deploy | `npm run deploy:live` |
| Webhook health in browser | https://bar4bar.ink/api/stripe/webhook |

---

## If something breaks

| Problem | Fix |
|---------|-----|
| Webhook 400 | Wrong signing secret → Dashboard Reveal → update `.env` → redeploy |
| No such price | Run `stripe:verify`; fix `STRIPE_PRICE_*` in `.env` |
| Paid, no Ink | Stripe webhook log; resend event; user return URL triggers backup fulfillment |
| Pro renews but no Ink refill | Add `invoice.paid` to webhook events |
| Canceled but still Pro in app | Add `customer.subscription.deleted` (and `.updated`) |

---

## Post-launch roadmap (not blocking go-live)

- **Freestyle / voice STT** — working (~80%+ accuracy). Future: mic picker, editable pad, overlapping chunks, optional dedicated STT API. See [FREESTYLE_STT_ROADMAP.md](./FREESTYLE_STT_ROADMAP.md).

---

*Pro Monthly = $7.77/mo + 1,777 residency Ink/mo · Pro Yearly = $53.28/yr + 3,444/mo · See `src/lib/stripe-catalog.ts`.*
