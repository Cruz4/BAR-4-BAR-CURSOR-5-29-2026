# Production gate report

Generated: 2026-08-27T22:29:38.450Z
Overall: **PASS** (12 pass · 0 warning · 0 blocked)

| Status | Check | Detail |
|--------|-------|--------|
| pass | Security · Firestore rules present | firestore.rules found |
| pass | Security · Storage rules present | storage.rules found |
| pass | Privacy · SECURITY.md | docs/SECURITY.md present |
| pass | Payments · Fee tiers + artist net (Stripe not deducted) | verify:drop-fee-preview passed |
| pass | Discovery · Release counters | verify:release-counters passed |
| pass | Releases · Management invariants | verify:release-management passed |
| pass | Remote controls · Product surface modes | config/productSurfaces + emergency modes |
| pass | Analytics · CEO funnel spec (Phase 0) | Accept Phase 0 before enabling ceoDashboard=v2 aggregates |
| pass | Scene · Weather V2 layers | Toggle sceneWeather=v2 in Admin Product Surfaces |
| pass | Artist Intelligence shell | Toggle supportCircle=crm |
| pass | Share Studio + Release Room | Toggle sharing=v2 and releaseRoom=v1 |
| pass | Performance · Typecheck | tsc --noEmit clean |

Enable V2 surfaces independently in Admin → Config → Product Surfaces after blockers are clear.
