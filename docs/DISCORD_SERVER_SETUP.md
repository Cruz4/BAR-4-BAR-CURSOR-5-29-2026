# Bar 4 Bar Discord — paste-ready setup

**Server name:** Bar 4 Bar Studio  
**Tagline / description:** Your album brain — bars, DNA, vault. Lyric workstation for [bar4bar.ink](https://bar4bar.ink) (not a song renderer).

Use this as a checklist while creating categories, channels, and roles in Discord.

---

## Roles

Create in this order (bottom → top in Discord’s role list):

| Role | Color suggestion | Hoist | Permissions notes |
|------|------------------|-------|-------------------|
| Visitor | muted gray | no | default @everyone is fine; rename display if you want |
| Pro | studio orange / emerald | yes | access to Pro Lounge |
| Mod | amber | yes | Manage Messages, Kick, Timeout |
| Studio Ops | white / brand | yes | Admin (you only) |

Optional later: **Pro Yearly** (badge only), **Artist** (regular shippers).

---

## Categories & channels

Copy **Topic** into each channel’s topic field.  
`#` = text · `🔊` = voice (optional).

### Category: START HERE

| Channel | Topic |
|---------|--------|
| `#welcome` | Welcome to Bar 4 Bar Studio — lyric & rhyme workstation at https://bar4bar.ink · Read #rules · Start in #start-here |
| `#rules` | Own your bars. Credit DNA Drops. No stealing vaults. No billing drama in public — use #ink-and-billing. Respect the craft. |
| `#announcements` | Official ship notes, Ink & Pro updates. Read-only for members. |
| `#changelog` | What’s new in the studio — mirrors in-app What’s New. |
| `#start-here` | 5 steps: 1) Sign up at bar4bar.ink 2) Claim welcome Ink 3) Create a track 4) Try DNA & REMIX 5) Go Pro when you need vault / Freestyle / DNA Drop |

**Permissions:** `#announcements` + `#changelog` → @everyone View + Read; only Studio Ops / Mod can Send.

---

### Category: THE VAULT

| Channel | Topic |
|---------|--------|
| `#introductions` | Who are you writing for? Name · scene · what you’re building in the vault. |
| `#wins` | Finished tracks · Performance Mode nights · badge unlocks · Studio Progress flex. |
| `#general` | Hangout — keep craft talk in Workstation rooms when it runs long. |

---

### Category: THE WORKSTATION

| Channel | Topic |
|---------|--------|
| `#bars-and-schemes` | Couplets · End With · Rhyme Pulse · scheme talk (AABB, multisyllabic, etc.). |
| `#dna-and-remix` | Extraction · strains · Calibration Hub · Style DNA · ⚡ inject vs full vault load. |
| `#vibe-and-structure` | Track Vibe · BPM/genre · sections · export notes for Suno/Udio (words stay yours). |
| `#creative-effects` | Lyrical tools — flips, effects, “how I used this on a bar.” |
| `#freestyle-pad` | Freestyle / studio pickup tips. Feature is Pro — questions welcome from everyone. |

---

### Category: DNA DROPS

| Channel | Topic |
|---------|--------|
| `#dna-drops` | Drop a DNA Drop link + 1-line pitch. Snapshot ≠ live sync — Update snapshot after edits. Credit the writer. |
| `#drop-feedback` | Critique structure / vibe / DNA — not “rewrite my song for free.” |
| `#writers-relay` | Pass-the-bar collabs · Relay energy · leave the next writer a clear handoff. |

**Pinned message for `#dna-drops` (paste once):**

```
DNA DROP — HOW TO POST
1. In Bar 4 Bar (Pro): Left panel → DNA Drop → publish
2. Paste the link here + one line: mood / genre / what you want feedback on
3. After you edit the track: DNA Drop → Update snapshot (same URL)
4. To unshare: Take offline
Visitor artists can post their own bars; Pro DNA Drop links get priority feedback.
App: https://bar4bar.ink
```

---

### Category: HELP DESK

| Channel | Topic |
|---------|--------|
| `#studio-help` | “Where is X?” UI / workflow questions. |
| `#ink-and-billing` | Residency vs permanent Ink · Pro Monthly (1,777) / Yearly (3,444) · packs. Never post card details. |
| `#bugs` | Steps to repro · browser/device · screenshot if useful. |
| `#feature-ideas` | Wishlist for the workstation — one idea per message when you can. |

---

### Category: PRO LOUNGE  
*(hide category from @everyone; allow role Pro + Mod + Studio Ops)*

| Channel | Topic |
|---------|--------|
| `#pro-lounge` | Vault saves · export · Performance Mode · Freestyle · unlimited catalog. Pro members only. |
| `#pro-yearly` | Optional — Yearly perks, BYO-API, heavy catalog talk. |

---

### Category: THE STAGE (optional)

| Channel | Topic |
|---------|--------|
| `#open-mic` | Post 2–8 bars for light feedback. Mark [WIP] or [DONE]. |
| `#performance-mode` | Stage / teleprompter tips · /perform workflow. |
| `🔊 open-mic-live` | Optional voice — weekly bar sessions. |

---

### Category: STAFF  
*(private — Mod + Studio Ops only)*

| Channel | Topic |
|---------|--------|
| `#mods` | Mod coordination. |
| `#ops` | Stripe · outages · deploy notes · partner intros. |

---

## @everyone defaults

- Enable: View Channels, Send Messages, Embed Links, Attach Files, Add Reactions, Use External Emojis, Read Message History  
- Disable for announcements/changelog: Send Messages  
- Disable: Mention @everyone (Mods only), Create Invites if you want invite control  

---

## Pro role access

For category **PRO LOUNGE**:

1. Category permissions → deny View Channel for `@everyone`  
2. Allow View + Send for `Pro`, `Mod`, `Studio Ops`  

---

## First messages to pin

### `#welcome`

```
BAR 4 BAR STUDIO
Lyric & rhyme workstation — album brain, not a full-song AI renderer.

→ App: https://bar4bar.ink
→ Pricing / Pro: https://bar4bar.ink/pricing
→ Start: #start-here
→ Rules: #rules

Visitor = full AI on Ink (demo catalog).
Pro = vault saves, Freestyle, Performance Mode, DNA Drop links, unlimited projects.
```

### `#start-here`

```
ONBOARDING (5 STEPS)
1. Create an account at https://bar4bar.ink
2. Verify email → welcome Ink lands
3. Open The Vault → create a track → write a few bars
4. Generation Workstation → DNA & REMIX (extract or load a system preset)
5. When you need custom vault saves, Freestyle, Performance, or DNA Drop → Go Pro

Questions → #studio-help
Ink / billing → #ink-and-billing
Share a Drop → #dna-drops
```

### `#rules`

```
1. Your bars stay yours. Don’t paste someone else’s Drop lyrics as your own.
2. Credit DNA Drops when you remix or feedback off them.
3. No harassment, spam, or scam “Ink refund” DMs.
4. Billing issues → #ink-and-billing (never share card numbers).
5. Keep the room craft-first — we’re a rhyme book & DNA studio, not a Suno clone chat.
```

---

## Weekly rhythm (post in #announcements)

| Day | Prompt |
|-----|--------|
| Monday | **Bar Monday** — drop a couplet in #open-mic |
| Friday | **DNA Friday** — best Drop of the week highlighted |
| After deploy | Short #changelog note (Ink, Freestyle, Pro, etc.) |

---

## Invite & app hook (when ready)

- Create a vanity invite (e.g. never expire, limited uses optional)  
- Later: add link in app footer / Usage → Settings / Studio Tips  

---

## Do not create yet

- Per-effect channels  
- Separate rooms for every album genre  
- Public “support ticket” bots until volume justifies them  

Ship this map first. Expand only when a room stays active for 2+ weeks.
