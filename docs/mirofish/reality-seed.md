# AKAsheet — Market Research Brief (MiroFish Reality Seed)

**Upload this file once** to MiroFish **01 / Reality Seeds**. Reuse the same graph for multiple runs — only change **02 / Simulation Requirement** (see [simulation-prompts.md](./simulation-prompts.md)).

---

## Executive Summary

**AKAsheet** (akasheet.com) is a web-based **lyric and rhyme workstation** for hip-hop and songwriting artists. It is **not** a music generator like Suno or Udio.

Artists build **albums, tracks, DNA strains, rhyme books**, and export vault JSON. **Ink** pays for AI actions (line generation, DNA extraction, Studio Draft, Creative Effects). Typing and saving lyrics does **not** spend Ink.

**Go-to-market question:** Which positioning and pricing package maximizes stated Pro upgrade intent among indie album rappers vs hobbyists — without trust backlash (“trial scam,” “cheap sub,” “demo bait”)?

**Live stack (May 2026):** Free tier with 3-day Pro trial → Pro at **$7.77/mo** or **$53.28/yr** (~$4.44/mo).

---

## The Problem Space

| Segment | Pain | Time / cost today |
|---------|------|-------------------|
| Album-focused rapper | Lyrics scattered in Notes, Google Docs, voice memos — no DNA reuse across 8–12 tracks | Hours re-explaining vibe per song; collab via screenshots |
| Ghostwriter | Client handoffs are messy; no structured export | Re-prompting ChatGPT loses album continuity |
| Bedroom hobbyist | Wants one good song, not a “workflow OS” | Free ChatGPT + Suno hook is “good enough” |
| Suno-native producer | Has audio AI sub already | “Why pay for lyrics when Suno writes hooks?” |
| Downgraded / lapsed Pro | Built catalog on trial, hit paywall | Anger when vault saves lock and older tracks go view-only |

**Core job:** Structured bar-by-bar writing with rhyme context, album memory (DNA strains), and export — not finished audio.

---

## Target User Segments (named personas)

### Marcus — Indie album rapper (Atlanta)
- Building a 10-track project; uses Suno for beats only
- **Pain:** Re-types vibe prompts every track; wants to save “Chicago Noir DNA” once
- **Price sensitivity:** Medium — will pay ~$8/mo if vault + DNA Drop work
- **Discovery:** Twitter/X hip-hop writers, YouTube studio vlogs, producer Discords

### Priya — Ghostwriter / topliner (London)
- 4–6 clients; needs JSON export and import
- **Pain:** ChatGPT forgets client voice between sessions
- **Price sensitivity:** Low if export saves billable hours
- **Discovery:** LinkedIn, writer forums, referral from producers

### Jaylen — Bedroom hobbyist (18, Midwest)
- 1–2 songs per month; compares everything to free tools
- **Pain:** Overwhelmed by “album brain” messaging
- **Price sensitivity:** High — $7.77 must feel obvious vs free ChatGPT
- **Discovery:** TikTok, Reddit r/WeAreTheMusicMakers

### Dre — Suno-native producer (LA)
- Makes full tracks in Suno; wants quick hook lines
- **Pain:** Skeptical of another subscription
- **Price sensitivity:** High — already pays for audio stack
- **Discovery:** Suno Discord, producer Twitter

### Tasha — Trial-maximizer
- Uses every Pro feature in 3 days, extracts DNA, saves strains, tests Performance Mode
- **Pain:** Trial ends on day 3 at vault save — feels abrupt
- **Price sensitivity:** Churns unless upgrade feels fair, not trapped

### Renee — Downgraded Pro user
- Had Pro, lapsed payment; 4 newest tracks editable, rest view-only
- **Pain:** “They held my album hostage” narrative risk
- **Discovery:** Email win-back, pricing page return visit

---

## Competitive Landscape

| Tool | What it does | Pricing | Strong | Weak vs AKAsheet |
|------|--------------|---------|--------|-------------------|
| **Suno / Udio** | Finished audio | ~$10/mo | Instant song audio | No bar structure, no catalog DNA, no lyric vault |
| **ChatGPT** | Generic chat | Free–$20/mo | Flexible | No rhyme pulse, no album/track model, no DNA strains |
| **RhymeZone** | Rhyme lookup | Free | Fast rhymes | No generation, no project structure |
| **Notion / Docs** | Storage | Free | Flexible | No AI bar flow, no DNA |

**Switching trigger:** Artist finishes a mixtape draft elsewhere and hits “I need this on every track” or “I need to send DNA to my writer.”

**AKAsheet frame:** Suno gives you an mp3. AKAsheet gives you the **blueprint**.

---

## Product Overview

### Pricing (live — Pricing Scenario A)

| Tier | Price | Ink / limits |
|------|-------|----------------|
| **Visitor (free)** | $0 | 250 signup Ink + 150/mo residency (pool cap **400**); 1 album · **2 tracks**; all 9 Creative Effects on Ink |
| **Pro trial (new signup)** | $0 for **3 days** | Full Pro + **400** bonus Ink (one-time) |
| **Pro Monthly** | **$7.77/mo** | 1,777 residency Ink/mo; unlimited albums/tracks |
| **Pro Yearly** | **$53.28/yr** (~$4.44/mo) | 3,444 residency Ink/mo; 50% off permanent Ink packs |

**Ink packs (permanent):** Studio 1,000 @ $7.77 · Artist 1,800 @ $11.11 · Vault 4,500 @ $19.44

**Typical costs:** Studio Draft default structure ~104 Ink; Next/Previous Line **15 Ink** each.

### Pro unlocks (vs free)
Custom DNA / Vibe / Style **vault saves**, Performance Mode (teleprompter), Freestyle capture, vault import/export, **DNA Drop** share links, unlimited tracks.

### Free still works
Bar-by-bar AI on Ink, DNA & REMIX extraction, Generation Workstation, system presets (load-only), PDF export.

### Hypothetical Pricing Scenario B (simulation only — not live)
- No Pro trial; **2** free tracks; 75/mo residency (cap 350); yearly plan default on pricing page

---

## Key Industry Debates (agents should argue)

1. **“Another AI sub”** vs **“This replaces Notes + ChatGPT for lyrics”**
2. **Ink metering** — transparent fuel vs nickel-and-diming anxiety
3. **$7.77 feels cheap / scammy** vs accessible for indie artists
4. **3-day trial** — fair preview vs “trial scam” when vault save locks on day 3
5. **Free too generous** — why pay Pro if 250 + 150/mo runs the whole shop?
6. **AKAsheet vs Suno** — complementary (beats + blueprint) or redundant?
7. **Invite-gate beta** — exclusivity vs friction (if enabled at launch)
8. **“Notion for rappers”** — pro workflow vs too nerdy for hobbyists

---

## Conversion hypotheses (rank per persona in simulation)

| # | Trigger | Why we believe it converts |
|---|---------|---------------------------|
| 1 | Trial ends at **vault save** | DNA extracted, Save locked day 3 |
| 2 | **4th track** mid-album | Free cap during active project |
| 3 | **DNA Drop** for collab | Pro-only share link |
| 4 | **Ink depleted** mid-session | ~104 Ink/Studio Draft |
| 5 | **Suno comparison** | Already pays for audio AI |
| 6 | **Trial downgrade shock** | Saves locked; older tracks view-only |
| 7 | **Performance / Freestyle** | Rehearsal or live capture |
| 8 | **Invite-gate** | Access code before signup |

**Real user quotes (add as you collect):**
- “I’d pay if…” — *(empty)*
- Objections — *(empty)*

---

## GTM scenarios (vary in simulation prompts only)

### Market A — Catalog workflow
> **AKAsheet is your album brain — not a beat toy.** Pro = catalog: DNA vault, Performance Mode, DNA Drop.

### Market B — Ink-first workstation
> **Everything works on Ink — Pro unlocks scale.** Lead with Ink math (250 signup + 150/mo, 400 cap).

### Pricing A — Live (trial-heavy)
3-day trial + 400 Ink, 4 tracks, $7.77/mo. Primary pain: trial end + vault save.

### Pricing B — Hypothetical (pain-led)
No trial, 2 tracks, yearly default. Primary pain: early track cap.

| Dimension | Pricing A (live) | Pricing B (hypothetical) |
|-----------|------------------|---------------------------|
| Pro trial | 2-day feature preview | None |
| Free tracks | 2 | 2 |
| Monthly Ink | 150 (cap 400) | 75 (cap 350) |
| Pro monthly | $7.77 | $7.77 |
| Pro yearly | $53.28/yr | $53.28/yr (default UI) |

---

*Source: AKAsheet repo — `studio-tiers.ts`, `subscription.ts`, `trial.ts`, `pricing/page.tsx` (May 2026).*
