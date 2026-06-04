# SEO — Bar 4 Bar Studio

On-page SEO is configured in code (`src/lib/seo.ts`) and applied via Next.js `metadata`, `sitemap.ts`, and `robots.ts`.

Production canonical base: **https://bar4bar.ink** (`NEXT_PUBLIC_APP_URL`).

## What ships in the app

| Asset | URL |
|-------|-----|
| Sitemap | `https://bar4bar.ink/sitemap.xml` |
| Robots | `https://bar4bar.ink/robots.txt` |
| Manifest | `https://bar4bar.ink/manifest.webmanifest` |

**Indexed public routes:** home, `/login`, `/pricing`, `/usage`, `/leaderboard`, `/studio-progress`, `/terms`, `/privacy`, `/cookies`.

**Blocked in robots:** `/admin`, `/api/`, `/albums/` (private vault), `/maintenance`.

**Structured data:** `WebSite`, `Organization`, and `SoftwareApplication` JSON-LD on every page (root layout).

## Google Search Console (manual, ~10 min)

1. Open [Google Search Console](https://search.google.com/search-console).
2. **Add property** → URL prefix → `https://bar4bar.ink`.
3. **Verify** using DNS TXT (recommended on Porkbun/Cloudflare) or HTML tag.
4. **Sitemaps** → submit `https://bar4bar.ink/sitemap.xml`.
5. **URL inspection** → test `https://bar4bar.ink/login` and **Request indexing**.

Re-submit the sitemap after major marketing pushes or new public pages.

## After deploy

```bash
npm run deploy:live
```

Confirm:

- `curl -s https://bar4bar.ink/robots.txt` lists the sitemap URL.
- `curl -s https://bar4bar.ink/sitemap.xml` includes `/login` and `/pricing`.
- View source on `/login` — `<title>` and `og:title` mention Bar 4 Bar / next bar.

## Optional improvements (not in repo)

- Dedicated **1200×630** Open Graph image (replace `/Logo.png` in `SEO.ogImagePath`).
- Set `SEO.twitterHandle` in `src/lib/seo.ts` when you have a brand X account.
- Blog or `/help` pages for long-tail “how to write next rap bar” content.
- Google Analytics / Search Console linking for query reports.

## Editing copy

Change `SEO.title`, `SEO.description`, and `SEO.keywords` in `src/lib/seo.ts`, then redeploy. Per-page titles live in each route’s `layout.tsx` via `pageMetadata()`.
