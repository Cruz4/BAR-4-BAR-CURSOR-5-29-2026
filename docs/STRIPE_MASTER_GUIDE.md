
# Bar 4 Bar: Stripe Production Master Guide

This is your **Absolute Source of Truth** for getting paid. Follow these steps to automate your studio economy.

---

## ⚠️ Fulfillment Troubleshooting: Why is my Ink balance not moving?

If you pay for Ink but the balance doesn't increase, the "Handshake" between Stripe and your server is failing.

### Step 0: The "Heartbeat" Check
Open this link in your browser: `https://lyricai-studio-otgxn.web.app/api/stripe/webhook`
*   **If `ok: true`**: At least one signing secret is loaded. Compare `testPrefix` / `livePrefix` to Stripe Dashboard → Webhooks → **Reveal** (Test vs Live endpoints differ).
*   **If `ok: false`**: Add `STRIPE_WEBHOOK_SECRET_TEST` (sandbox) and/or `STRIPE_WEBHOOK_SECRET` (live) to `.env`, then `npm run deploy:live`.
*   **If it says "404 Not Found"**: Deploy latest: `npm run deploy:live`.

### Step 1: Verify the "Signing Secret" (Most Common Failure)
There are TWO types of secrets. Using the wrong one will cause a **400 Error**.
1.  **Dashboard Secret (CORRECT)**: Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks), click on your endpoint URL, and click **"Reveal"** under "Signing Secret". It starts with `whsec_`. **Use this for your Live Site.**
2.  **CLI Secret (WRONG)**: If you run `stripe listen` in a terminal, it gives you a local secret. **Do NOT use this in Google Cloud.** It will only work for local testing.

### Step 2: Check the Stripe Dashboard Logs
1.  Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks).
2.  Click on your webhook URL (`.../api/stripe/webhook`).
3.  Scroll down to **"Succeeded"** or **"Failed"** attempts.
4.  **Click on an event**. It will show you the **Response**:
    *   **400**: Verification failed. Your `STRIPE_WEBHOOK_SECRET` is wrong. Double-check Step 1.
    *   **404**: Stripe is hitting the wrong URL. Ensure the URL in Stripe is exactly `https://lyricai-studio-otgxn.web.app/api/stripe/webhook`.
    *   **500**: The server crashed. Check the Google Cloud Logs (Step 3).

### Step 3: View Live Server Logs
1.  Go to the [Google Cloud Logs Explorer](https://console.cloud.google.com/logs/query;query=textPayload:%22STRIPE%20WEBHOOK%22?project=lyricai-studio-otgxn).
2.  Look for `[STRIPE WEBHOOK] VERIFICATION FAILED`.
3.  The log will now show a **"Secret Hint"**. Compare those first 10 characters to the one in your Stripe Dashboard. If they don't match, you found the issue!

---

## 1. Create your Products in Stripe
You need to create 5 products total in your [Stripe Dashboard](https://dashboard.stripe.com).

### A. The "Studio Pro" Membership (Subscriptions)
1.  Go to **Product Catalog** > **Add Product**.
2.  **Name**: `Studio Pro`
3.  **Pricing**: 
    *   Set to **$7.77 USD** / Month.
    *   Click **"Add another price"**.
    *   Set to **$64.00 USD** / Year.
4.  **Save Product** and copy the **Price IDs** (starts with `price_...`).

### B. The "Ink Packs" (One-Time Purchases)
Create 3 separate products:
*   **Starter Pack**: 1,000 Ink for `$4.99`.
*   **Artist Bundle**: 3,500 Ink for `$14.99`.
*   **Studio Vault**: 10,000 Ink for `$39.99`.
*   **Copy all Price IDs**.

---

## 2. Connect the Code (Price IDs)

Open `src/services/stripe.ts` and paste your IDs:

```ts
const STRIPE_PRICES = {
  PRO_MONTHLY: 'price_YOUR_ID',
  PRO_YEARLY: 'price_YOUR_ID',
  INK_STARTER: 'price_YOUR_ID',
  INK_ARTIST: 'price_YOUR_ID',
  INK_VAULT: 'price_YOUR_ID',
};
```

---

## 3. The Webhook (The "Fulfillment Brain")

1.  **In Stripe**: Go to **Developers** > **Webhooks**.
2.  **Click "Add endpoint"**.
3.  **Endpoint URL**: `https://lyricai-studio-otgxn.web.app/api/stripe/webhook`
4.  **Select Events**: Choose `checkout.session.completed`.
5.  **Click "Add events"** then **"Add endpoint"**.
6.  **Get your Secret**: Click "Reveal" on the **Signing secret**. It starts with `whsec_`.

---

## 4. Add Secrets to Production (Google Cloud)

**YOU MUST DO THIS FOR THE LIVE SITE TO WORK.**

1.  Go to [Google Cloud Functions](https://console.cloud.google.com/functions/list).
2.  Click on the function named **`ssrlyricaistudiootgxn`**.
3.  Click **EDIT** at the top.
4.  Expand **"Runtime, build, connections and security settings"**.
5.  Under **"Runtime environment variables"**, add these 3:
    *   `STRIPE_SECRET_KEY`: (Your `sk_test_...` or `sk_live_...`)
    *   `STRIPE_WEBHOOK_SECRET`: (The `whsec_...` from the Webhook page in the Dashboard)
    *   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: (Your `pk_test_...` or `pk_live_...`)
6.  Click **NEXT** then **DEPLOY**. (This takes 2 minutes).
