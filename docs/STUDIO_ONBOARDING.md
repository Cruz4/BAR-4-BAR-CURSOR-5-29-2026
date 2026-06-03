# Studio Onboarding — Tips, Tour & What's New

This document describes how Bar 4 Bar teaches new systems to artists in-app. Source of truth for tip copy lives in `src/components/studio-tips.tsx`.

## Guided tour (lyrics page)

- **Definition:** `src/lib/studio-onboarding.ts` → `LYRICS_PAGE_TOUR_STEPS`
- **UI:** `src/components/studio-guided-tour.tsx`
- **Trigger:** First track open when `lyricsTutorialCompletedAt` is unset (~1.2s delay)
- **Replay:** Studio Manual (`?` header) → **Replay Guided Tour**
- **Completion:** Sets `lyricsTutorialCompletedAt` on the user doc; non-skip awards `tour_complete` gamification event

### Tour steps (9)

| Step | Target | Topic |
|------|--------|--------|
| paste | `[data-tour="smart-structure"]` | Smart Structure paste |
| sheet | `[data-tour="lyrics-sheet"]` | Rhyme book (2 lines = 1 rhyme bar) |
| bar-workstation | `[data-tour="bar-workstation"]` | Generate next/previous line |
| rhyme-pulse | `[data-tour="rhyme-pulse"]` | Phonetic scan |
| generation | `[data-tour="generation-workstation"]` | Full draft / DNA & REMIX |
| dna | `[data-tour="dna-suite"]` | Creative DNA + vault inject/load |
| dna-drop | `[data-tour="dna-drop"]` | Pro shareable project links |
| ink | `[data-tour="ink-balance"]` | Residency vs permanent Ink |
| save | `[data-tour="track-status"]` | Save, export, cloud sync |

## Studio Insights & Did You Knows

- **Component:** `src/components/studio-tips.tsx`
- **Pool size:** 45 tips (ids 1–32 legacy + 33–46 added May 2026)
- **Labels:** `Studio Insight` (default) or `Did You Know?` when `kind: 'did-you-know'`
- **When shown:** One random tip per lyrics-page visit, 3s after load, **after** guided tour complete
- **Session guard:** `sessionStorage` key `b4b_studio_tip_shown:{pathname}`

### New tips (May 2026, ids 33–46)

| ID | Title | Kind |
|----|--------|------|
| 33 | Rhyme Bar Math | Did You Know |
| 34 | DNA Drop | Insight |
| 35 | ⚡ Inject vs ↻ Load | Did You Know |
| 36 | Creative Syncing | Insight |
| 37 | DNA Extraction | Did You Know |
| 38 | Hub Insights Tab | Insight |
| 39 | Special Instructions | Did You Know |
| 40 | Studio Ranks | Insight |
| 41 | Vibe Vault | Did You Know |
| 42 | 20-Level Undo | Insight |
| 43 | Leaderboard & Profile | Did You Know |
| 44 | Cover Art for Drops | Insight |
| 45 | Weekly vs Monthly | Did You Know |
| 46 | Vault Import | Insight |

## Studio visibility intro

- **Component:** `src/components/studio-privacy-intro-dialog.tsx`
- **When shown:** Once per account (until saved), after the guided tour finishes or on first visit to The Vault (`/`)
- **Completion:** Sets `studioPrivacyIntroCompletedAt` on the user doc when the artist taps **Save preferences**
- **Remind me later:** Snoozes for the current browser session only
- **Controls:** Hide from leaderboard · Public profile page (same toggles as Settings → Studio Profile)

The 9-step lyrics tour stays focused on workflow; visibility is explained in this separate dialog instead of adding a tour step.

## What's New dialog

- **Version key:** `src/lib/whats-new-session.ts` → `WHATS_NEW_VERSION` (currently `0.5.0`)
- **When shown:** Once per login on `/` (home vault)
- **Content:** `src/components/whats-new-dialog.tsx`

Bump `WHATS_NEW_VERSION` when shipping user-visible onboarding or feature notes so returning artists see the dialog again on next login.

## Spatial Manual (in-app docs)

- **Component:** `src/components/how-to-use-dialog.tsx`
- **Tabs:** Start Here, Studio Tiers, ∞ Loop, Precision Tools, Workstation Map, Studio FAQ
- **FAQ** covers vault locations, inject vs load, rhyme bars, DNA Drop, Creative Sync vs Extraction, and challenge cadence

## Adding a new tip

1. Add an entry to `STUDIO_TIPS` in `studio-tips.tsx` with a unique `id`.
2. Optionally set `kind: 'did-you-know'` for trivia-style cards.
3. Import any new Lucide icon at the top of the file.
4. Document the topic in this file and add an FAQ row if it needs long-form explanation.

## Adding a tour step

1. Add `data-tour="your-id"` on the target element.
2. Append a step to `LYRICS_PAGE_TOUR_STEPS`.
3. Extend `handleTourBeforeStep` in `track-editor.tsx` if the step requires opening a panel/tab.
