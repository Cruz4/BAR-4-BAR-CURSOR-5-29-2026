# SEO — AKAsheet

On-page SEO is configured in code (`src/lib/seo.ts`) and applied via Next.js `metadata`, `sitemap.ts`, and `robots.ts`.

Production canonical base: **https://akasheet.com** (`NEXT_PUBLIC_APP_URL`).

## Positioning (matches product)

Default description now joins the two real product loops: **bar-by-bar songwriting** and a **music network for artists, creators, and Music Fans**. Public copy covers free music homes, owned/purchased featured tracks, explainable Discover, Support Circle, transparent Emerging momentum, Listener Insights, collaboration, and First Drops. Guest `/` is the Pressing playground; the writing demo lives at `/try`.

## What ships in the app

| Asset | URL |
|-------|-----|
| Sitemap | `https://akasheet.com/sitemap.xml` |
| Robots | `https://akasheet.com/robots.txt` |
| Manifest | `https://akasheet.com/manifest.webmanifest` |

**Indexed public routes (static sitemap):** home (`/`), `/try`, `/pricing`, `/discover`, `/leaderboard`, `/login`, `/terms`, `/privacy`, `/cookies`.

**Blocked in robots:** admin/API routes plus account-only albums, activity, earnings, feed, friends, insights, Library, Msgs, Edit Public Page, Studio Progress, Support Circle, Usage, and Vault. Their route metadata is also `noindex` where applicable.

**Public music homes (`/{slug}`):** Up to 5,000 live `publicProfiles` are added to the sitemap, refreshed hourly; if Firebase is temporarily unavailable, the sitemap safely falls back to static routes. Legacy `/profile/{slug}` links permanently redirect to the clean vanity route. Live profiles get per-page metadata built from public identity labels, genres, featured-track title, studio rank, and **recent wall/imprint post text**. The first wall page and configured imprint shelf posts are **server-rendered** in the initial HTML (copy-pasteable text + `/p/{postId}` permalinks). JSON-LD `ItemList` of `SocialMediaPosting` entries is emitted on each live profile when posts exist.

**Public Scene posts (`/p/{postId}`):** Up to 5,000 posts from artists with live public profiles are in the sitemap. Each permalink is indexable (`robots: index, follow`), ships `SocialMediaPosting` JSON-LD with `articleBody` (including imprint `post.text`), and uses the imprint quote in meta description/Open Graph. Imprint styling (`quotePress`) is presentation only — crawlers read the underlying text.

Missing/private-unavailable profile slugs are `noindex`.

**Structured data:** `WebSite`, `Organization`, and `SoftwareApplication` JSON-LD on every page. The app schema includes its music/songwriting audience and a current feature list.

## Google Search Console (manual, ~10 min)

1. Open [Google Search Console](https://search.google.com/search-console).
2. **Add property** → URL prefix → `https://akasheet.com`.
3. **Verify** using DNS TXT (recommended on Porkbun/Cloudflare) or HTML tag.
4. **Sitemaps** → submit `https://akasheet.com/sitemap.xml`.
5. **URL inspection** → test home, `/try`, `/discover`, and `/leaderboard`, then **Request indexing**. Optionally inspect a known live public music home.

Re-submit the sitemap after major marketing pushes or new public pages.

## After deploy

```bash
npm run deploy:live
```

Confirm:

- `curl -s https://akasheet.com/robots.txt` lists the sitemap URL and does **not** disallow `/profile/`.
- `curl -s https://akasheet.com/sitemap.xml` includes home, `/try`, `/pricing`, `/discover`, and `/leaderboard`.
- View source on `/login` — `<title>` and `og:title` mention AKAsheet.
- Guest `/` OG/title cover the songwriting workstation and public music network (root layout defaults from `SEO.*`).

## Optional improvements (not in repo)

- Dedicated **1200×630** Open Graph image (replace `/Logo.png` in `SEO.ogImagePath`).
- Set `SEO.twitterHandle` in `src/lib/seo.ts` when you have a brand X account.
- Blog or `/help` pages for long-tail “how to write next rap bar” content.
- Dedicated public editorial/help pages for long-tail music discovery and direct-to-fan search queries.
- Google Analytics / Search Console linking for query reports.

## Editing copy

Change `SEO.title`, `SEO.description`, and `SEO.keywords` in `src/lib/seo.ts`, then redeploy. Per-page titles live in each route’s `layout.tsx` via `pageMetadata()`, or `generateMetadata` on dynamic Artist Homes.
