# Bar 4 Bar — Ink economy (current)

> **Source of truth:** `src/lib/costs.ts`, `src/lib/subscription.ts`, `src/lib/stripe-catalog.ts`, `src/lib/studio-tiers.ts`  
> **Payments:** [STRIPE_SETUP.md](./STRIPE_SETUP.md)

This replaces older notes about 8,888 Ink, $8.88/mo, or 125 signup Ink.

---

## Tiers

| Tier | Price | Residency Ink |
|------|-------|----------------|
| Visitor | $0 | **300** signup + **111**/month (additive; can stack up to **500** in UI pool) |
| Pro Monthly | $7.77/mo | **1,777**/month (refill sets pool on subscribe + renew) |
| Pro Yearly | $53.28/yr ($4.44/mo) | **3,444**/month residency refill |

**Permanent packs (one-time):** Studio $7.77 → 1,000 · Artist $11.11 → 1,800 · Vault $19.44 → 4,500  
**Yearly Pro:** 50% off packs at checkout when `STRIPE_COUPON_YEARLY_INK_50` is configured.

---

## Action costs (`costs.ts`)

| Action | Ink |
|--------|-----|
| Studio Draft (per bar) | 2 |
| Next / Previous Line | 10 |
| Rhyme Pulse | 10 |
| Train AI on Style | 35 |
| Analyze Vibe | 20 |
| Creative Effect | 10 |
| + Paste Your Lyrics | 8 |
| DNA Remix (per bar) | 2 |
| Extract DNA Profile | 10 |

**Ink tip:** Default song structure (~52 bars) ≈ **104 Ink** via Studio Draft; line-by-line on every bar costs roughly **5×** more.

---

## Owner margin

Gemini Flash API cost per action is fractions of a cent (`src/lib/billing.ts`). Subscription + pack pricing is calibrated for high margin at typical usage. Heavy use of `aiVideoDirector` (100) or `aiMusicCowriter` (80) is the main burn risk if those flows grow.

---

## Competitor positioning

Bar 4 Bar is a **lyric workstation** (rhyme book, DNA vault, remix strains)—not Suno/Udio-style full-song generation. Ink funds structured writing tools, not audio renders.
