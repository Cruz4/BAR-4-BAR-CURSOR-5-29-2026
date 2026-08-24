# Bar 4 Bar Stronger Version — What Changed

This file is the plain-language record of the stronger-version work added to Bar 4 Bar. The detailed release, deployment, privacy, changed-file, and manual-testing guide is also available at [`docs/BAR4BAR_STRONGER_VERSION_RELEASE.md`](docs/BAR4BAR_STRONGER_VERSION_RELEASE.md).

The original proposed Industry Room item was skipped as requested. No production data was deleted or migrated, and no dependency package was added.

## 1. Real listener insights

- Added signed, expiring First Drop listening proofs.
- Added server-verified 25%, 50%, 80%, and 100% playback milestones.
- A listener becomes qualified at 80% of the available preview or full stream.
- The creator’s own playback and same-day repeated qualification are excluded.
- Added private Listener Insights showing qualified listeners, repeat listeners, completions, buyer conversions, sources, timeline, and per-track performance.
- Existing First Drop preview/full starts and sale records are merged at read time, so prior activity appears without a production-data migration. Historical starts remain labeled separately because they cannot prove an 80% listen retroactively.
- Failed browser milestone reports now retry instead of being permanently suppressed, and source attribution increments once when a listen qualifies.
- Listener identities are stored as opaque hashes rather than exposed user IDs or IP addresses.

Where to use it: open **Listener Insights** from the profile/navigation menu or go to `/insights`.

## 2. Music Fan and broader profile identities

- Public identity is now separate from the internal security role used by the app.
- Users may identify as Artist, Songwriter, Producer, Engineer, DJ, or Music Fan.
- Up to three public identity labels can be selected.
- Added public genres, moods, influences, region, collaboration status, and current focus.
- Added phone, iPad, and desktop profile previews to catch layout problems before saving.

This lets listeners participate publicly without falsely labeling every account as an artist.

## 3. Fans can feature a purchased track

- Creators may feature an owned Library track.
- Music Fans/listeners may feature a First Drop they purchased.
- The profile owner chooses the exact start of the 30-second public excerpt.
- The server creates and privately stores the excerpt.
- A visitor without the track hears the excerpt and receives the buy action.
- The owner or a purchaser receives the full entitled stream after the server rechecks ownership.
- Private storage paths are never included in the public profile response.

## 4. Taste and craft discovery

- Added **For your taste**, **For your craft**, and **New & live** discovery modes.
- Matches use only public profile tags the user chose to share.
- Results explain why they matched, such as genre, mood, influence, region, craft, or collaboration status.
- Private lyrics, private DNA, private listening history, money, Ink balance, Pro status, and sales amounts are not used.

## 5. Follow, Inner Circle, and Support Circle

- Added one-way Follow relationships.
- Added Inner Circle for stronger supporter intent.
- Existing reciprocal Friends remain separate and still control collaboration and Msgs behavior.
- Follow/Inner Circle writes are authenticated, checked against blocks, mirrored by the server, and protected from direct client edits.
- Added server-generated follower and Inner Circle notifications.
- Added a notification preference for relationship activity.
- Added `/supporters`, showing people who support the user and people the user supports.
- Music Fan accounts can use the same supporter tools as creator accounts.

## 6. Transparent Emerging rankings

- Preserved the existing writing-progress leaderboard.
- Added an **Emerging (7d)** tab.
- The score and formula are public and every entry explains why it is rising.
- Inputs include qualified listening, repeat listening, new follows, Inner Circle joins, shared-listen conversions, and unique track buyer conversions.
- Dollar amount, Ink, Pro tier, ads, and sponsorship add no points.
- A live public profile and the existing leaderboard opt-in are required.
- Owner playback/purchases are excluded, and relationship conversions are deduplicated to reduce toggling abuse.

## 7. Safe, versioned Vault backup and restore

- New exports use Bar 4 Bar Studio Vault schema version 2.
- The backup includes export time, counts, albums, tracks, project presets, and Style Profile.
- Existing legacy JSON exports remain accepted.
- Import now previews the exact albums/tracks being added and identifies conflicts before writing.
- Import never removes or overwrites a current project.
- Matching IDs are restored as clearly named imported copies.
- Collision protection is checked again during persistence in case another device created the same ID after preview.
- Imported copies do not reuse live DNA Drop, First Drop, or Collab Sheet IDs.
- A Style Profile is restored only when the destination has none.
- Malformed files, unknown future versions, and files over 50 MB are rejected before import.

## 8. Runtime profile-route correction

An automated build can prove that routes compile without proving that a specific old browser URL reaches the intended page. The reported request showed this exact gap:

```text
GET /api/profile/insights 404
```

The browser was visiting `/profile/insights`, so the dynamic public-profile page interpreted `insights` as a person’s profile slug. The intended page is `/insights`.

The correction:

- `/profile/insights` now redirects to `/insights` before the public-profile client runs.
- `/profile/supporters` redirects to `/supporters` for the same compatibility reason.
- `insights` and `supporters` are reserved and can no longer be assigned as profile slugs.
- The profile identity verification now checks these redirects and reserved names.
- The exact `/profile/insights` HTTP path is tested locally after the production build.

## Security and fairness boundaries

- Firestore blocks direct client access to listening evidence, creator insights, audience hashes, relationship graph records, and Emerging inputs.
- Storage blocks public reads of profile preview files; the entitlement API streams them.
- The server validates featured-track ownership or purchase.
- Discovery does not inspect private creative work.
- Emerging placement cannot be purchased through higher prices, Ink, Pro, ads, or sponsorship.
- Vault restore is merge-only and non-destructive.

## What the automated checks cover

- TypeScript correctness across the project.
- Next.js production compilation and route generation.
- Existing bar-unit, lyric-analysis, and Love-reward behavior.
- Discovery fairness and public-tag-only matching.
- Public identity normalization and reserved app routes.
- Featured-track ownership/preview constraints.
- Follow and Inner Circle state transitions and server-only notifications.
- Emerging score weights and no-pay-to-rank inputs.
- Vault version compatibility and collision-copy safety.

## What still needs real-device/manual testing

- Actual touch behavior on physical iPhones/iPads.
- Real audio playback through multiple browsers and device sleep/interruption states.
- Stripe test purchases and Connect webhook delivery.
- Firebase production-rule deployment against the live project.
- Push notification delivery through real device permissions.

Passing typecheck/build is necessary, but it is not the same as exercising every browser interaction. The release guide contains the complete manual test list.

## Git clarification

A commit exists first in the local repository. GitHub will not display it until that local `main` is pushed to `origin/main`. The stronger-version work was initially committed locally but not pushed, which is why it was not visible on GitHub. This correction, the full feature history, and both Markdown guides are pushed together to GitHub `main` as one verified release history.
