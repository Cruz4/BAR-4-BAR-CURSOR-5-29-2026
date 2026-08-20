# Current security and money-integrity audit

**Reviewed:** August 20, 2026
**Scope:** authentication and metering gates, Stripe checkout and fulfillment, First Drops fees, gamification rewards, analytics trust boundaries, and operational validation.

This is the current companion to the historical [July app audit](./app-audit-report.md). It records verified implementation status; it does not authorize production-data migrations or changes to the Ink economy.

## Verified protections

| Area | Current status |
|------|----------------|
| Stripe catalog | Checkout resolves server-owned price keys and also applies the Pro gate to raw resolved price IDs. |
| Stripe webhook replay | Event claims use an atomic Firestore `create`, so concurrent delivery cannot process the same event twice. |
| AI feature preview | Server AI gating accepts paid Pro or an active feature preview through the shared subscription helper. |
| Gamification saves | Client-claimed writing deltas are clamped to line counts verified from Firestore. |
| Track completion | The abandoned hidden completion-burst Ink path has been removed. Marking a track complete still locks the sheet and uses the visible gamification system. |
| First Drops | Paid checkout has a $1.99 floor. Fees are 25% below $3, 15% from $3–$4.99, and 10% from $5; free unlock is not a live checkout path. |

## Remediation completed in this pass

- Freestyle session charging is counted in a server-owned Firestore session. The client no longer chooses whether a chunk is paid, and a failed paid call is refunded and made billable again.
- The hidden first-track completion burst was removed instead of being published as an undocumented Ink reward. Existing production ledger history was not changed.
- Public analytics and gamification endpoints no longer accept `ai_action`; successful server-gated AI actions remain authoritative for rewards.
- Production rate-limit counters now use atomic shared Firestore transactions across Cloud Run instances.
- New Visitor albums and tracks pass through an authenticated transaction that counts Firestore data. Rules prevent clients from creating unslotted documents directly; existing edits, deletes, valid imports, and offline outbox replay remain supported.
- Next.js moved from 15.2.8 to the patched non-major 15.5.23 line, PostCSS was updated, and npm's non-breaking production audit fixes were applied.

## Dependency constraint still requiring a future major-upgrade project

The final production-only audit reports **64 transitive advisories: 55 moderate, 9 high, 0 critical**. npm offers no non-breaking resolution for the remainder. They are primarily inherited through Genkit/OpenTelemetry, plus Next.js-bundled PostCSS/Sharp and Firebase Admin's Google dependencies. npm's proposed full resolution requires breaking upgrades such as Next 16 and Firebase Admin 14, while several Genkit advisories currently have no available fix. Those major upgrades were not forced into this security patch because they require a separate compatibility and migration pass.

## Validation baseline

- Node.js 22 is the supported runtime (`package.json`, `.nvmrc`, and `.node-version`).
- ESLint is configured as a non-interactive build gate. Legacy cleanup categories remain warnings so unrelated files are not rewritten during this audit.
- Typecheck, lint, focused verification scripts, and a production build should be run after every implementation change.

## Money-model note

First Drops currently uses destination charges where the platform fee is tiered and Stripe processing is borne by the platform. At the $1.99 floor, the 25% tier is intended to avoid the loss created by the former $1/10% model. Pricing, fee constants, checkout validation, and public copy must change together.
