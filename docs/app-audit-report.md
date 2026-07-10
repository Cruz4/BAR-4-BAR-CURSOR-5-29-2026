# Bar 4 Bar — Full App Audit Report

**Date:** July 10, 2026
**Scope:** every page, button, modal, form, mobile breakpoint, loading state, error state, database action, AI-generation flow, Ink deduction, and subscription restriction.
**Method:** full type-check (`tsc --noEmit`), lint attempt, and three parallel code audits (UI surfaces; API routes + database; AI flows + Ink + subscription gates).

Items marked **[FIXED 7/10]** were repaired in the same working session that produced this report (comprehension-engine and onboarding overhaul).

---

## 1. Broken

| # | Location | Issue |
|---|----------|-------|
| B1 | `src/app/albums/[albumId]/relay/page.tsx` | Orphaned page — nothing in the app links to `/albums/{id}/relay`. Its save handler reads `g.verse1`, `g.hook`, `g.verse2`, `g.bridge`, `g.outro`, but `generateRelayDraft` returns `{ title, sections[] }`, so saving a generated draft produces an empty track. 13 type errors in this file. Candidate for deletion (live remix flow is `generate-song-draft-dialog.tsx`). |
| B2 | `src/app/albums/[albumId]/relay/page.tsx` | Client pre-check charges ~40 Ink (`20 × generateRelayDraft` rate) but the server call omits `structure`, so the server charges only the per-bar minimum — client and server disagree on cost. |
| B3 | `src/ai/flows/transcribe-freestyle-audio.ts` | Freestyle transcription Ink is never deducted server-side: the flow passes `inkCost: 0` under action name `freestyleTranscriptionChunk`, and the gate skips deduction when cost ≤ 0. Docs and `costs.ts` (`freestyleTranscription: 3`) claim it is charged. Unlimited free Gemini STT for signed-in users. |
| B4 | `src/components/track-editor.tsx` (init-failure recovery UI) | "Create Track" recovery button navigates to `/?create=track`, but nothing reads the `create` query param — the button silently does nothing beyond going home. |
| B5 | Relay wizard `excludedWords` | **[FIXED 7/10]** The "Exclude Words" field was collected in wizard state but never sent to the AI — `generateRelayDraft` had no such input. Now merged into `forbiddenWords` in both `generate-song-draft-dialog.tsx` and the relay page. |
| B6 | `src/components/welcome-ink-dialog.tsx` | **[FIXED 7/10]** Dialog required `vaultTutorialCompletedAt`, but fresh signups skip the vault tour for 30 minutes — new users could go their whole first session (or longer) without ever seeing their welcome-Ink explanation. Requirement dropped; privacy-intro completion is the checkpoint. |

## 2. Confusing

| # | Location | Issue |
|---|----------|-------|
| C1 | `src/context/usage-context.tsx` | Client `deductInk` is only a balance pre-check + animation ("Ink is deducted server-side only") and `refundInk` is a no-op stub — yet call sites all over the app call `refundInk(cost)` on error as if it did something. Misleading for maintenance. |
| C2 | `src/lib/server/ai-gate.ts` | Refunds always credit the `residency` pool, even when the spend was debited from trial/permanent pools (`computeInkSpendBreakdown`). Users can end up with a different pool mix than before a failed action. |
| C3 | `src/lib/costs.ts` / flows | Cost-key naming mismatches: cost key `analyzeRelayAssets` vs dispatcher action `suggestRelayDirections`; cost key `freestyleTranscription` vs server action `freestyleTranscriptionChunk` (which is not in `AI_COSTS` at all). |
| C4 | `src/components/album-detail-content.tsx` | Missing album shows a full-screen spinner for 1s, then silently redirects to `/` — no "album not found" message. Album wipe also uses native browser `confirm()` instead of the app's AlertDialog. |
| C5 | `src/app/leaderboard/page.tsx` | Failed leaderboard fetch renders empty tables ("board is cold") instead of an error state — indistinguishable from a genuinely empty leaderboard. |
| C6 | `src/app/login/page.tsx` | Submitting with empty email/password silently returns — no toast, no field highlight. |
| C7 | `src/components/generate-song-draft-dialog.tsx` | Closing the dialog while generating dismisses the UI but generation continues off-screen and reopens on completion — no visible indicator that work continues. |
| C8 | `src/components/downgrade-track-picker-dialog.tsx` | Hard modal trap (`onOpenChange={() => {}}`, Escape blocked). Intentional, but there is no "remind me later" escape hatch. |
| C9 | `src/app/albums/[albumId]/relay/page.tsx` | Imports `writers-relay` server actions directly while the rest of the app calls `/api/ai/run` through `lazy-ai-flows.ts` — two invocation surfaces for the same flows. |
| C10 | `src/components/track-editor.tsx` | **[FIXED 7/10]** UI showed AI-reported syllables per option, but accepting a line discarded them (word-count + `rhymeKey: '?'`). Accepted options now persist the server-computed phonetic syllables and rhyme key. |

## 3. Visually inconsistent

| # | Location | Issue |
|---|----------|-------|
| V1 | `src/app/error.tsx`, `src/app/albums/[albumId]/error.tsx`, `.../tracks/[trackId]/error.tsx` | All three error boundaries use hardcoded dark palettes (`#050a1e`, `#0c121d`) that ignore light mode. The track-level one also has an invalid `spaceY` CSS property (type error). |
| V2 | `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`, `src/app/cookies/page.tsx` | Legal-page headings hardcode `text-white` on otherwise theme-aware pages — invisible-ish in light mode. |
| V3 | `src/app/pricing/page.tsx` | Header title `text-white/90` and tier card titles/prices `text-white` are not theme-aware; weak contrast in light mode. |
| V4 | `src/app/usage/page.tsx` | Ink history rows use hardcoded `text-white` labels amid theme tokens. |
| V5 | `src/app/login/page.tsx` | Email/password inputs hardcode `bg-black/40 border-white/10 text-white` regardless of theme. |

## 4. Slow

| # | Location | Issue |
|---|----------|-------|
| S1 | `src/components/track-editor.tsx` | Workstation shows a bare spinner for up to 12 seconds before the timeout recovery UI appears — no progressive feedback. |
| S2 | `src/app/usage/page.tsx` | `loading` from `useUsage()` is destructured but never used; Ink balances can render 0 before usage context finishes loading. |
| S3 | `src/context/data-context.tsx` | `flushOutboxReplay` replays offline outbox entries sequentially with individual `setDoc`/`deleteDoc` calls instead of a batched write. |

## 5. Unfinished

| # | Location | Issue |
|---|----------|-------|
| U1 | `src/ai/flows/suggest-track-titles.ts` | Flow exists with a cost (`suggestTrackTitles: 3`) but is not registered in the AI dispatcher, `lazy-ai-flows.ts`, or any UI — unreachable in production. |
| U2 | `src/lib/costs.ts` | `aiVideoDirector` (100 Ink) and `aiMusicCowriter` (80 Ink) have costs and Pro-only gate entries but no flow files or dispatcher entries — phantom features. |
| U3 | `src/context/query-client-provider.tsx` | Placeholder stub ("can be deleted or repurposed"), imported nowhere — dead code. |
| U4 | `src/lib/firebase/client/firestore.ts` | Read helpers target top-level `albums`/`tracks` collections while the app uses `users/{uid}/albums/...`; module is read-only and appears unused. |
| U5 | Manual line metadata | **[PARTIALLY FIXED 7/10]** Hand-typed lines still store word count as `syllables` and `rhymeKey: '?'` at write time (client-side). The backend engine (`src/lib/lyrics-analysis/`) now exists to compute real values; wiring it into the client sheet is a follow-up. AI-generated lines are now fixed (server computes real metrics). |
| U6 | `package.json` | `tone` (audio library) installed but never imported — Performance Mode uses manual scroll speed, not BPM sync. |

## 6. Technically risky

### Build health
| # | Location | Issue |
|---|----------|-------|
| T1 | Whole repo | **98 TypeScript errors** hidden by `ignoreBuildErrors: true` in `next.config.js`. Hotspots: `track-editor.tsx` (24), `relay/page.tsx` (17 — see B1), `admin-metrics.ts` (10), `marketing-demo-data.ts` (5), Stripe fulfillment/webhook typing (3), `dna-strands.ts` (2), `badge-styles.ts` (2, missing `mastery` key — a real runtime gap for mastery-category badges). |
| T2 | Whole repo | ESLint is not configured — `next lint` prompts for interactive setup. No static lint gate exists. |

### Money and Ink
| # | Location | Issue |
|---|----------|-------|
| T3 | `src/app/api/stripe/checkout/route.ts` | Pro-gated Ink packs (Artist/Vault) are only checked when the client sends `priceKey`; sending a raw `priceId` bypasses `isProGatedInkPackKey`. |
| T4 | `src/app/api/milestones/route.ts` + `src/lib/server/milestones.ts` | `track_complete` grants up to 500 Ink with no server check that a real completed track exists, and the one-time flag is read-then-write (racy under concurrent POSTs). |
| T5 | `src/lib/server/ai-gate.ts` | Draft/relay Ink costs derive from client-supplied structure; a minimal structure undercharges relative to what gets generated. |
| T6 | `src/lib/stripe-fulfillment.ts` | `markWebhookProcessed` is non-atomic get-then-set; duplicate Stripe event delivery could double-run subscription handlers (checkout itself is protected by `claimCheckoutFulfillment`). |
| T7 | `src/lib/server/usage-init.ts` | Monthly residency grant is non-transactional; concurrent `/usage/init` calls could double-grant. |

### Gamification integrity
| # | Location | Issue |
|---|----------|-------|
| T8 | `src/app/api/analytics/event/route.ts` | Client can POST fake `ai_action` events with arbitrary `actionName`, setting `firstGenerateNextLineAt` etc. and unlocking achievements (+Ink) without real AI calls. |
| T9 | `src/app/api/gamification/event/route.ts` | `track_saved` XP trusts client-supplied `writtenLinesDelta`/`generatedLinesDelta` — XP farmable up to the daily cap. |

### Access control and infra
| # | Location | Issue |
|---|----------|-------|
| T10 | `src/lib/server/ai-gate.ts` | Pro-only AI check tests `subscriptionStatus === 'active'` only, not the Pro preview window (`proFeaturePreviewExpiresAt`) — server and client (`isProOrTrial`) disagree on who is Pro. Also no-ops entirely without Admin SDK credentials. |
| T11 | AI flows / server | Tier limits (`isTrackOverTierLimit`, `isTrackLocked`, album/track counts) are enforced client-side only; Firestore rules allow unrestricted owner writes to `users/{uid}/albums/**`, so free limits are bypassable by direct writes. |
| T12 | `src/lib/server/rate-limit.ts` | In-memory per-instance rate limiter — ineffective across serverless replicas, resets on cold start. |
| T13 | `src/app/api/invite-gate/*` | Access-code verify has no rate limit (brute-forceable); session route fails open (`{ unlocked: true }` on error); fallback HMAC secret is a hardcoded dev string. |
| T14 | `firestore.rules` | Any authenticated user can create docs in `system/logs/entries` (log spam); master-admin email is hardcoded in rules and can drift from the env override. |
| T15 | `src/app/api/ai/run/route.ts` | Route itself has no auth/rate-limit wrapper (each flow self-gates via `runSecuredAiAction`); errors map mostly to 500 — rate-limit/insufficient-Ink don't return 429/402. |
| T16 | Multiple flows | User lyrics interpolated into prompts via triple-stash `{{{...}}}` with no sanitization — prompt-injection surface (bounded by output schemas, but style/DNA extraction follows instructions inside pasted lyrics). |
| T17 | `src/context/data-context.tsx` | Sync paths clear pending-write refs before `batch.commit()` (failed commits drop edits); offline outbox + debounced sync are last-write-wins across tabs; `moveTrack` is a non-transactional delete+create. |
| T18 | Guardrails | **[FIXED 7/10]** Forbidden words were prompt-only requests — nothing validated AI output. All four lyric-producing flows now hard-enforce banned words server-side (filter, retry, or censor) via `src/lib/server/lyric-guardrails.ts`. |
| T19 | `src/components/album-list.tsx` | `CreateItemDialog` workspace-mode buttons lack `disabled={isCreating}` — double-tap can create duplicate tracks. |
| T20 | Perform page | Scroll-speed toggles are ~24px — below comfortable touch-target size. |
| T21 | `src/components/export-dialog.tsx` | PDF export (`html2canvas` + `jsPDF`) has no try/catch — failures are silent. |

## 7. Missing on mobile

| # | Location | Issue |
|---|----------|-------|
| M1 | Perform page | Rhyme-highlight toggle is `hidden sm:flex` — no mobile control at all for a core perform feature. |
| M2 | Perform page | Track title / "Teleprompter Active" block is `hidden lg:block` — phones get no track identification. |
| M3 | `src/app/share/[shareId]/page.tsx` | View/import stats are `hidden md:flex` with no small-screen alternative. |
| M4 | `src/components/header.tsx` | Studio Manual "?" is `hidden md:inline-flex`; mobile users must find it in the account dropdown (alternative exists — lower severity). |

## 8. Working correctly (verified)

**Auth and routing.** All 12 admin API routes verify a Firebase Bearer token plus admin role; self-service routes verify token/uid match; cron requires `CRON_SECRET`; client-side guards redirect unauthenticated users from `/usage`, `/albums`, `/admin`, `/studio-progress`; login bounces authenticated users.

**Stripe.** Webhook signature verification is correct; checkout fulfillment is idempotent via Firestore `create()` claims shared by webhook and `fulfill-session`; session ownership validated before crediting; checkout metadata set server-side from the catalog, not the client.

**Ink economy.** Server-side Firestore transactions are the source of truth; balance is read-only from the client (rules deny writes); failed AI actions refund after deduction; BYO API keys give a 50% discount but never skip metering and require verified Yearly Pro; dynamic draft costs are computed server-side; `find-rhymes` rejects short input before charging.

**AI gate.** All 11 dispatched flows pass through `runSecuredAiAction` (token verify → rate limit → Pro gate → BYO resolve → cost → deduct → run → refund-on-throw); the `'use server'` flow exports are not unmetered bypasses; dispatcher, lazy wrappers, and cost table align 1:1 for registered actions.

**UI states.** Root loading route, login/profile/share/perform/relay/admin pages all have proper loaders, empty states, and failure paths; Radix dialogs all close via X/Escape; create dialogs validate input and toast on limits; vault, leaderboard, and usage history have real empty states; the track editor has a full mobile tab system with bottom navigation.

**Gamification (partial).** Track/portfolio achievement unlocks re-verify against Firestore track data server-side rather than trusting client counters (the analytics-driven activation timestamps are the exception — see T8).

---

## Suggested priority order

1. **T3, B3, T4** — money leaks (checkout bypass, free transcription, unverified Ink grants).
2. **T8, T9** — gamification Ink/XP farming.
3. **T1** — burn down the 98 type errors and re-enable build type checking (start with B1: delete or rewrite the orphaned relay page).
4. **T10, T11** — server-side tier enforcement.
5. **M1–M2, V1–V5** — mobile perform gaps and light-mode contrast.
