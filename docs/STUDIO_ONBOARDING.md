# Studio Onboarding — Tips, Tour & What's New

This document describes how Bar 4 Bar teaches new systems to artists in-app. Source of truth for tip copy lives in `src/components/studio-tips.tsx`.

## Signed-in home = The Scene (Aug 2026 pivot)

- Signing in lands on **The Scene** (`/`) — friends feed + Discover stream + Your Booth + nav dock. The Vault moved to **`/vault`**.
- Kill switch: `SCENE_HOME_ENABLED` in `src/lib/scene-home.ts` — set `false` to restore the Vault at `/` (`/vault` then redirects home, `/feed` works again).
- Onboarding order: Scene tour (first home visit) → visibility intro → Vault tour (first `/vault` visit) → workstation tour (first track open).
- **Logged-out `/`** is the Pressing playground (not Scene). See [GUEST_TRY_SHEET.md](./GUEST_TRY_SHEET.md). New accounts may get Neomaiya Sol as first friend + guestbook welcome (usage-init).

## Guided tour (Scene home)

- **Definition:** `src/lib/studio-onboarding.ts` → `SCENE_HOME_TOUR_STEPS` (6 steps: welcome, composer, booth, feed + discover, progress, nav dock → "the Vault is where you write")
- **UI:** mounted in `src/components/scene/scene-home.tsx`
- **Trigger:** First Scene visit when `sceneTutorialCompletedAt` is unset (after feed paint, ~1s delay)
- **Replay:** Studio Manual (`?` header) → **Replay Scene Tour**
- **Completion:** Sets `sceneTutorialCompletedAt`; non-skip awards `tour_complete`; queues the visibility intro

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
- **Pool size:** 84 uniquely numbered tips (legacy workflow, Scene/social, First Drops, public identity, discovery, support, insights, Emerging, and backup safety)
- **Labels:** `Studio Insight` (default) or `Did You Know?` when `kind: 'did-you-know'`
- **When shown:** On a track sheet revisit (2nd+ visit this session), 3s after load, **after** guided tour complete — one tip per sheet path per session
- **Session guard:** `sessionStorage` key `b4b_studio_tip_shown:{pathname}`
- **Opt-out:** Card toggle → `localStorage` `b4b_show_tips=false`

### May 2026 tips (ids 33–46)

| ID | Title | Kind |
|----|--------|------|
| 33 | Written vs Generated | Did You Know |
| 34 | DNA Drop | Insight |
| 35 | ⚡ Inject vs ↻ Load | Did You Know |
| 36 | Creative Syncing | Insight |
| 37 | Analysis Step | Did You Know |
| 38 | Hub Insights Tab | Insight |
| 39 | Save Ink on Drafts | Did You Know |
| 40 | Lyrics vs Full Songs | Did You Know |
| 6 | Special Instructions | Did You Know |
| 47 | Studio Ranks | Insight |
| 41 | Vibe Vault | Did You Know |
| 42 | 20-Level Undo | Insight |
| 43 | Leaderboard & Profile | Did You Know |
| 44 | Cover Art for Drops | Insight |
| 45 | Weekly vs Monthly | Did You Know |
| 46 | Vault Import | Insight |

### Jul 2026 tips (ids 48–58)

| ID | Title | Kind |
|----|--------|------|
| 48 | Foil Badge Preview | Did You Know |
| 49 | Free Badge ≠ Locked | Did You Know |
| 50 | Lyrics Stay Private | Did You Know |
| 51 | Personal Bests | Did You Know |
| 52 | Rhyme Bar Math | Did You Know |
| 53 | Update DNA Drop | Insight |
| 54 | Edit AI → Written | Did You Know |
| 55 | Opt-In Switches | Did You Know |
| 56 | Verify for Welcome | Insight |
| 57 | Vault Sidebar Goals | Insight |
| 58 | Preview Quest | Insight |

### Aug 2026 Scene/social tips (ids 59–76 and 84)

| ID | Title | Kind |
|----|--------|------|
| 59 | The Scene | Insight |
| 60 | Post From Home | Did You Know |
| 61–76 | Scene navigation, sharing, embeds, Activity, public challenges, First Drops, Library, public page, social posts, voice, takes, theme, and reach | Mixed |
| 84 | Activity Opens the Post | Did You Know |

### Stronger-version tips (ids 77–83)

| ID | Title | Kind |
|----|--------|------|
| 77 | Music Fan Belongs Here | Insight |
| 78 | Feature a Library Track | Insight |
| 79 | Discover Explains Why | Did You Know |
| 80 | Three Levels of Connection | Insight |
| 81 | Qualified Listener Insights | Insight |
| 82 | Emerging Cannot Be Bought | Did You Know |
| 83 | Safe Vault Restore | Insight |

## Studio visibility intro

- **Component:** `src/components/studio-privacy-intro-dialog.tsx`
- **When shown:** Once per account (until saved), after the Scene or Vault tour finishes — on The Scene (`/`) or The Vault (`/vault`)
- **Completion:** Sets `studioPrivacyIntroCompletedAt` on the user doc when the artist taps **Save preferences**
- **Remind me later:** Snoozes for the current browser session only
- **Controls:** Show on leaderboard · Public profile page — both off by default (Studio Progress → Sharing & visibility)

The 9-step lyrics tour stays focused on workflow; visibility is explained in this separate dialog instead of adding a tour step.

## What's New dialog

- **Version key:** `src/lib/whats-new-session.ts` → `WHATS_NEW_VERSION` (currently `0.9.0`)
- **When shown:** Once per login on `/` (Scene home) or `/vault`
- **Content:** `src/components/whats-new-dialog.tsx` — public music identity, featured owned/purchased tracks, explainable Discover, Support Circle, Listener Insights, Emerging, and safer Vault restore

Bump `WHATS_NEW_VERSION` when shipping user-visible onboarding or feature notes so returning artists see the dialog again on next login.

## Spatial Manual (in-app docs)

- **Component:** `src/components/how-to-use-dialog.tsx`
- **Tabs:** Start Here, Scene & Profile, Sell Your Music, Studio Tiers, ∞ Loop, Precision Tools, Workstation Map, Studio FAQ
- **Scene & Profile:** searchable explanations and direct links for public identity, featured tracks, Discover, relationship levels, Listener Insights, Emerging, and versioned Vault backup
- **FAQ:** vault locations, inject vs load, rhyme bars, DNA Drop, Creative Sync vs Extraction, challenge cadence, privacy, and First Drop commerce

## Adding a new tip

1. Add an entry to `STUDIO_TIPS` in `studio-tips.tsx` with a unique `id`.
2. Optionally set `kind: 'did-you-know'` for trivia-style cards.
3. Import any new Lucide icon at the top of the file.
4. Document the topic in this file and add an FAQ row if it needs long-form explanation.

## Adding a tour step

1. Add `data-tour="your-id"` on the target element.
2. Append a step to `LYRICS_PAGE_TOUR_STEPS`.
3. Extend `handleTourBeforeStep` in `track-editor.tsx` if the step requires opening a panel/tab.
