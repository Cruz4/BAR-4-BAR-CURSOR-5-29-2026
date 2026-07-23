# Free → Pro conversion tracking checklist

## What this is for

**MiroFish** (and other narrative simulations) tell you which *story* might win — objections, trust, positioning.  
**This checklist** tells you what *actually* wins in your app by tying **user actions** to **Stripe webhook outcomes**.

Use it to:

1. **Measure funnel drop-off** — signup → trial usage → pricing → checkout → paid Pro  
2. **Compare scenarios** — e.g. before/after trial length change, pricing page copy A/B, yearly-default UI  
3. **Debug “paid but not Pro”** — webhook 200? `checkout.session.completed`? Firestore `subscriptionStatus`?  
4. **Feed Admin metrics** — your app already aggregates several of these in `admin-metrics.ts`

You do **not** need new code to start — most events exist. This doc is the **weekly review ritual**.

Use **after** MiroFish runs — not uploaded to MiroFish. Seeds: `docs/mirofish/reality-seed.md`.

---

## Funnel stages (in order)

| Stage | What it means | Where it’s recorded |
|-------|----------------|---------------------|
| 1. Signup | New Firestore user + `trialStartedAt` set | `login/page.tsx` → `users/{uid}`; event `signup` |
| 2. Activation | First real AI use | `users/{uid}/analytics/summary` → `firstAiAt` |
| 3. Trial active | `isTrialActive()` true (3 days) | `users.trialStartedAt` + `trial.ts` |
| 4. Pro feature touch | Hit locked save, tier limit, upgrade CTA | `free_limit_hit`, `upgrade_click` events |
| 5. Pricing intent | Viewed `/pricing` or Usage upgrade tab | `pricing_view` on analytics summary |
| 6. Checkout started | Stripe Checkout session created | `checkout_started` (API + analytics) |
| 7. Paid | Stripe confirms payment | Webhook `checkout.session.completed` |
| 8. Pro active | App unlocks Pro | `users.subscriptionStatus === 'active'`; fulfillment in `stripe-fulfillment.ts` |
| 9. Retained | Still active 30d later | `invoice.paid` renewals; no `customer.subscription.deleted` |

---

## Client / analytics events (already in repo)

Defined in `src/lib/analytics-events.ts`:

| Event | When to fire / what it signals |
|-------|--------------------------------|
| `signup` | New account created |
| `session_start` | Return visit |
| `pricing_view` | Pricing or upgrade surface viewed |
| `upgrade_click` | CTA on pricing (`pricing/page.tsx`) |
| `checkout_started` | `src/app/api/stripe/checkout/route.ts` |
| `checkout_completed` | After webhook fulfillment (`stripe-fulfillment.ts`) |
| `free_limit_hit` | 4-track / album cap / tier-lock toast |

**Admin dashboard** (`admin-metrics.ts`) already computes:

- `pricingPageViews`, `checkoutStarts`, `checkoutCompletions`  
- `pricingToCheckoutRatePercent`, `checkoutToPaidRatePercent`  
- `activeProMonthly`, `activeProYearly`  
- `usersAtTrackLimit`, `usersAtAlbumLimit`, `usersLowInk`

---

## Stripe webhook events (production)

Configured endpoint: `src/app/api/stripe/webhook/route.ts`

| Stripe event | Action | Pro conversion relevance |
|--------------|--------|---------------------------|
| `checkout.session.completed` | `fulfillPaidCheckoutSession` — sets Pro or adds Ink pack | **Primary “became paying customer”** |
| `customer.subscription.updated` | Sync `subscriptionStatus` / tier | Active, trialing, canceled |
| `customer.subscription.deleted` | `deactivateSubscription` | Churn |
| `invoice.paid` | `refillProResidency` on renewal | Retention (not first conversion) |

**Health check:** `GET /api/stripe/webhook` — verify `hasLiveSecret`, `stripeKeyMode: live`.

---

## Weekly checklist (15 min)

### Stripe Dashboard

- [ ] **Webhooks** → endpoint → recent deliveries → **no failed** `checkout.session.completed`  
- [ ] **Payments** → filter last 7 days → subscription vs one-time Ink  
- [ ] **Customers** → spot-check new Pro → metadata `userId`, `subscriptionTier`  
- [ ] **Subscriptions** → monthly vs yearly mix  

### Firebase / Admin (in-app)

- [ ] Admin metrics: `checkoutStarts` vs `checkoutCompletions` (checkout completion rate)  
- [ ] `activeProMonthly` + `activeProYearly` trend week over week  
- [ ] `usersAtTrackLimit` — free users bumping cap (upgrade opportunity)  
- [ ] `freeLimitHitEvents` — tier-lock toasts fired  

### Firestore spot checks (support / debug)

For a user who says “I paid but I’m still Visitor”:

- [ ] `users/{uid}.subscriptionStatus` === `active`  
- [ ] `users/{uid}.subscriptionTier` === `monthly` or `yearly`  
- [ ] `users/{uid}/usage/balance` — residency refilled after Pro  
- [ ] `system/logs/entries` — `Pro Membership` transaction row  
- [ ] Stripe webhook log — HTTP **200** `{ received: true }` for their session  

### Funnel math (manual or spreadsheet)

```
Signup → Pro rate     = activePro / newSignups (same cohort week)
Pricing → Checkout    = checkoutStarts / pricingPageViews  (in admin metrics)
Checkout → Paid       = checkoutCompletions / checkoutStarts
Trial → Paid (7d)     = users who paid within 7d of signup AND had trialStartedAt
```

Segment cohorts:

- [ ] Invite-gate vs organic (if you tag `signupAttribution`)  
- [ ] Monthly vs yearly at checkout (`subscriptionTier` metadata)  
- [ ] Ink pack only vs subscription (checkout metadata `type`)  

---

## Cohort tags worth adding (optional future)

Not all are wired today — useful when A/B testing MiroFish winners:

| Tag | Why |
|-----|-----|
| `pricing_variant` | A vs B hero copy |
| `trial_days` | 3 vs 0 vs 7 |
| `referrer` | invite / organic / social |
| `first_limit_hit` | track vs album vs ink |

---

## When to trust MiroFish vs this checklist

| Question | Use MiroFish | Use this checklist |
|----------|--------------|-------------------|
| Which headline feels scammy? | ✅ | ❌ |
| Which scenario gets more Reddit backlash? | ✅ | ❌ |
| What is our free→Pro % this week? | ❌ | ✅ |
| Did Scenario B pricing beat A? | ❌ (until shipped) | ✅ after deploy |
| Is webhook broken? | ❌ | ✅ |

---

## Quick reference — live economy (May 2026)

- Free: 250 signup + 150/mo residency (cap 400), 1 album, 2 tracks  
- Pro feature preview: 2 days on eligible verified signups (features only)  
- Pro: $7.77/mo or $53.28/yr · 1,777 / 3,444 Ink/mo  

Source: `src/lib/subscription.ts`, `src/lib/trial.ts`, `src/lib/studio-tiers.ts`
