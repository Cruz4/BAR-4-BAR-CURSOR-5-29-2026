# How to Track Your AI Usage & Ink

## 1. Monitoring Your Balance
Your Ink balance is displayed in the header and on the **Usage & Billing** page.

- **Visitor:** 250 signup Ink + 150 residency Ink per month (pool caps at 400). All Ink-priced AI tools work, including all 9 Creative Effects.
- **Pro Monthly:** 1,777 residency Ink per refill cycle.
- **Pro Yearly:** 3,444 residency Ink per refill cycle.

## 2. Rhyme Bars vs Sheet Lines
- **Sheet line:** One row on the lyrics page. AI generation (Next/Previous) works one line at a time.
- **Rhyme bar:** Two non-empty sheet lines = one rhyme bar (a couplet).
- **Progress & challenges:** Weekly goals, monthly challenges, achievements, and leaderboard stats count **rhyme bars**, not raw line count.

See `src/lib/lyrics-units.ts` for conversion helpers.

## 3. Cloud Sync
Signed-in artists sync to Firestore. Visitors get the full AI workstation on Ink (system DNA presets only), plus Artist Home and The Block. Pro unlocks unlimited albums/tracks, custom DNA/Vibe/Style saves, Performance Mode, Freestyle, vault import/export, and DNA Drop share links. New signups receive a 3-day Pro trial with workflow access and 400 bonus Ink.

## 4. Cost Reference Table

| Category | Action | Ink Cost | Pro Monthly (~1,777 Ink) |
| :--- | :--- | :--- | :--- |
| **Generation** | Full Studio Draft | 2 per bar | ~750 bars |
| | Next/Previous Line | 10 | ~150 lines |
| **Analysis** | Rhyme Pulse | 10 | ~150 scans |
| | Style Training | 35 | ~42 sessions |
| **Inspiration** | Analyze Vibe | 20 | ~75 vibes |
| **Effects** | Creative Effect (each) | 10 | ~150 runs |

**Tip:** A typical default song (~52 bars) is about **104 Ink** with Studio Draft in the Calibration Hub. Use Next/Previous for surgical edits—not every bar on a full track.

## 5. Bar 4 Bar vs full-song AI apps
Unlike Suno or Udio, this studio is for **lyrics, rhyme books, and DNA strains**—not finished audio. Ink powers drafting and analysis.

## 6. Onboarding surfaces

| Surface | Location |
|---------|----------|
| Studio Insights | Lyrics page |
| What's New | Home vault |
| Spatial Manual | Header `?` |
| Usage tips | Usage & Billing header |

Details: [STUDIO_ONBOARDING.md](./STUDIO_ONBOARDING.md)
