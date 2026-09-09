# AKAsheet — manual cutover checklist

The **app code** already uses these names. This file is everything **you still have to change by hand** in dashboards, DNS, email, ads, and bios. Until you finish a row, that surface can still say Bar 4 Bar / bar4bar.ink.

**Status (code + deploy):** `akasheet.com` is live. Root `.env`, `.firebase/lyricai-studio-otgxn/functions/.env`, Firebase auth domain, SEO canonicals, service worker, and `public/googleee78a6a31a51e0e8.html` (Search Console) are updated. **Redeploy** after any further `.env` change: `npm run deploy:live`.

| Use this | Value |
|----------|--------|
| App name | **AKAsheet** |
| Domain | **akasheet.com** (also add **www.akasheet.com**) |
| Site | https://akasheet.com |
| Support inbox | **akasheet.support@gmail.com** |
| Transactional from | **AKAsheet &lt;noreply@akasheet.com&gt;** |
| Hashtag | **#akasheet** |
| Slogan | AKAsheet: Put Your World Within Reach |
| Firebase project (do **not** rename) | `lyricai-studio-otgxn` |

Deep domain/auth steps: [CUSTOM_DOMAIN.md](./CUSTOM_DOMAIN.md)  
Email DNS: [TRANSACTIONAL_EMAIL.md](./TRANSACTIONAL_EMAIL.md)

---

## 1. Domain + DNS

- [x] Buy **akasheet.com** (and keep **bar4bar.ink** for redirects).
- [x] Add **akasheet.com** in [Firebase Hosting → Domains](https://console.firebase.google.com/project/lyricai-studio-otgxn/hosting/sites).
- [ ] Add **www.akasheet.com** → redirect to apex `akasheet.com`.
- [x] Put the DNS records Firebase shows (A / AAAA / TXT / CNAME) at your registrar.
- [x] Wait until status is **Connected** with a valid SSL cert (can take hours).
- [ ] Optional: redirect `lyricai-studio-otgxn.web.app` → `https://akasheet.com`.

---

## 2. Keep old links alive

- [ ] In Firebase Hosting, redirect **bar4bar.ink** → **akasheet.com** (same paths: `/jordie_cruz`, `/share/…`, `/p/…`).
- [ ] Redirect **www.bar4bar.ink** the same way.
- [ ] Keep `bar4bar.ink` in DNS until you are sure nobody still shares the old URL.

The app still **recognizes** old `bar4bar.ink` paste-links on purpose. Redirects are what make those URLs actually open AKAsheet.

---

## 3. Firebase Authentication

[Authorized domains](https://console.firebase.google.com/project/lyricai-studio-otgxn/authentication/settings)

- [ ] Add `akasheet.com`
- [ ] Add `www.akasheet.com`
- [ ] Leave `lyricai-studio-otgxn.firebaseapp.com` and `localhost` (needed for Google login).

**Email templates** (Authentication → Templates) — these are **not** in the repo:

- [ ] Action URL / continue URL → `https://akasheet.com`
- [ ] Sender name → **AKAsheet**
- [ ] From address (if custom) → `noreply@akasheet.com`
- [ ] Rewrite copy: verification, password reset, email change, SMS (if used). Search each template for “Bar 4 Bar” / “bar4bar.ink”.

Without authorized domains, **Google / email login fails** on akasheet.com.

---

## 4. Google Cloud OAuth (Google Sign-In)

[Credentials](https://console.cloud.google.com/apis/credentials?project=lyricai-studio-otgxn)

Open the **Web client** Firebase created.

**Authorized JavaScript origins**

- [ ] `https://akasheet.com`
- [ ] `https://www.akasheet.com`

**Authorized redirect URIs**

- [ ] `https://akasheet.com/__/auth/handler`
- [ ] `https://www.akasheet.com/__/auth/handler` (if you use www)
- [ ] Keep `https://lyricai-studio-otgxn.firebaseapp.com/__/auth/handler` as fallback

**OAuth consent screen**

- [ ] App name → **AKAsheet**
- [ ] App logo → current `public/Logo.png`
- [ ] App home / privacy / terms → `https://akasheet.com`, `/privacy`, `/terms`
- [ ] Support email → **akasheet.support@gmail.com**
- [ ] Authorized domains include `akasheet.com`

Until redirect URIs are saved, Google login on the new domain shows `redirect_uri_mismatch`.

---

## 5. Deployed environment variables

Set in **root `.env`** (Firebase copies this to Cloud Run) **and** `.firebase/lyricai-studio-otgxn/functions/.env` if you keep a functions copy. Then **redeploy**.

```
NEXT_PUBLIC_APP_URL=https://akasheet.com
TRUSTED_APP_ORIGINS=https://akasheet.com,https://www.akasheet.com,https://bar4bar.ink
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=akasheet.com
RESEND_FROM_EMAIL=AKAsheet <noreply@akasheet.com>
CAPACITOR_SERVER_URL=https://akasheet.com
```

- [x] Root `.env` (do not commit secrets)
- [x] Functions `.env` if used
- [x] Redeploy: `npm run deploy:live` (or your usual hosting + functions deploy)
- [x] Confirm live HTML / emails / Stripe returns use **akasheet.com**, not bar4bar.ink

Re-run deploy after any `.env` edit — Cloud Run does not pick up local changes until then.

---

## 6. Gmail + support

- [ ] Create **akasheet.support@gmail.com**
- [ ] Turn on 2FA
- [ ] Use it as the inbox you actually read (noreply@ cannot receive mail)
- [ ] Optional: Gmail “Send mail as” / Google Workspace later for `support@akasheet.com` once the domain’s MX/SPF exist

Code already lists `akasheet.support@gmail.com`. If the mailbox does not exist, users bounce.

---

## 7. Resend (lifecycle email)

[Resend → Domains](https://resend.com/domains)

- [ ] Add **akasheet.com**
- [ ] Add SPF / DKIM / (and DMARC if Resend asks) at your DNS
- [ ] Wait until **Verified**
- [ ] Send from `AKAsheet <noreply@akasheet.com>` or `AKAsheet <akasheet.support@gmail.com>`
- [ ] Put `RESEND_API_KEY` + `RESEND_FROM_EMAIL` in deployed env (section 5)
- [ ] Send a test welcome / verification after deploy

Until the domain is verified, production mail fails or still goes out as Resend’s onboarding address.

---

## 8. Stripe Dashboard

[Webhooks](https://dashboard.stripe.com/webhooks) — **Live** and **Test**

- [ ] Live endpoint URL → `https://akasheet.com/api/stripe/webhook`
- [ ] Test endpoint URL → `https://akasheet.com/api/stripe/webhook` (or keep test on a tunnel; just don’t leave bar4bar.ink)
- [ ] Send a test event → HTTP 200
- [ ] Browser check: `https://akasheet.com/api/stripe/webhook` (health JSON)

**Branding** (Settings → Branding / Public info)

- [ ] Public business name → **AKAsheet**
- [ ] Icon / logo → current logo
- [ ] Brand color if you want the pink / navy
- [ ] Privacy / terms URLs → `https://akasheet.com/privacy` and `/terms`
- [ ] Support email / URL → **akasheet.support@gmail.com** / https://akasheet.com

**What the bank statement says**

- [ ] Statement descriptor / shortened descriptor (card charges can still say **BAR 4 BAR** until you change this)
- [ ] Customer portal header
- [ ] Receipts / invoices (“Powered by” / business name)
- [ ] Stripe Connect platform name (if you use Connect for DNA Drops payouts)
- [ ] Product names that still say Bar 4 Bar (Pro, Ink packs)

Checkout success/cancel URLs come from `NEXT_PUBLIC_APP_URL` after redeploy — no extra Stripe URL fields unless you hardcoded one in the Dashboard.

---

## 9. Google Search + ads

**Search Console** — [search.google.com/search-console](https://search.google.com/search-console)

- [x] Add URL-prefix property `https://akasheet.com`
- [x] Verify (DNS TXT or HTML — file: `public/googleee78a6a31a51e0e8.html`)
- [ ] Submit sitemap: `https://akasheet.com/sitemap.xml` (Search Console → **Sitemaps** → paste URL → Submit)
- [ ] Request indexing for `/`, `/login`, `/pricing` (see **Request indexing** below)
- [ ] Keep `https://bar4bar.ink` as a property until redirects are in place; use Change of Address if Google offers it

### Request indexing (`/`, `/login`, `/pricing`)

In [Search Console](https://search.google.com/search-console) → select property **`https://akasheet.com`**:

1. Open **URL inspection** (top search bar).
2. Enter the full URL, e.g. `https://akasheet.com/` (repeat for `/login` and `/pricing`).
3. Wait for “URL is on Google” or “URL is not on Google” — then click **Request indexing**.
4. Google queues a crawl (not instant; can take days). Submit all three URLs separately.

**Sitemap (do once):** left menu **Sitemaps** → add `https://akasheet.com/sitemap.xml` → **Submit**. That helps Google discover pages; URL inspection is still worth doing for home, login, and pricing.

**AdSense** (client in the app: `ca-pub-1403404509068347`)

- [ ] Add **akasheet.com** as a site
- [ ] Complete ads.txt / site verification for the new host
- [ ] Leave the old domain until traffic has moved

---

## 10. TikTok / ads / pixels

- [ ] TikTok Events Manager — allowed domain **akasheet.com**
- [ ] Pixel / Events API URLs if they were pinned to bar4bar.ink
- [ ] Promote / Spark / bio link, for example:  
  `https://akasheet.com/login?mode=signup&ref=tiktok`
- [ ] Ad account, page name, and creative that still say Bar 4 Bar
- [ ] Any other pixels (Meta, Google Ads) — domain + conversion URLs

---

## 11. Social, bios, and public listings

Update **name, logo, URL** everywhere people already follow you:

- [ ] TikTok
- [ ] Instagram
- [ ] YouTube
- [ ] X / Twitter (then you can set `SEO.twitterHandle` in code later)
- [ ] Discord server name, invite, and [DISCORD_SERVER_SETUP.md](./DISCORD_SERVER_SETUP.md) copy
- [ ] Reddit / subreddit / sidebar
- [ ] Linktree / Beacons / similar
- [ ] LinkedIn
- [ ] Facebook page
- [ ] Threads
- [ ] Any “link in bio” on personal accounts
- [ ] Press kits, one-pagers, Canva decks
- [ ] Email signatures

---

## 12. Buy Me a Coffee

Code still points at **https://buymeacoffee.com/b4bdev**.

- [ ] Either rename/rebrand that page to AKAsheet  
- [ ] Or create a new page (e.g. `buymeacoffee.com/akasheet`) and tell me to swap `BUY_ME_COFFEE_URL` in `src/lib/support.ts`

---

## 13. GitHub

Remote is still **https://github.com/Cruz4/BAR-4-BAR-CURSOR-5-29-2026**

- [ ] Repo display name / description → AKAsheet + https://akasheet.com
- [ ] Optional: rename the repo (GitHub keeps redirects from the old URL)
- [ ] README / About website field
- [ ] GitHub Pages or org profile if you have one

---

## 14. App stores / Capacitor (when you ship native)

Display name in `capacitor.config.ts` is already **AKAsheet**.

- [ ] **Do not change** `appId` `studio.bar4bar.app` unless you want a **brand-new** App Store / Play listing
- [ ] Apple Developer: app name, screenshots, subtitle, support URL, privacy URL
- [ ] App Store Connect: SKU can stay; user-visible name → AKAsheet
- [ ] Google Play Console: app name, store listing, feature graphic
- [ ] `CAPACITOR_SERVER_URL=https://akasheet.com` when you build

See [MOBILE_STORE_GUIDE.md](./MOBILE_STORE_GUIDE.md) and [APP_STORE_ROADMAP.md](./APP_STORE_ROADMAP.md).

---

## 15. Demo / test accounts (optional)

- [ ] `.env.local` demo user may still be `agent.demo@bar4bar.ink` — that is a **real Firebase Auth user**. Don’t rename the email unless you create a new demo and re-seed.
- [ ] Optional later: new demo `agent.demo@akasheet.com` via `npm run seed:agent-demo` after you own the domain for that mailbox.

---

## 16. After the domain is live — smoke test

- [ ] https://akasheet.com loads
- [ ] https://www.akasheet.com redirects to apex
- [ ] https://bar4bar.ink/… redirects and keeps the path
- [ ] Google sign-in on akasheet.com (incognito)
- [ ] Email sign-up; verification mail is from AKAsheet / noreply@akasheet.com
- [ ] Stripe test purchase returns to akasheet.com
- [ ] Webhook test = 200
- [ ] Support mailto opens **akasheet.support@gmail.com**
- [ ] PWA / Add to Home Screen name is AKAsheet
- [ ] Tab icon is the sheet mark (hard-refresh if the old pencil sticks)

---

## Do **not** rename these (internal only)

Changing these breaks vaults, cache, backups, and feature flags. Users never see them.

| Thing | Why it stays |
|--------|----------------|
| localStorage keys `bar4bar-*` / `b4b-*` | Existing browsers would lose albums / scratch pad |
| IndexedDB `bar4bar-pressed-audio` | Offline audio cache |
| Vault schema `bar4bar.studio-vault` | Old export files would not import |
| Feature flag `bar4bar-first-drops` | Admin config + Stripe metadata |
| Custom events `bar4bar:…` | In-app player / volume |
| Capacitor id `studio.bar4bar.app` | Would publish as a new native app |
| Firebase project `lyricai-studio-otgxn` | All production data lives here |
| Reserved slug `bar4bar` | Blocks someone claiming that Artist Home |

---

## Target copy (for bios)

> **AKAsheet** — Lyric App & Social Music Drop Platform  
> Put Your World Within Reach  
> https://akasheet.com  
> Support: akasheet.support@gmail.com
