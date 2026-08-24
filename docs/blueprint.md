# **App Name**: LyricAI Studio

## Core Features:

- Concept Capture: Capture the album's concept, theme, and key messages.
- Track Vibe Setting: Set the vibe (genre, tempo, feeling) for each track to guide lyric generation.
- Bar-for-Bar Generation: Generate lyrics line-by-line, allowing users to accept, edit, or regenerate suggestions; this tool uses the vibe, active intents, styleProfile, and rhyme mode for lyric creation.
- Style Learning: Implement a simple style learning system based on accepted lyrics to adapt future generations; capture common end-rhyme phonemes, average syllables per bar, frequent n-grams/phrases, and preferred flows.
- Title Suggestion: Suggest track titles by summarizing section key phrases and the album theme using AI.
- Lyric Editor: Provide an editor for writing and editing lyrics.
- Version History: Maintain a version history per section of lyrics for easy undo/redo.

## Style Guidelines:

- Primary color: Deep violet (#9400D3) for a creative, sophisticated vibe.
- Background color: Dark navy blue (#191970) for contrast and to highlight content.
- Accent color: Bright purple (#D020D8) to draw attention to CTAs and interactive elements.
- Headline font: 'Playfair', a serif, for an elegant, fashionable feel
- Body font: 'PT Sans', a sans-serif, because longer text is anticipated
- Use clean, modern icons to represent various functions (e.g., generate, save, edit).
- Divide the Track Workspace into clear sections: lyric sections (left), editor (center), vibe and intent picker (right), AI controls (bottom).

## Current Product Blueprint — August 2026

The original notes above describe the workstation foundation. The current product is **Bar 4 Bar (BA)**: an AI-assisted songwriting workstation and music network, not a full-song generator.

### Product system

- **The Scene:** signed-in home with the friends feed, Your Booth, public challenges, explainable Discover, live First Drops, and transparent Emerging momentum.
- **The Vault:** albums, loose tracks, the bar-by-bar workstation, Creative DNA, Style DNA, Track Vibe, Collab Sheets, private takes, search, and versioned backup/restore.
- **Public music homes:** free, private by default, and usable by artists, songwriters, producers, engineers, DJs, and Music Fans. Users choose up to three public identity labels plus public taste, region, collaboration status, and current focus.
- **Featured Library track:** a profile may feature a First Drop the user released or purchased. The owner chooses a 30-second public excerpt; full playback remains entitlement-controlled.
- **First Drops:** direct-to-fan, buy-once in-app music streams with fixed or pay-what-you-want pricing, tiered platform fees, Stripe payouts, Library playback, and creator Earnings details.
- **Relationships:** Follow and Inner Circle are one-way support; Friends remain reciprocal and control collaboration and Msgs.
- **Discovery and momentum:** Taste/Craft matching uses only public user-selected identity data and explains each match. Emerging (7d) publishes its formula, inputs, score, and reasons; money, Ink, Pro, ads, and sponsorship cannot purchase points.
- **Listener Insights:** creator-only historical First Drop starts and sales plus verified qualified listening, repeats, completion, conversion, source, timeline, and track summaries. Historical starts are never misrepresented as 80%-qualified listens. Raw listener identities and private listening histories are not exposed.
- **Portable studio:** Studio Vault version 2 exports projects and embedded presets. Import previews and merges collision-safe copies without deleting or overwriting current work.

### Trust and data boundaries

- Firebase Authentication, Firestore rules, Storage rules, server-only relationship/listening evidence, and signed media tickets remain authoritative.
- Public discovery never reads private lyrics, DNA, Ink balance, subscription tier, or sales totals.
- Stripe, the Ink economy, Firebase document shapes, and production data are preserved unless an explicitly approved migration says otherwise.
- First Drop masters and profile excerpts stay private in Storage and stream through entitlement-aware APIs.

### Canonical routes

| Surface | Route |
|---|---|
| The Scene / guest Pressing | `/` |
| The Vault | `/vault` |
| Public music home | `/{slug}` (`/profile/{slug}` permanently redirects) |
| Edit Public Page | `/profile/customize` |
| Discover | `/discover` |
| Support Circle | `/supporters` |
| Listener Insights | `/insights` |
| Leaderboard + Emerging | `/leaderboard` |
| First Drop Library | `/library` |
| Earnings | `/earnings` |
| Guest writing demo | `/try` |

The detailed implementation and release boundaries live in [`BAR4BAR_STRONGER_VERSION_RELEASE.md`](./BAR4BAR_STRONGER_VERSION_RELEASE.md).
