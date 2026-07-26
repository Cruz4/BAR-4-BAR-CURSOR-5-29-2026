# Transactional email (Resend)

Bar 4 Bar sends branded lifecycle emails via [Resend](https://resend.com). Without `RESEND_API_KEY`, the app still works — emails are skipped and logged.

## What gets emailed

| Event | Trigger |
|--------|---------|
| Welcome | First verified welcome Ink grant (`/api/usage/init`) |
| Welcome back | Re-signup after self-delete (same email; no second welcome Ink) |
| Ink pack purchased | Stripe `checkout.session.completed` (ink) |
| Studio Pro activated | Stripe `checkout.session.completed` (subscription) |
| Monthly / yearly renewal charge | Stripe `invoice.paid` (`subscription_cycle`) |
| Membership canceled | Stripe `customer.subscription.deleted` / canceled update |
| Account deleted | Before wipe in `/api/account/eradicate` |

Firebase’s **verify email** link stays separate (Auth templates). Welcome is the branded “you’re in” message.

## What you need to do

### 1. Create a Resend account

1. Sign up at https://resend.com
2. Create an API key → copy it

### 2. Verify your domain (production)

1. Resend → **Domains** → add `bar4bar.ink`
2. Add the DNS records Resend shows (SPF / DKIM)
3. Wait until status is **Verified**
4. Prefer from-address like: `Bar 4 Bar <hello@bar4bar.ink>` or `noreply@bar4bar.ink`

Until the domain is verified, you can only send to **your own Resend signup email** using the default `onboarding@resend.dev` from-address (fine for local tests).

### 3. Add env vars

In **root `.env`** and **Firebase functions `.env`** (same place as Stripe keys):

```bash
RESEND_API_KEY=re_xxxxxxxx
# After domain verify:
RESEND_FROM_EMAIL=Bar 4 Bar <hello@bar4bar.ink>
```

Optional: leave `RESEND_FROM_EMAIL` unset to use Resend’s onboarding sender for testing only.

### 4. Redeploy

```bash
npm run deploy:live
```

(or your usual hosting/functions deploy after env is set on Cloud Run / Firebase)

### 5. Stripe Customer emails (optional but recommended)

In Stripe Dashboard → Settings → Customer emails, enable **Successful payments** / **Receipts** so users also get Stripe’s payment proof. Your branded mails cover product context (Ink added, Pro unlocked, etc.).

## Local test

1. Set `RESEND_API_KEY` in `.env.local`
2. Run `npm run dev`
3. Sign up with an email you can access (or Google)
4. Verify email if needed → welcome should arrive after usage init
5. Use Stripe test mode for ink / Pro / cancel events

Idempotency keys live in Firestore `studio_emails_sent` so webhook retries don’t double-send.

## Code map

- `src/lib/server/mail/mailer.ts` — Resend client
- `src/lib/server/mail/lifecycle-emails.ts` — templates + send helpers
- Hooks: `usage-init.ts`, `stripe/webhook/route.ts`, `eradicate-user.ts`
