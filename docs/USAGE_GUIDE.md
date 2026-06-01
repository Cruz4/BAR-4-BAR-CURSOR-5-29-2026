# How to Track Your AI Usage & Ink

## 1. Monitoring Your Balance
Your Ink balance is displayed in the header and on the **Usage & Billing** page. Pro members receive a monthly residency Ink refill (1,100 monthly · 2,500 yearly).

## 2. Rhyme Bars vs Sheet Lines
- **Sheet line:** One row on the lyrics page. AI generation (Next/Previous) works one line at a time.
- **Rhyme bar:** Two non-empty sheet lines = one rhyme bar (a couplet).
- **Progress & challenges:** Weekly goals, monthly challenges, achievements, and leaderboard stats count **rhyme bars**, not raw line count.
- **Example:** Writing 16 lines completes an 8-bar weekly goal, not a 16-bar goal.

See `src/lib/lyrics-units.ts` for conversion helpers (`linesToRhymeBars`, `rhymeBarsToLines`).

## 3. Cloud Sync vs. Local Storage
- **Local Storage (Free)**: All data is saved in your browser. It is free but limited to one machine. If you clear your browser cache, you may lose your work (use "Vault Export" for backups).
- **Cloud Sync (Pro)**: Data is synced to Google Cloud Firestore. This allows you to log in from any workstation and see your work automatically. It also provides an extra layer of real-time security.

## 4. Calculating Cloud Costs
For transparency, your subscription covers the overhead of real-time syncing and hosting. Every sync operation is optimized to be efficient. 
- **Writes**: Occur when you edit a line or update an album (Pro Only).
- **Reads**: Occur when you open the app or switch albums on a new workstation (Pro Only).
- **Storage**: Pro users have their lyrics saved in a high-security cloud environment.

## 5. Cost Reference Table

| Category | Action | Ink Cost | Pro Monthly capacity (1,100 Ink) |
| :--- | :--- | :--- | :--- |
| **Generation** | Full Studio Draft | 2 per bar | ~550 bars |
| | Next/Previous Line | 10 | ~110 lines |
| **Analysis** | Rhyme Pulse | 20 | ~55 scans |
| | Style Training | 30 | ~36 sessions |
| **Inspiration** | Analyze Vibe | 20 | ~55 vibes |
| | Generate Scene | 25 | ~44 scenes |
| **Effects** | Creative Effect (each) | 10 | ~110 runs |
| **Utility** | Smart Structure | 8 | ~137 pastes |
| | Cloud Sync | Included in Pro ($7.77/mo) | Unlimited |

## 6. Onboarding surfaces

| Surface | Location | Purpose |
|---------|----------|---------|
| Guided tour | First track open | 9-step spotlight walkthrough |
| Studio Insights / Did You Knows | Lyrics page (post-tour) | 45+ rotating tips |
| What's New | Home vault (once/login) | Version upgrade notes |
| Spatial Manual | Header `?` | Full FAQ and panel map |

Details: [STUDIO_ONBOARDING.md](./STUDIO_ONBOARDING.md)
