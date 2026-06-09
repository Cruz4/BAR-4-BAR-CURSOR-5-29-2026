# Custom domain — bar4bar.ink

**Canonical site:** https://bar4bar.ink  
**Firebase project (unchanged):** `lyricai-studio-otgxn`  
**Legacy URL (still works if Hosting redirect is on):** https://bar4bar.ink

---

## What still works after DNS propagates

| System | Notes |
|--------|--------|
| Firebase Hosting | Custom domain serves the same Next.js app |
| Firestore / Auth | Same project; **add bar4bar.ink to Authorized domains** (see below) |
| Stripe checkout | Uses `NEXT_PUBLIC_APP_URL` for success/cancel redirects |
| Stripe webhooks | **Update endpoint URL** in Dashboard (see below) |
| Google sign-in | Requires authorized domain |
| PWA / Capacitor | Point users and `CAPACITOR_SERVER_URL` at `https://bar4bar.ink` |

Code defaults to `https://bar4bar.ink` via [`src/lib/app-url.ts`](../src/lib/app-url.ts). Redeploy after changing `.env`.

---

## Checklist (you do in consoles)

### 1. Firebase Hosting

- [ ] Custom domain `bar4bar.ink` shows **Connected** in Hosting → Domains
- [ ] Optional: `www.bar4bar.ink` → redirect to apex (recommended)
- [ ] Optional: redirect `lyricai-studio-otgxn.web.app` → `bar4bar.ink` in Hosting settings

### 2. Firebase Authentication → Authorized domains

[Firebase Console → Authentication → Settings → Authorized domains](https://console.firebase.google.com/project/lyricai-studio-otgxn/authentication/settings)

Add:

- `bar4bar.ink`
- `www.bar4bar.ink` (if you use www)

Without this, **Google/email login fails** on the custom domain.

### 3. Environment variables (then redeploy)

In **root `.env`** and **`.firebase/lyricai-studio-otgxn/functions/.env`**:

```
NEXT_PUBLIC_APP_URL=https://bar4bar.ink
TRUSTED_APP_ORIGINS=https://bar4bar.ink
```

Then:

```bash
npm run deploy:live
```

`TRUSTED_APP_ORIGINS` keeps the old Hosting URL valid for Stripe redirects until you fully switch links.

### 4. Stripe — Live webhook URL

[Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks) (Live mode)

- [ ] Edit live endpoint URL to: `https://bar4bar.ink/api/stripe/webhook`
- [ ] Or add a second endpoint and disable the old one after testing
- [ ] **Resend** a test event → expect **HTTP 200**
- [ ] Heartbeat: open `https://bar4bar.ink/api/stripe/webhook` in browser (JSON health check)

Signing secret (`whsec_`) stays the same if you only change the URL on the same endpoint.

### 5. Stripe Checkout (optional branding)

Checkout success/cancel URLs come from `NEXT_PUBLIC_APP_URL` after redeploy — no Stripe Dashboard change needed for redirects.

### 6. Marketing & bio links

Use this as your **TikTok Promote / bio URL** (landing first, then signup CTAs):

- `https://bar4bar.ink?ref=tiktok`

Visitors see the product landing page; **Create free account** goes to `/login?mode=signup&ref=tiktok`. Google sign-in uses redirect flow in TikTok’s in-app browser.

Also works for other channels: `?ref=ig`, `?ref=yt`, etc.

Admin **Metrics → Funnel by referral link** shows landing hits vs signups per ref.

See [MARKETING_QUICKSTART.md](./MARKETING_QUICKSTART.md).

### 7. Google Search Console (optional)

**What it is:** [Google Search Console](https://search.google.com/search-console) is Google’s free dashboard for your site in Search. It does not change rankings by itself, but it lets you confirm Google can crawl **bar4bar.ink**, see indexing errors, and request recrawls after deploys.

**Why bother:** After moving to a custom domain, Google may still know the old `.web.app` URL. Adding **bar4bar.ink** and submitting the sitemap helps Google discover `/login`, `/pricing`, and legal pages faster.

**Checklist:**

- [ ] Add property **URL prefix:** `https://bar4bar.ink`
- [ ] Verify ownership (HTML tag in env, DNS TXT, or Firebase/hosting file — pick one method in GSC)
- [ ] Submit sitemap: `https://bar4bar.ink/sitemap.xml`
- [ ] Inspect URL `https://bar4bar.ink/login` → Request indexing for the sign-in landing page
- [ ] (Optional) Add `https://www.bar4bar.ink` if you use www

More detail: [SEO.md](./SEO.md)

---

## Verify after deploy

1. `https://bar4bar.ink` loads the vault
2. Sign up with Google and email on **bar4bar.ink** (not only old URL)
3. Buy ink or Pro — return URL stays on **bar4bar.ink**
4. `/api/stripe/webhook` returns `ok: true`

---

## If something breaks

| Symptom | Fix |
|---------|-----|
| Auth works on `.web.app` but not `.ink` | Add domain to Firebase Authorized domains |
| Checkout redirects to old URL | Set `NEXT_PUBLIC_APP_URL=https://bar4bar.ink` and redeploy |
| Webhook 400 | Update Stripe endpoint URL; confirm `STRIPE_WEBHOOK_SECRET` in env |
| SSL pending | Wait for DNS + Firebase cert provisioning (up to 24h) |
