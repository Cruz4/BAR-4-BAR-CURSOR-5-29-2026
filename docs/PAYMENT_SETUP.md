
# Bar 4 Bar: Quick Payment Checklist

> **Use the full tracked checklist:** [PRE_LAUNCH_CHECKLIST.md](./PRE_LAUNCH_CHECKLIST.md)  
> **Post-launch marketing:** [MARKETING_QUICKSTART.md](./MARKETING_QUICKSTART.md)  
> Price IDs live in `src/lib/stripe-catalog.ts` (env `STRIPE_PRICE_*`), not `src/services/stripe.ts`.

Follow this checklist to get the Studio economy running.

## 1. Stripe Dashboard Setup
1. [ ] Create **Studio Pro** product (Monthly/Yearly).
2. [ ] Create 3 **Ink Packs** (1,000, 2,500, and 5,000 Ink).
3. [ ] Set all 5 **Price IDs** as `STRIPE_PRICE_*` environment variables. The server maps and validates them in `src/lib/stripe-catalog.ts`.

## 2. Webhook Setup
1. [ ] Create webhook pointing to: `https://bar4bar.ink/api/stripe/webhook`
2. [ ] Listen for: `checkout.session.completed`.
3. [ ] Copy the `whsec_...` **Signing Secret**.

## 3. Environment Variables (The "Where")
1. [ ] **In this Editor**: Open the `.env` file in the sidebar and paste your keys.
2. [ ] **In Firebase Console**: Go to your project, find your hosting backend (usually under **Functions** or **App Hosting** settings), and add the keys there so the live site can "see" them.

## 4. Rewards & Referral
- **Referral Bonus**: 200 Ink granted automatically to both artists when a new user joins via a unique link.
