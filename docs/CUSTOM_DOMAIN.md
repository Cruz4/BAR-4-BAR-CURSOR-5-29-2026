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

### 2b. Custom auth domain (Google popup shows `bar4bar.ink` instead of `firebaseapp.com`)

By default, Google sign-in runs through `lyricai-studio-otgxn.firebaseapp.com/__/auth/handler`. You can move that to **your domain** so users see `bar4bar.ink` during login.

**Prerequisites:** `bar4bar.ink` must already be **Connected** under Firebase Hosting → Domains (section 1).

#### Step A — Firebase Console

1. Open [Authentication → Settings → Authorized domains](https://console.firebase.google.com/project/lyricai-studio-otgxn/authentication/settings).
2. Confirm **`bar4bar.ink`** is in the list (add it if missing).
3. Open [Hosting → Domains](https://console.firebase.google.com/project/lyricai-studio-otgxn/hosting/sites) and confirm `bar4bar.ink` status is **Connected** with a valid SSL certificate.

Firebase serves the auth handler at `https://bar4bar.ink/__/auth/handler` once your app uses that domain as `authDomain` (Step C below). No separate “enable custom auth domain” toggle is required beyond Hosting + authorized domains.

#### Step B — Google Cloud OAuth client

1. Open [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials?project=lyricai-studio-otgxn).
2. Under **OAuth 2.0 Client IDs**, open the **Web client** used by Firebase (often named “Web client (auto created by Google Service)”).
3. **Authorized JavaScript origins** — add if missing:
   - `https://bar4bar.ink`
   - `https://www.bar4bar.ink` (only if you use www)
4. **Authorized redirect URIs** — add:
   - `https://bar4bar.ink/__/auth/handler`
   - Keep existing `https://lyricai-studio-otgxn.firebaseapp.com/__/auth/handler` until you’ve verified login on `.ink` (safe fallback).
5. Save.

#### Step C — App env + redeploy (when you choose to go live)

In **root `.env`** and **`.firebase/lyricai-studio-otgxn/functions/.env`**:

```
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=bar4bar.ink
```

The client config in [`src/lib/firebase/client/firebase.ts`](../src/lib/firebase/client/firebase.ts) reads this variable. In **production** the default is `bar4bar.ink`; in **local `next dev`** the default is `lyricai-studio-otgxn.firebaseapp.com` so Google signup can finish on localhost (using `bar4bar.ink` as authDomain from localhost leaves a blank `/__/auth/handler` page).

Then build and deploy when you’re ready:

```bash
npm run build
npx firebase deploy --only hosting,functions
```

#### Step D — Verify

1. Hard-refresh `https://bar4bar.ink/login` (or use an incognito window).
2. Click **Google Sign In** — you should get the **account chooser** (see account-picker note below).
3. During auth, the handler URL should show **`bar4bar.ink/__/auth/handler`**, not `firebaseapp.com`.
4. If you get `redirect_uri_mismatch`, double-check Step B redirect URIs exactly match (no trailing slash).

| Symptom | Fix |
|---------|-----|
| Popup still shows `firebaseapp.com` | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` not set or not redeployed |
| `redirect_uri_mismatch` | Add `https://bar4bar.ink/__/auth/handler` in Google Cloud OAuth client |
| Auth works on `.web.app` but not `.ink` | Add `bar4bar.ink` to Firebase Authorized domains |
| SSL / handler 404 | Wait for Hosting SSL; confirm domain is Connected |
| Blank `/__/auth/handler` after Google on **localhost** | Expected if authDomain is `bar4bar.ink` — local `next dev` uses `*.firebaseapp.com`; restart the dev server and use the Google **popup** (redirect is disabled on localhost) |

**Account picker:** The app sends `prompt=select_account` to Google so users always see “Choose an account” instead of auto-signing into the last Gmail session in the browser.

### 3. Environment variables (then redeploy)

In **root `.env`** and **`.firebase/lyricai-studio-otgxn/functions/.env`**:

```
NEXT_PUBLIC_APP_URL=https://bar4bar.ink
TRUSTED_APP_ORIGINS=https://bar4bar.ink
# Optional — after section 2b OAuth setup:
# NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=bar4bar.ink
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

Use this as your **TikTok Promote / bio URL** (signup form first):

- `https://bar4bar.ink/login?mode=signup&ref=tiktok`

Opens the **Sign Up** tab immediately with Google + email signup in front of them. Google sign-in uses redirect flow in TikTok’s in-app browser.

Also works for other channels — swap the ref:

- Instagram: `?ref=ig`
- YouTube: `?ref=yt`

Legacy `https://bar4bar.ink?ref=tiktok` still works and auto-redirects to the signup page.

Organic visitors without `?ref=` still see the full marketing landing at `/`.

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
