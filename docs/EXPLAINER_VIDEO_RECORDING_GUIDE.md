# Explainer video — demo vault, script & recording guide

**Product:** Bar 4 Bar Studio · https://bar4bar.ink  
**Vault file:** `sample-data/bar4bar-marketing-demo-vault-import.json`  
**Meta (IDs & hero paths):** `sample-data/bar4bar-marketing-demo-vault.meta.json`

Regenerate vault JSON anytime:

```bash
npm run sample-data:marketing-vault
```

---

## Part 1 — Demo account setup (do this first)

### Agent / QA login (recommended)

A dedicated **Studio Pro + 10k permanent Ink** account can be seeded for browser agents and demos:

```bash
npm run seed:agent-demo
```

Credentials are written to **`.env.local`** only (`AGENT_DEMO_EMAIL`, `AGENT_DEMO_PASSWORD`, `AGENT_DEMO_UID`) — never commit them. Re-run the script to rotate the password.

| Setting | Value |
|---------|--------|
| **Email** | `AGENT_DEMO_EMAIL` from `.env.local` (default `agent.demo@bar4bar.ink`) |
| **Tier** | Studio Pro (yearly) |
| **Ink** | 10,000 permanent |
| **Login** | `http://localhost:9002/login` or `https://bar4bar.ink/login` |

### Marketing-only login (manual)

Use a **separate account** from your daily driver — e.g. `bar4bar.demo@gmail.com` or similar — if you prefer not to use the agent seed.

| Setting | Recommendation |
|---------|----------------|
| **Tier** | **Studio Pro** (required for vault import/export, Performance Mode, Freestyle in video) |
| **Ink** | Top up or use monthly residency so Generate Next Line never blocks mid-record |
| **Browser** | Chrome/Edge, 1920×1080 or 1440×900, zoom 100%, dark UI, bookmarks bar hidden |

### 2. Import the demo vault

1. Sign in as the demo account on **localhost:9002** or **bar4bar.ink**
2. Open **The Vault** at `/vault`
3. Choose **Import Studio Vault** → select `sample-data/bar4bar-marketing-demo-vault-import.json`
4. Review the version, project counts, Style Profile behavior, and collision copies, then confirm merge. Import never removes or overwrites current projects.

You should see **4 albums**:

| Album | Role in video |
|-------|----------------|
| **NEON AFTER HOURS** | Hero — Next Line demo |
| **EARTHEN MONOLITH** | DNA + Rhyme Pulse demo |
| **IRON DISTRICT** | Vault grid filler |
| **VELVET CIRCUIT** | Vault grid filler |

### 3. Bookmark these paths (after import)

Replace `{base}` with `https://bar4bar.ink` or `http://localhost:9002`.

| Beat | URL |
|------|-----|
| Vault home | `{base}/vault` |
| **Hero track (Next Line)** | `{base}/albums/album-neon-after-hours/tracks/track-neon-01` |
| **Rhyme Pulse track** | `{base}/albums/album-earthen-monolith-2026/tracks/track-stone-circuit-001` |
| **Album DNA (5 questions)** | `{base}/albums/album-neon-after-hours` |
| Performance Mode | `{base}/albums/album-neon-after-hours/tracks/track-neon-01/perform` |
| Staged B-roll (no login) | `{base}/marketing/capture/how-step-workstation` |
| Co-writer GIF scene | `{base}/marketing/capture/gif-co-writer-next-line` |
| Rhyme Pulse GIF scene | `{base}/marketing/capture/gif-rhyme-pulse` |
| DNA remix GIF scene | `{base}/marketing/capture/gif-dna-remix` |

### 4. Pre-flight checklist

- [ ] Demo account is **Pro**
- [ ] Vault import succeeded (4 albums, 14 tracks total)
- [ ] **BOOTH LIGHT** verse bar **4 is empty** (ready for Next Line)
- [ ] **STONE CIRCUIT** has full verse + rhyme groups (Rhyme Pulse looks colorful)
- [ ] Ink balance sufficient for 5+ AI actions
- [ ] Notifications off, Do Not Disturb on
- [ ] Rehearse **Next Line → Accept** once on BOOTH LIGHT bar 4

---

## Part 2 — 90-second explainer script (voiceover + screen)

**Format:** 16:9 screen record · optional 9:16 cutdown from same footage  
**Tone:** Studio workflow, not “AI magic”

| Time | VO | On screen |
|------|-----|-----------|
| **0:00–0:08** | “You ever get stuck on the *next bar* — not the whole song, just the next line that actually fits?” | Hero track editor; cursor on **empty bar 4** in BOOTH LIGHT — don’t click yet |
| **0:08–0:18** | “Bar 4 Bar isn’t a ‘write my song’ button. It’s a studio rhyme book — bar by bar — for rappers and songwriters who care about structure, rhyme, and staying on theme.” | Cut to vault grid (4 vinyl albums). Optional overlay: *Bar by bar. Not paragraph soup.* |
| **0:18–0:32** | “Start with your album’s DNA — five questions: setting, emotion, trigger, truth, tone. Set it once… every track inherits it.” | Open **NEON AFTER HOURS** → Album DNA panel; slow scroll all five fields |
| **0:32–0:50** | “Write on the sheet — verse, hook, bridge. Stuck? Hit **Next Line**. Two rhyme-aware options. Pick one. It slots in. Structure stays intact.” | 1) Click bar 4 2) Footer **Bar Workstation** → Next 3) Opt 1 / Opt 2 4) Accept — **hold 1 sec** |
| **0:50–1:05** | “Paste rough notes — the studio decodes themes and style into **strains** you save, remix, and inject. So the AI sounds like *your* project.” | DNA & Remix: paste `MARKETING_SEED_LYRICS` from below → strain cards → one ⚡ inject |
| **1:05–1:20** | “Then step onto The Scene. Choose Artist, creator, or Music Fan. Feature a track you released or bought, discover people by public taste and craft, and see why every match or Emerging score moved.” | Fast montage: Sound Identity → featured track selector → Discover reason → Emerging reason |
| **1:20–1:30** | “Start free at bar4bar.ink. Write the next bar, then build the music world around it.” | Landing → **Create free account**. End card 3s: **BAR 4 BAR · bar4bar.ink** |

### DNA paste text (for 0:50 beat)

```
The mist rolls in like a ghost from the shore
My skin is timber, my heart is solid stone
I've watched empires crumble while I stood alone
The riverbed is dry, the granite starts to sing
```

---

## Part 3 — Shot list by feature (what to highlight)

Priority order for screen recording:

1. **Generate Next Line** — BOOTH LIGHT, bar 4 (money shot)
2. **Album DNA** — NEON AFTER HOURS direction panel
3. **Vault grid** — 4 albums, vinyl spin
4. **Rhyme Pulse** — STONE CIRCUIT, round button in lyrics toolbar
5. **DNA decode / strains** — paste seed lyrics in Calibration Hub
6. **Performance Mode** — quick 3s flash on hero track
7. **Vault search** — type “granite” or “neon” → bar result
8. **Public ecosystem montage** — Music Fan identity → featured Library track → Discover reason → Emerging reason

**Skip in a 90s cut:** Ink costs, settings, gamification, downgrade modals, empty states.

---

## Part 4 — Click paths (step-by-step)

### A. Hero — Generate Next Line

1. Go to `…/albums/album-neon-after-hours/tracks/track-neon-01`
2. Left panel: select **Verse** section if not active
3. Click **bar 4** (empty row after “…through the vent and wall”)
4. Footer: **Bar Workstation** → **Next** (or equivalent generate control)
5. Wait for **Opt 1** and **Opt 2**
6. Click **Accept** on preferred option
7. Pause — show line locked into sheet

### B. Rhyme Pulse

1. Go to `…/albums/album-earthen-monolith-2026/tracks/track-stone-circuit-001`
2. Click **Rhyme Pulse** (round button, center panel top bar)
3. Confirm Ink if prompted
4. Hold on color-coded rhyme groups 2–3 seconds

### C. Album DNA

1. Go to `…/albums/album-neon-after-hours`
2. Open **Album DNA** / Creative DNA / direction fields
3. Slowly scroll: setting → emotion → trigger → truth → tone

### D. DNA & Remix (optional 15s B-roll)

1. From track editor → **DNA & REMIX** (Generation Workstation)
2. Paste seed lyrics (Part 2)
3. Run extraction → show strain cards
4. ⚡ inject one strain OR Save DNA Profile (Pro)

### E. Performance Mode

1. From BOOTH LIGHT editor → **Performance Mode** button (or open `/perform` URL)
2. Show full-screen lyrics, 3 seconds max

### F. Vault search

1. Vault home → search box
2. Type `wall` or `granite`
3. Show track/bar hit in results

---

## Part 5 — Recording & post-production

### Capture settings

- **60fps** record → export **30fps**
- **Slow mouse** — 0.5s pause before each click
- One action per beat; no rapid scrolling
- Use **live app** for authenticity; cut to `/marketing/capture/…` for tight zooms

### Post (minimal)

- Cursor highlight on clicks
- **110–115% zoom** on Next Line options and Rhyme Pulse colors
- Max **3 text callouts** for whole video
- End card **3 full seconds**
- Lo-fi beat; cut on snare when line accepts

### Shorts cutdown (60s)

Drop DNA remix section. Keep: Hook → Vault → DNA panel → Next Line → Rhyme Pulse flash → CTA.

### Platform exports

| Platform | Aspect | Length |
|----------|--------|--------|
| YouTube main | 16:9 | 90s–2:30 |
| TikTok / Reels / Shorts | 9:16 | 15–22s clips |
| Pricing page embed | 16:9 | 60s max |

**Signup links:** `https://bar4bar.ink/login?mode=signup&ref=video`

---

## Part 6 — 60-second ad script (condensed VO)

> Stuck on the next bar?  
> Bar 4 Bar is your studio rhyme book — not a one-click song generator.  
> Set Album DNA once. Write bar by bar. Hit Next Line — two options, you pick.  
> Rhyme Pulse shows the scheme. Paste notes, decode strains, stay on theme.  
> Start free — bar4bar.ink — master the next bar.

---

## Related docs

- [YOUTUBE_TUTORIAL_SCRIPT.md](./YOUTUBE_TUTORIAL_SCRIPT.md) — longer paste → structure tutorial
- [MARKETING_QUICKSTART.md](./MARKETING_QUICKSTART.md) — Week 1 posting schedule
- [TIKTOK_STRATEGY.md](./TIKTOK_STRATEGY.md) — content pillars & hooks
