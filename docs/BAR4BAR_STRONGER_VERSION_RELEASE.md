# AKAsheet Stronger Version — Release Guide

## Release status

This release is organized into seven independent product commits, one release-audit documentation commit, and one post-audit profile-route correction commit. The requested Industry Room (the original item 6) was intentionally skipped. No package was added, no production document was migrated, and no production data was deleted.

## Post-audit runtime correction

- Legacy `/profile/insights` links now redirect to `/insights` before the public-profile client can request `/api/profile/insights`.
- Legacy `/profile/supporters` links likewise redirect to `/supporters`.
- `insights` and `supporters` are reserved app segments and cannot be claimed as public-profile slugs.
- The profile identity verification covers both compatibility redirects and both reserved names.
- Production HTTP verification confirmed `/profile/insights` returns 308 to `/insights`, `/profile/supporters` returns 308 to `/supporters`, and both destination pages return 200.

## What shipped

### 1. Qualified listener insights

- First Drop playback now issues signed, expiring listen proofs.
- Server wall-clock checks and 25/50/80/100% milestones prevent instant fake completions.
- Owners cannot count their own listening or purchases toward organic momentum.
- Creator-only `/insights` shows qualified listeners, repeat listeners, completions, purchase conversions, sources, timeline, and track summaries.
- Listener identities are opaque HMAC keys. Raw user IDs, IPs, and private listening histories are not exposed in creator analytics.

### 2. Music Fan and broader public identity

- Public identity is separate from the internal account authorization role.
- A profile can choose up to three labels: Artist, Songwriter, Producer, Engineer, DJ, or Music Fan.
- Public sound identity adds genres, moods, influences, region, collaboration status, and current focus.
- Phone, iPad, and desktop previews are available while customizing the profile.

### 3. Featured owned or purchased track

- Creators can feature their own Library track; Music Fans can feature a purchased Library track.
- The profile owner selects the start of a 30-second excerpt.
- A server-derived excerpt is stored privately and streamed through a ticketed API.
- Visitors without entitlement hear the chosen excerpt and see the buy action.
- The owner or an entitled purchaser receives the full master stream, with entitlement rechecked by the server.
- Private preview storage paths are removed from public profile configuration.

### 4. Explainable taste and craft discovery

- Discover includes **For your taste**, **For your craft**, and **New & live** modes.
- Matching uses only public identity tags selected by users.
- Cards say why they match (genre, mood, influence, region, craft, or collaboration status).
- Private lyrics, DNA, raw listening history, money, Ink, subscription status, and sales totals are not ranking inputs.

### 5. Follow, Inner Circle, and Support Circle

- One-way Follow and Inner Circle relationships are separate from reciprocal Friends.
- Friends still control the existing collaboration and Msgs behavior.
- Relationship writes are authenticated, block-aware, mirrored by the server, and denied to direct client writes.
- New follower and Inner Circle notifications are server-only events with a dedicated notification preference.
- `/supporters` shows people supporting the user and people the user supports. Every public identity—including Music Fan—can use it.
- The dashboard links to aggregate Listener Insights without joining private listener hashes to named accounts.

### 6. Transparent Emerging board

- The existing creative-progress leaderboard remains intact and gains an **Emerging (7d)** tab.
- The rolling formula is visible in the UI: qualified listeners, repeat listening, follows, Inner Circle joins, shared-listen conversions, and unique track buyer conversions.
- Every entry shows its score, signal counts, and plain-language reasons.
- A live public profile and the existing leaderboard opt-in are required.
- Dollar amount, Ink, Pro tier, ads, and sponsorship cannot add points.
- Listen owners are excluded, purchase owners are excluded, and follow/Inner Circle conversions are lifetime-deduplicated per supporter.

### 7. Versioned, non-destructive Vault backups

- New exports use the `bar4bar.studio-vault` version 2 envelope with export time, counts, restore mode, albums, tracks, presets embedded in those projects, and Style Profile.
- Legacy raw-array and legacy `{ albums, tracks }` files remain importable.
- Import shows a preview with album/track counts, collision copies, backup version/date, and Style Profile behavior.
- Existing projects are never removed or overwritten by import. ID conflicts become clearly named imported copies, and persistence checks for conflicts again after preview.
- Collision copies do not retain live DNA Drop, First Drop, or Collab Sheet IDs.
- A backed-up Style Profile is restored only when the destination has none; otherwise the current Style Profile remains unchanged.
- Unsupported future versions and malformed or over-50-MB files fail closed.

## Privacy, fairness, and data boundaries

- Firestore rules deny direct client access to listen evidence, creator insights, audience hashes, purchase ticks, Follow/Inner Circle edges, organic relationship ticks, and Emerging inputs.
- Storage rules deny public reads of profile excerpt files; playback goes through the entitlement-aware API.
- No private lyrics or DNA are sent into social discovery.
- No production write migration is required. Existing First Drop starts and sales are merged into Listener Insights at read time; only playback captured with signed milestone proof may enter qualified or Emerging counts.
- This release does not create fan-to-fan resale or transfer ownership. That remains a separate commerce/legal design decision.

## Deployment requirements

1. Set strong production secrets for `DROP_AUDIO_STREAM_SECRET`, `DROP_LISTEN_PROOF_SECRET`, and `DROP_LISTENER_SECRET`. Independent values are preferred; existing stream/invite secrets remain code fallbacks for compatibility.
2. Deploy the application build.
3. Deploy Firestore and Storage rules. The new app APIs rely on the server-only boundaries in both rule files.
4. Do not run a data migration or delete/backfill job; none is needed.
5. Expect historical First Drop starts and sales to appear immediately in Listener Insights. Verified qualification and Emerging signals populate only from signed activity that can prove the listener reached the required threshold.

## Manual release tests

### Identity and profiles

1. On a Music Fan account, select Music Fan plus up to two other public labels, save, reload, and confirm the public profile shows the labels and sound identity.
2. Use phone, iPad portrait/landscape, and desktop preview sizes. Confirm headings, tags, featured player, Follow/Friends actions, and modules stay within the viewport.
3. Turn the profile offline and confirm public posting/relationship behavior remains protected by the existing offline rules.

### Featured track entitlement

1. Purchase a First Drop as a fan, feature it from Library, choose a recognizable 30-second start, save, and reload.
2. Visit signed out or from a non-owner account: confirm only that excerpt plays and the buy action appears.
3. Visit as the profile owner or a purchaser: confirm the full track is available.
4. Try saving an unowned/unpurchased track ID with a modified request and confirm the server rejects it.

### Insights and Emerging

1. Play another user’s preview past 80% in real time; confirm the creator’s qualified count rises once for that listener/day.
2. Replay on the same day and confirm it does not create duplicate qualified-listener points.
3. Play the creator’s own track and confirm it does not add organic momentum.
4. Follow, add to Inner Circle, unfollow, and refollow. Confirm relationship state/notifications work and repeat toggling does not repeatedly award conversion points.
5. Open Leaderboard → Emerging (7d). Confirm the formula, reasons, counts, live-profile requirement, and leaderboard opt-out.

### Discovery and Support Circle

1. Set overlapping public genres/moods on two accounts and confirm Taste/Craft modes provide accurate reasons.
2. Remove public tags and confirm private lyrics/DNA do not create a match.
3. Confirm Follow does not automatically create a Friend, grant collaboration, or open Msgs.
4. Confirm blocks prevent relationship changes and `/supporters` is private to the signed-in owner.

### Vault backup

1. Export and inspect the JSON header for schema version 2 and counts.
2. Import it into the same Vault. Confirm preview reports collisions and imported copies appear without changing originals.
3. Confirm copied projects do not show as the same live DNA Drop, First Drop, or Collab Sheet.
4. Import a legacy raw-array backup and confirm the preview labels it Legacy.
5. Import malformed JSON, an unsupported schema version, and a file over 50 MB; confirm all are rejected before writes.

## Automated verification

Run before deployment:

```text
npm run typecheck
npm run verify:discovery-integrity
npm run verify:profile-identity
npm run verify:featured-profile-track
npm run verify:relationships
npm run verify:emerging-rankings
npm run verify:vault-backups
npm run lint
npm run build
```

Known repository-wide lint and Handlebars/Genkit build warnings predate this release; they are warnings, not failed checks.

## Rollback-safe commit map

- `b00aa37` — qualified listener insights foundation
- `930952d` — Music Fan identities and responsive profile previews
- `cccf225` — secure featured Library tracks
- `2263d8e` — explainable taste and craft discovery
- `607069a` — follows and Support Circle
- `4d9ea8c` — transparent Emerging rankings
- `339139a` — safe versioned Vault backups

## Changed-file inventory

### Qualified listening and insights

`firestore.rules`, `package.json`, `scripts/verify-discovery-integrity.ts`, `src/app/api/drops/audio/route.ts`, `src/app/api/drops/insights/route.ts`, `src/app/api/drops/pulse/route.ts`, `src/app/insights/layout.tsx`, `src/app/insights/page.tsx`, `src/app/share/[shareId]/page.tsx`, `src/components/client-layout.tsx`, `src/components/drop-listen-panel.tsx`, `src/components/header.tsx`, `src/components/profile/embed-player.tsx`, `src/components/scene/scene-discover-card.tsx`, `src/components/scene/scene-nav-dock.tsx`, `src/context/drop-player-context.tsx`, `src/lib/drop-insights.ts`, `src/lib/drop-listen-analytics.ts`, `src/lib/drop-pulse-client.ts`, `src/lib/server/drop-insights.ts`, `src/lib/server/drop-listen-analytics.ts`, `src/lib/server/drop-listen-proof.ts`, `src/lib/server/drop-listener-identity.ts`, `src/lib/server/drop-pulse.ts`.

### Identity and featured track

`scripts/verify-profile-identity.ts`, `scripts/verify-featured-profile-track.ts`, `src/app/api/profile/config/route.ts`, `src/app/api/profile/featured-track/audio/route.ts`, `src/app/api/uploads/ticket/route.ts`, `src/components/profile/artist-home.tsx`, `src/components/profile/press-desk.tsx`, `src/components/profile/profile-modules.tsx`, `src/components/profile/sound-identity-strip.tsx`, `src/lib/drop-audio-upload.ts`, `src/lib/profile/featured-track-preview.ts`, `src/lib/profile/modules.ts`, `src/lib/profile/sound-identity.ts`, `src/lib/server/artist-home.ts`, `src/lib/server/drop-audio-stream.ts`, `src/lib/server/upload-gate.ts`, `src/lib/upload-gate-types.ts`, `storage.rules`.

### Discovery, relationships, and rankings

`scripts/verify-relationships.ts`, `scripts/verify-emerging-rankings.ts`, `src/app/activity/page.tsx`, `src/app/api/discover/route.ts`, `src/app/api/emerging/route.ts`, `src/app/api/relationships/route.ts`, `src/app/discover/page.tsx`, `src/app/leaderboard/page.tsx`, `src/app/supporters/page.tsx`, `src/components/activity/activity-nav-dropdown.tsx`, `src/components/activity/notification-settings-card.tsx`, `src/components/profile/support-button.tsx`, `src/components/scene/scene-home.tsx`, `src/lib/activity/client.ts`, `src/lib/activity/types.ts`, `src/lib/discovery-graph.ts`, `src/lib/emerging-ranking.ts`, `src/lib/relationships-client.ts`, `src/lib/relationships.ts`, `src/lib/scene/discover-client.ts`, `src/lib/server/activity.ts`, `src/lib/server/emerging-ranking.ts`, `src/lib/server/gamification.ts`, `src/lib/server/relationships.ts`.

### Vault safety and release documentation

`scripts/verify-vault-backups.ts`, `src/components/album-list.tsx`, `src/context/data-context.tsx`, `src/lib/vault-backup.ts`, `docs/BAR4BAR_STRONGER_VERSION_RELEASE.md`, `BAR4BAR_STRONGER_VERSION_CHANGES.md`.

### Runtime profile-route correction

`src/app/profile/[slug]/page.tsx`, `src/lib/profile/profile-slug.ts`, `scripts/verify-profile-identity.ts`, `BAR4BAR_STRONGER_VERSION_CHANGES.md`, `docs/BAR4BAR_STRONGER_VERSION_RELEASE.md`.
