# AKAsheet Discord Tutorial Server Blueprint

The cleanest Discord structure is a tutorial-first server organized around the app’s actual pages. This avoids creating a separate room for every button while still covering everything on your paper.

## Recommended Discord layout

```text
00 — START HERE
├─ #welcome
├─ #rules
├─ #official-links
├─ #announcements
└─ #changelog

01 — WATCH & LEARN
├─ #tutorial-index
├─ #phone-tutorials
├─ #pc-tutorials
└─ #app-map-and-screenshots

02 — THE SCENE & ARTIST HOME
├─ #scene-walkthrough
├─ #artist-home-customization
└─ #progress-achievements-leaderboard

03 — THE VAULT & WORKSTATION
├─ #vault-walkthrough
├─ #workstation-map
├─ #cowriter-and-pro-tools
└─ #generation-and-remix

04 — SHARE, PERFORM & COLLAB
├─ #dna-drops-and-imports
├─ #performance-and-export
└─ #collab-sheet

05 — SELL YOUR MUSIC
├─ #press-a-song
├─ #first-drop-library
└─ #earnings-and-stripe-payouts

06 — ACCOUNT & SUPPORT
├─ #ink-tiers-and-billing
├─ #settings-and-account
├─ #studio-help
├─ #bug-reports
└─ #feature-ideas

07 — COMMUNITY
├─ #introductions
├─ #general
├─ #share-your-bars
├─ #wins
└─ 🔊 open-mic-live
```

Use Discord Forum channels for the tutorial rooms. Each tutorial becomes its own searchable post instead of getting buried in one long text channel.

## 00 — Start Here

### `#welcome`

Explain what AKAsheet is:

> AKAsheet is an AI-assisted lyric and songwriting workstation. It helps artists write, organize, remix, analyze, share, perform, collaborate, and sell their work. It is not a one-click finished-song generator.

Give new users a short path:

1. Create an account.
2. Enter The Scene.
3. Open The Vault.
4. Create or open a track.
5. Write or paste lyrics.
6. Try Generate Next or the Generation Workstation.

### `#official-links`

Pin these:

- App: `https://akasheet.com`
- Sign up: `https://akasheet.com/login?mode=signup`
- Free writing sheet: `https://akasheet.com/try`
- Pricing: `https://akasheet.com/pricing`
- Support: `akasheet.support@gmail.com`
- Privacy, Terms, and other official links

This covers the “links to sign up and landing-page content” item from the paper.

### `#announcements` and `#changelog`

Keep both read-only.

- Announcements: major news, events, maintenance, merch, challenges.
- Changelog: new app features and fixes matching the in-app “What’s New.”

## 01 — Watch & Learn

### `#tutorial-index`

A master directory linking to every tutorial post. Organize it as:

- Getting started
- Scene and profile
- Vault and workstation
- Generation and remixing
- Sharing and collaboration
- Selling music
- Settings and billing

### `#phone-tutorials`

Use a Media or Forum channel. Create posts for:

- iPhone: Safari → Share → Add to Home Screen
- Android: Chrome → Install App/Add to Home Screen
- Mobile navigation and profile menu
- Mobile lyric-sheet tabs
- Writing and generating on a phone
- Uploading audio or images from a phone
- Mobile Performance Mode
- Phone troubleshooting

### `#pc-tutorials`

Create posts for:

- Desktop signup and navigation
- The three-panel lyric workstation
- Keyboard editing and undo
- Vault search, filters, import, and export
- Uploading files
- Desktop Performance Mode
- Desktop billing and Stripe screens

### `#app-map-and-screenshots`

Use this as the visual manual:

- Labeled screenshots of every major page
- “Where do I find this?” diagrams
- Phone versus desktop comparisons
- Screenshots from the in-app Studio Manual
- Arrows pointing to the Vault icon, Activity, Msgs, Ink, profile menu, and help icon

Do not dump screenshots without labels. Each image should show:

1. Page name
2. Button being explained
3. What happens after pressing it
4. Whether it requires Pro or Ink
5. Link to the full tutorial

## 02 — The Scene & Artist Home

### `#scene-walkthrough` `[SN]`

Everything on the signed-in home belongs here:

- Your Booth
- Posting to your wall
- The Block/friends feed
- Discover the Scene
- Live DNA Drops and First Drops
- Weekly prompts and House Bar
- Find Artists
- Scene dock shortcuts
- Activity notifications
- Msgs
- Your Circle/friends
- Scene weather and visual background

### `#artist-home-customization` `[VA]`

This covers Profile Home and Edit Public Page/Press Desk:

- Turning Artist Home public or private
- Hero photo, collage, initials, and Artist Star
- The Pressing colors, texture, motion, and depth
- Tagline, bio, contact, and outside links
- Now Playing
- Bar of the Week
- Living DNA
- Rhyme Fingerprint
- The Board
- Finish This Bar
- Live Drops
- Module Deck: enable, disable, resize, and reorder
- Sharing the public profile

Artist Home is free; it should not be presented as a Pro-only feature.

### `#progress-achievements-leaderboard` `[SN, SH]`

These belong together because they are managed through Studio Progress:

- Studio standing and rank
- XP and streaks
- Achievements/trophies
- Weekly, monthly, and lifetime goals
- Handwritten bars this week
- Longest active streak
- Tracks completed
- Leaderboard visibility
- Public profile visibility
- Sharing achievement and standing cards

Important wording: progress counts rhyme bars, where two non-empty sheet lines equal one rhyme bar.

## 03 — The Vault & Workstation

### `#vault-walkthrough` `[VA]`

Cover:

- Albums as vinyl records
- Loose tracks/Idea Vault as cassettes
- Creating an album or track
- Opening album and track pages
- Search, sort, and filters
- Cover art
- Album DNA
- DNA, Vibe, and Style preset storage
- Collab Sheets section
- Visitor project limits
- Vault JSON export and import
- Clearing the Vault, with a strong backup warning

### `#workstation-map`

Explain the lyric page as three areas:

- Left panel: Generation Workstation, Track Status, structure, Vibe Suggester, Scene Gen
- Center: lyric sheet, Smart Structure, Rhyme Pulse, Next/Previous, Bar Workstation
- Right panel: Co-Writer controls, effects, Scratch Pad, Takes, Draft Chest

This should be the first workstation tutorial users watch.

### `#cowriter-and-pro-tools` `[SH, SN]`

“Pro Tools” is not a separate page in the current app. It should be explained as advanced tools inside the track workstation.

Create individual forum posts for:

- DNA Suite: world, emotion, trigger, message, and tone
- Track Vibe: genre, BPM, feeling, and instrumentation
- Intents and Precision Lock
- Guardrails
- Style DNA and Style Training
- Creative Effects
- Scratch Pad
- Sheet Takes
- Draft Chest
- Freestyle Pad
- Vibe Suggester
- Smart Structure
- Rhyme Pulse

Creative Effects should remain inside this room rather than creating nine separate Discord rooms.

### `#generation-and-remix` `[SH]`

This room should contain four main tutorials.

1. **Full Studio Draft**

   Generation Workstation → Full Studio Draft → Calibration Hub → choose structure and rules → generate → review output → append or replace lyrics.

2. **Paste Lyrics → DNA & REMIX**

   Paste or Sync Current Lyrics → extract → Analysis Step → save the entire profile or inject individual strains → choose Remix Paths → Calibration Hub → synthesize.

3. **Outputs, Presets, and Saves**

   Explain:

   - Append versus Replace
   - Approval output/history
   - Unused outputs going to Draft Chest
   - System presets versus custom Pro saves
   - Full DNA profile loading versus individual ⚡ strain injection
   - DNA, Vibe, and Style Vault folder buttons

4. **Generate Full, Then Remix**

   Generate a Studio Draft → apply it to the sheet → reopen DNA & REMIX → Sync Current Lyrics → extract the new draft → choose paths and recalibrate → synthesize the remix.

This directly combines the two related workflows from the paper without treating them as separate app pages.

## 04 — Share, Perform & Collab

These features all start in the lyric page’s Left Panel → Track Status, but they deserve separate Discord guides because they do different jobs.

### `#dna-drops-and-imports` `[SH]`

Explain:

- DNA Drop is a lyric/project snapshot, not the music-selling screen
- Publishing a track or album DNA Drop
- Copying and sharing the link
- Updating the snapshot after editing
- Taking a Drop offline
- Import Setup/Load into the Vault
- Full-profile load versus individual strain injection
- What information is included
- DNA Drops are not automatically live-synced

### `#performance-and-export` `[SH]`

Explain:

- Where Performance Mode is located
- Full-screen teleprompter
- Rhyme focus
- Rehearsal and stage use
- Phone versus desktop
- Exporting a track
- Exporting and backing up the Vault

### `#collab-sheet` `[SH]`

Explain:

- Starting a Collab Sheet
- Inviting friends
- Live presence
- Real-time editing
- In-sheet chat
- Owner permissions
- Revoking access
- Finding shared sheets in the Vault
- Difference between Collab Sheet and DNA Drop

Use this sentence prominently:

> DNA Drop is a snapshot someone imports. Collab Sheet is everyone writing in the same live room.

## 05 — Sell Your Music

### `#press-a-song` `[SH, SN]`

Show the complete workflow:

1. The Scene → Press a Song, or Track Status → Press a Song.
2. Choose a Vault track.
3. Upload finished audio.
4. Choose fixed price or pay-what-you-want.
5. Review the artist share.
6. Press the release live.
7. Confirm it appears on Artist Home, The Scene, and the public share page.

Keep repeating that Press a Song sells audio; DNA Drop shares lyrics and project DNA.

### `#first-drop-library`

Explain the fan side:

- 30-second preview
- Buying once with money, not Ink
- Streaming the unlocked song inside AKAsheet
- Opening purchased First Drops in Library
- Library is not a download store or Spotify listing

### `#earnings-and-stripe-payouts`

Explain seller Stripe Connect:

- Connecting identity and bank information
- Held versus sent-to-Stripe sales
- Gross sales, fees, artist net, buyers, songs, and timestamps
- Sending held sales after onboarding
- Stripe’s bank payout schedule
- Never posting banking or identity information in Discord

## 06 — Account & Support

### `#ink-tiers-and-billing`

Explain:

- Residency Ink
- Permanent/purchased Ink
- Visitor versus Studio Pro
- Ink Store
- Usage History
- Monthly and yearly membership
- Stripe customer portal
- Updating payment methods, invoices, cancellation, and subscription management

Keep this separate from seller payouts. Subscription Stripe and First Drop payout Stripe are two different workflows.

### `#settings-and-account`

Cover the actual Settings page:

- Add to Home Screen
- Studio theme
- Notification settings
- Signed-in devices
- Stage name
- First Drop payout shortcut
- Account deletion
- Where to report an issue

### `#studio-help`

Make this a Forum channel with tags:

- Phone
- PC
- Scene
- Vault
- Workstation
- DNA/Remix
- First Drops
- Stripe
- Settings

### `#bug-reports`

Require:

- Device
- Browser
- Page
- Steps to reproduce
- Expected result
- Actual result
- Screenshot or screen recording
- Never include passwords, card information, bank details, or private lyrics unnecessarily

## Community rooms

The tutorial library explains the app; these rooms make the Discord feel alive:

- `#introductions`: artist name, genre, and current project
- `#general`: normal conversation
- `#share-your-bars`: WIP lyrics and feedback
- `#wins`: finished tracks, achievements, streaks, sales, and releases
- `🔊 open-mic-live`: optional listening or writing sessions

## Items to hold for later

### Merch

The current app does not have a live Merch section. Reserve `#merch-announcements`, but do not expose it until there is an actual store, ordering process, or release date.

### Discord bot

There is no finished Discord bot in the current app. Initially, the bot should only handle safe Discord tasks:

- Welcome messages
- Rules acknowledgment
- Tutorial search
- Support routing
- Announcement notifications
- Optional role assignment

Do not let an early bot read Ink, change subscriptions, issue refunds, or access Stripe. Those require secure account verification and backend work.

### Mentioning Discord inside the app

The app currently does not contain an official Discord link or Discord Artist Home provider. When the invite is ready, the best placements are:

- Landing-page footer
- Login/support footer
- Usage → Settings
- In-app Studio Manual
- Official AKAsheet support Artist Home
- “What’s New” announcement

Adding Discord as a selectable Artist Home social provider would be a separate app change.

## Your handwritten production tags

I would preserve your tags as assignments rather than Discord categories:

- `[VA]`: Artist Home customization and Vault walkthrough
- `[SN]`: Scene walkthrough and Pro Tools
- `[SH]`: Co-Writer, Generation/Remix, DNA Drop, Performance, and Collab Sheet
- `[SN, SH]`: Achievements/leaderboard and selling music

That gives you a clean production schedule while the Discord itself stays organized around where features live in the app.
