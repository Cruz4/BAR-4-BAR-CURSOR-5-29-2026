# Production gate report

Generated: 2026-09-23T05:04:58.343Z
Overall: **WARNING** (11 pass · 1 warning · 0 blocked)

| Status | Check | Detail |
|--------|-------|--------|
| pass | Security · Firestore rules present | firestore.rules found |
| pass | Security · Storage rules present | storage.rules found |
| pass | Privacy · SECURITY.md | docs/SECURITY.md present |
| pass | Payments · Fee tiers + artist net (Stripe not deducted) | verify:drop-fee-preview passed |
| pass | Discovery · Release counters | verify:release-counters passed |
| warning | Releases · Management invariants | node:internal/process/esm_loader:40
      internalBinding('errors').triggerUncaughtException(
                                ^

AssertionError [ERR_ASSERTION]: DM thread must full-bleed Msgs atmosphere
    at assert (g:\Bar 4 Bar App $\BAR 4 BAR FULL APP 5-28-2026 YOYO SAVE VER56\scripts\verify-release-management.ts:356:8)
    at Object.<anonymous> (g:\Bar 4 Bar App $\BAR 4 BAR FULL APP 5-28-2026 YOYO SAVE VER56\scripts\verify-release-management.ts:370:54)
    at Module._compile (node:internal/modules/cjs/loader:1376:14)
    at Object.transformer (G:\Bar 4 Bar App $\BAR 4 BAR FULL APP 5-28-2026 YOYO SAVE VER56\node_modules\tsx\dist\register-BLUABhh3.cjs:9:3252)
    at Module.load (node:internal/modules/cjs/loader:1207:32)
    at Module._load (node:internal/modules/cjs/loader:102 |
| pass | Remote controls · Product surface modes | config/productSurfaces + emergency modes |
| pass | Analytics · CEO funnel spec (Phase 0) | Accept Phase 0 before enabling ceoDashboard=v2 aggregates |
| pass | Scene · Weather V2 layers | Toggle sceneWeather=v2 in Admin Product Surfaces |
| pass | Artist Intelligence shell | Toggle supportCircle=crm |
| pass | Share Studio + Release Room | Toggle sharing=v2 and releaseRoom=v1 |
| pass | Performance · Typecheck | tsc --noEmit clean |

Enable V2 surfaces independently in Admin → Config → Product Surfaces after blockers are clear.
