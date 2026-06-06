# Bar 4 Bar Studio — 90-Day Web-Only Revenue Plan

**Product:** Bar 4 Bar Studio (AI lyric workstation & rhyme book)  
**Live URL:** https://bar4bar.ink — see [CUSTOM_DOMAIN.md](./CUSTOM_DOMAIN.md)  
**Firebase project:** `lyricai-studio-otgxn`  
**Scope:** Web-only (PWA on mobile). No native App Store launch in this window.  
**Last updated:** May 28, 2026

> **Related files:**  
> - **Week 1 action list:** [MARKETING_QUICKSTART.md](./MARKETING_QUICKSTART.md)  
> - Piece of Cake import: `docs/bar-4-bar-90-day-revenue-plan.piece-of-cake.json`  
> - Admin metrics: Admin Panel → **Growth Metrics** tab  
> - TikTok deep-dive (older): `docs/TIKTOK_STRATEGY.md`  
> - App stores (Phase 2): [APP_STORE_ROADMAP.md](./APP_STORE_ROADMAP.md)  
> - Monetization reference: `docs/MONETIZATION.md`

---

## Table of contents

1. [Executive summary](#executive-summary)
2. [Positioning & ICP](#positioning--icp)
3. [Current tiers & pricing](#current-tiers--pricing)
4. [Build vs market (90-day rule)](#build-vs-market-90-day-rule)
5. [Phase 1 — Days 1–30: Fix funnel & prove conversion](#phase-1--days-130-fix-funnel--prove-conversion)
6. [Phase 2 — Days 31–60: Paid tests & content engine](#phase-2--days-3160-paid-tests--content-engine)
7. [Phase 3 — Days 61–90: Scale winner & partnerships](#phase-3--days-6190-scale-winner--partnerships)
8. [Channel strategy & priority](#channel-strategy--priority)
9. [TikTok & Instagram (web app on phone)](#tiktok--instagram-web-app-on-phone)
10. [Ad creative playbook](#ad-creative-playbook)
11. [Hook library](#hook-library)
12. [Offer strategy by audience temperature](#offer-strategy-by-audience-temperature)
13. [Metrics & KPIs](#metrics--kpis)
14. [Revenue milestones](#revenue-milestones)
15. [Prerequisites before scaling ads](#prerequisites-before-scaling-ads)
16. [Weekly review checklist](#weekly-review-checklist)

---

## Executive summary

Bar 4 Bar is **not** a one-shot “write my song” generator. It is a **bar-by-bar AI lyric workstation** — rhyme book, structure paste, DNA/vibe/style co-writer, and album organization.

This 90-day plan is **web-only**: all traffic converts through mobile/desktop browser (PWA install optional). The strategy is:

- **80% marketing / 20% build** (build only what blocks signup → first AI action → payment)
- **Days 1–30:** Fix production funnel, organic content, first Pro sales
- **Days 31–60:** $10–20/day paid tests, find one winning hook + channel
- **Days 61–90:** 2× budget on winner, micro-influencers, share-link growth loop

**90-day success definition (realistic solo founder):**

| Target | Range |
|--------|--------|
| Paying Pro users | 30–80 |
| MRR | $400–1,500 |
| Repeatable ad hook | Cost per signup under ~$15–25 |

---

## Positioning & ICP

### One-line positioning (use everywhere)

> **Bar 4 Bar is the rhyme book + co-writer for rappers and songwriters who think in bars—not paragraphs.**

### Ideal customer profile (ICP)

1. **Independent rappers / lyricists** writing seriously (not casual “make me a hit” tourists)
2. **Songwriters** with messy notes, voice memos, and half-finished verses
3. **Producers** who write toplines and need structure + rhyme discipline

### Problems to solve (rotate in ads — lead with #1)

| # | Problem | Product proof |
|---|---------|----------------|
| 1 | **“I’m stuck on the next bar”** | Generate Next Line + Rhyme Pulse |
| 2 | **“My notes are chaos”** | + Paste Your Lyrics → `[Verse]` / `[Hook]` structure |
| 3 | **“Generic AI lyrics sound like everyone else”** | DNA, guardrails, style training, intents |
| 4 | **“I lose ideas between sessions”** | Cloud rhyme book, vault, share links (Pro) |

**Lead with #1** for cold traffic — it’s visual in 10 seconds and separates you from whole-song generators.

### What you are NOT

- ChatGPT in a box
- Suno / Udio / beat generator
- A full DAW

You are the **writing desk** before the beat drops.

---

## Current tiers & pricing

Source of truth in code: `src/lib/studio-tiers.ts`, `src/lib/stripe-catalog.ts`, `src/lib/subscription.ts`

### Visitor (free)

| Item | Value |
|------|--------|
| Signup Ink | 300 |
| Monthly residency Ink | 111 (additive monthly grant) |
| Projects | 1 album · 4 tracks |
| Creative Effects | All 9 (10 Ink each) |
| Locked | Performance Mode, Freestyle, custom DNA saves, vault I/O, share links |
| Available | Full bar-by-bar AI on Ink, DNA & REMIX, Generation Workstation, PDF export |
| Trial | 3-day Pro workflow + 400 bonus Ink on signup |

### Pro Monthly — $7.77/mo

| Item | Value |
|------|--------|
| Residency Ink | 1,777/mo |
| Unlocks | Unlimited albums & tracks, custom DNA saves, Performance Mode, Freestyle, vault import/export, shareable DNA Drop links |

### Pro Yearly — $4.44/mo effective ($53.28/yr billed annually)

| Item | Value |
|------|--------|
| Residency Ink | 3,444/mo |
| Subscription savings | ~**43%** vs paying $7.77/mo × 12 ($93.24) |
| Yearly-only perks | **50% off Permanent Ink packs**, BYO Google AI key, Studio Roadmap Input |

> **Copy note:** 50% savings applies to **Ink packs** on Yearly Pro — not the subscription itself (~43%).

### Ink packs (Permanent Ink — never expires)

| Pack | Ink | Price |
|------|-----|-------|
| Studio Pack | 1,000 | $7.77 |
| Artist Bundle | 1,800 | $11.11 |
| Studio Vault | 4,500 | $19.44 |
| Vault Bundle | 4,000 | (see stripe catalog) |

Yearly Pro gets 50% off at checkout.

### Price anchor in ads

**Free demo (300 Ink + real workstation) → Pro unlocks unlimited projects + full co-writer → Yearly for heavy writers.**

- Push **monthly Pro** in ads ($7.77/mo)
- Mention yearly on pricing page and to power users only

---

## Build vs market (90-day rule)

### Market now (~80% of effort)

- Screen demos of bar workstation (TikTok, Reels, Shorts)
- Clear “free demo → Pro” story
- Pricing + yearly narrative
- SEO keywords: AI lyric writer, rhyme book app, rap writing workstation, bar-by-bar lyrics
- Reddit / honest tool posts
- Admin Growth Metrics weekly review

### Build only if blocking (~20%)

- Production Firebase / billing stability (AI + ink deduction)
- Signup → first AI action onboarding (3-step checklist)
- PWA “Add to Home Screen” prompt
- Landing hero + single CTA
- Share / DNA Drop as social proof loop
- Pricing page mobile layout

### Do NOT build in 90 days

- Native iOS / Android store apps
- Social network / feeds
- Beat marketplace
- New AI modalities (video gen, music gen)
- Complex tier changes
- Community forum

---

## Phase 1 — Days 1–30: Fix funnel & prove conversion

**Goal:** Production-stable signup → first “wow” → pricing view → first Pro sale, organically.

### Market

| Action | Frequency |
|--------|-----------|
| Short screen recordings | 3–5/week on TikTok + Instagram Reels |
| Reddit posts | 1/week (r/WeAreTheMusicMakers, r/Songwriting, r/rap) |
| Twitter/X threads | Bar-by-bar workflow demos |

### Build (only if not done)

| Item | Why |
|------|-----|
| Fix Cloud Run / Firebase billing | AI must work before any paid traffic |
| Landing clarity + “Start free” CTA above fold | Conversion |
| Mobile PWA install prompt | Mobile retention |
| Admin Growth Metrics verified | Tracking |

### Do not build

New features, Android native, collab rooms, video tools.

### Phase 1 metrics (weekly)

- Signups
- % who open track editor within 24h
- % who use **Generate Next Line** or **+ Paste Your Lyrics** once
- Pricing page visits / signup
- First Pro checkout (1–3/week = win early)
- Ink depleted → upgrade click rate

### Phase 1 revenue target

**$50–200/mo** from first Pro + occasional ink packs.

---

## Phase 2 — Days 31–60: Paid tests & content engine

**Goal:** Find one channel + one hook that converts at acceptable CAC.

### Market

| Action | Detail |
|--------|--------|
| Paid ads | $10–20/day TikTok Spark Ads or Meta Reels |
| Test matrix | 3 hooks × 2 creatives = 6 variants minimum |
| Retargeting | Meta pixel — visitors who hit /pricing or used AI |
| Email capture | “Get 50 bar-writing tips” PDF on pricing (not more Ink) |

### Build (only if blocking)

| Item | Detail |
|------|--------|
| Onboarding checklist | 3 steps: paste lyrics → generate one bar → save |
| Shareable before/after screenshots | Social proof assets |
| `/pricing` mobile layout | Thumb-friendly tier comparison |

### Do not build

Marketplace, community forum, native apps.

### Phase 2 metrics (weekly)

- Cost per signup (CPS)
- Cost per activated user (used AI once)
- Cost per Pro purchase
- 7-day retention (returned to same track)
- Free → Pro conversion (target: **2–5%** of activated users in 30 days)
- Pricing → checkout start → paid funnel

### Phase 2 revenue target

**$300–800/mo** (10–25 Pro subs mix + ink packs).

### End of Phase 2 decision

Declare **one winning hook** and **one winning channel** (lowest cost per activated user + highest checkout completion). Kill underperforming ad sets. Document winner in Admin → Growth Metrics → Paid acquisition notes.

---

## Phase 3 — Days 61–90: Scale winner & partnerships

**Goal:** Scale what worked; add one partnership channel.

### Market

| Action | Detail |
|--------|--------|
| Scale ads | 2× budget on **best ad set only** |
| YouTube Shorts | Repost TikTok/Reels winners |
| Micro-influencers | 5–10 seedings (beatmakers, writing coaches) — free Pro for honest demo |
| DNA Drop share links | Market Pro share links as collab loop |
| SEO | 2 blog posts/month (slow channel) |

### Build (only if justified)

| Item | Detail |
|------|--------|
| Referral / share loop | DNA Drop links already on Pro — market them |
| Optional `/demo` | Read-only public track for ad landing |

### Do not build

Major new AI modes until MRR justifies spend.

### Phase 3 metrics (weekly)

- MRR + ink pack revenue
- Churn (monthly cancel rate)
- LTV: monthly Pro ~$7.77 × 4 mo ≈ **$31**; yearly ~**$53** upfront
- Organic vs paid signup split

### Phase 3 revenue target

**$800–2,000/mo** if one hook + offer clicks.

---

## Channel strategy & priority

| Rank | Channel | Notes |
|------|---------|-------|
| 1 | **TikTok + Instagram Reels** | Best discovery; web converts via mobile browser + PWA |
| 2 | **YouTube Shorts** | Same clips, longer shelf life |
| 3 | **Reddit / Discord** | Honest tool posts — high trust, low volume |
| 4 | **SEO / blog** | Slow; start 2 posts/month in Phase 3 |
| 5 | **Paid Meta (Reels)** | After organic hooks prove out (Phase 2) |
| 6 | **Email** | Only after 500+ signups |

**Skip for now:** Twitter ads, Google Search ads (expensive for “AI lyrics”), influencer mass buys.

### SEO target keywords

- AI lyric writer
- Rhyme book app
- Songwriting studio
- Rap lyrics generator
- Lyric workstation
- DNA remix lyrics
- Bar-by-bar songwriting

---

## TikTok & Instagram (web app on phone)

### Should you advertise if it’s a web app?

**Yes.** Creative tools (Canva, Notion, Suno’s web funnel) convert mobile traffic to **mobile browser** or **PWA**. Bar 4 Bar supports PWA install (Studio Tips #25).

You are **not** competing on the App Store — you compete on **outcome in 30 seconds**: *next bar appears / chaos becomes structure*.

### Conversion flow

```
Ad on phone
  → link in bio / ad CTA
  → mobile web signup
  → first session: paste lyrics OR tap “Generate next bar”
  → end card: “Add to Home Screen for full-screen studio” (PWA)
  → email capture or return visit
  → Pro when 2-track limit or low Ink
```

### Format rules

- **Aspect ratio:** 9:16 vertical
- **Length:** 15–25 seconds
- **Intro:** No logo-first — hook in first 2 seconds
- **Style:** Dark UI, gold/amber accents, **real finger taps** on live UI (not mockups)
- **Face:** Optional; hands + screen often beats talking head for tools

---

## Ad creative playbook

Every ad follows this structure:

| Seconds | Visual | On-screen text |
|---------|--------|----------------|
| 0–2 | Hook — pain | “Stuck on the next bar?” |
| 2–8 | Screen record — paste messy lyrics | “Paste your verse…” |
| 8–14 | Smart Structure or Next Line | “…split into hooks & bars” / “AI suggests the next line *in your rhyme*” |
| 14–20 | Co-writer badges / Rhyme Pulse | “Rhyme book + co-writer. Not generic paragraphs.” |
| 20–25 | CTA | “Free demo — link in bio” / “300 Ink free” |

### CTA lines

- “Try free — 300 Ink”
- “Write bar 5 today”
- “Link in bio → Bar 4 Bar Studio”

---

## Hook library

Rotate weekly during paid tests.

### Problem hooks (cold traffic — best)

- “POV: you’ve had the same 4 bars for 3 weeks”
- “Stop asking ChatGPT for a whole song”
- “Your notes app isn’t a rhyme book”
- “I paste my mess → it becomes verse / hook / verse”

### Outcome hooks

- “Watch AI land the **next bar**—not rewrite your whole song”
- “Rhyme pulse + next line in one workstation”
- “From voice memo chaos to structured lyrics in 60 seconds”

### Objection killers

- “It’s a **web studio**—works on phone, no download” (+ show PWA add-to-home)
- “Free tier is a real demo, not a 3-day trial scam”

---

## Offer strategy by audience temperature

| Audience | Ad message | Upgrade moment |
|----------|------------|----------------|
| **Cold** | Free demo, paste + next bar | Hits 2-track limit or runs low on Ink |
| **Warm** (retarget) | “Unlock unlimited albums + full co-writer — $7.77/mo” | Visited pricing, used AI 3+ times |
| **Heavy users** | Yearly: more Ink/mo + 50% off refills | Depleted Ink twice in one month |

---

## Metrics & KPIs

Track weekly in **Admin Panel → Growth Metrics** (`/admin`, Growth Metrics tab).

### Funnel

| Metric | Why |
|--------|-----|
| Signups | Top of funnel |
| Activation rate (1+ AI action) | Product-market fit signal (target 40–60% early) |
| Time to first **Generate Next Line** | Core value moment |
| Track editor opens | Depth of engagement |
| Pricing page views | Interest |
| Checkout starts → completions | Monetization funnel |
| Signup → paid rate | Overall conversion |

### Retention

| Metric | Why |
|--------|-----|
| 7-day return rate | Stickiness |
| Active last 7d / 30d | Engagement |

### Monetization

| Metric | Why |
|--------|-----|
| Est. MRR | Active monthly × $7.77 + yearly × $4.44 effective |
| Ink pack revenue (30d / 90d) | One-time revenue |
| Active Pro monthly / yearly counts | Sub mix |
| Avg revenue per paying user | LTV proxy |

### Free tier pressure (upgrade triggers)

| Metric | Why |
|--------|-----|
| Users at album limit (1) | Upgrade prompt |
| Users at track limit (2) | Upgrade prompt |
| Users low on Ink | Upgrade prompt |
| Free limit hit events | Tracked in analytics |
| Upgrade click events | Intent signal |

### Acquisition (manual entry in admin)

| Metric | Why |
|--------|-----|
| Ad spend (30d / 90d) | Enter from TikTok/Meta dashboards |
| Cost per signup | ad spend ÷ signups |
| Cost per activated user | ad spend ÷ activated users |
| Target CPS | Under ~$15–25 to scale |

### Events tracked automatically

`signup` · `session_start` · `track_editor_open` · `pricing_view` · `checkout_started` · `checkout_completed` · `upgrade_click` · `free_limit_hit` · `ai_action`

---

## Revenue milestones

| Period | Revenue target | Notes |
|--------|----------------|-------|
| Days 1–30 | $50–200/mo | First Pro + occasional ink |
| Days 31–60 | $300–800/mo | 10–25 Pro subs + ink |
| Days 61–90 | $800–2,000/mo | Scale winner |
| **90-day success** | 30–80 Pro users, $400–1,500 MRR | + one repeatable hook |

### LTV estimates

- **Monthly Pro:** ~$7.77 × 4 months avg ≈ **$31**
- **Yearly Pro:** **$53.28** upfront

---

## Prerequisites before scaling ads

**Do not spend heavily on ads until a signup on mobile web can:**

1. Complete at least one AI action (Generate Next Line or Paste Your Lyrics)
2. Optionally complete Stripe checkout without errors

Known production blocker (verify fixed before Phase 2 paid spend):

- Cloud Run must **not** use `GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json` when file is missing on deploy
- Symptom: “Studio billing is temporarily unavailable” on AI actions
- Fix: ADC on Cloud Run; service account path in `.env.local` only; redeploy hosting

---

## Weekly review checklist

Use every Monday (or your chosen day):

- [ ] Open Admin → Growth Metrics → Refresh
- [ ] Record signups (7d / 30d)
- [ ] Check activation rate and avg time to first AI
- [ ] Review pricing → checkout → paid funnel
- [ ] Note MRR and ink pack revenue
- [ ] Check free tier pressure (limit hits, low ink users)
- [ ] Update ad spend in Paid acquisition section
- [ ] Calculate CPS and cost per activated user
- [ ] Post 3–5 organic clips this week (Phase 1–3)
- [ ] Kill or pause underperforming ad sets (Phase 2+)
- [ ] Document winning hook in marketing notes field

---

## Quick reference — what to say in one sentence

**To a rapper:** “Stuck on bar 5? Bar 4 Bar is a rhyme book that suggests the next line in your flow—not a generic paragraph.”

**To an investor/partner:** “Bar-by-bar AI lyric workstation with freemium Ink economy; Pro at $7.77/mo, targeting serious independent lyricists via TikTok/Reels.”

**To yourself on Monday:** “Did someone sign up, use AI once, and could they pay if they hit the 2-track wall?”

---

*This document consolidates the 90-day web-only revenue strategy, positioning, channel playbook, ad creative guidance, tier economics, and metrics framework for Bar 4 Bar Studio. Import task breakdown into Piece of Cake via `bar-4-bar-90-day-revenue-plan.piece-of-cake.json`.*
