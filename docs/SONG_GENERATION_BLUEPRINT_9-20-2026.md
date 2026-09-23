# Song Generation Blueprint (2026-09-20)

Canonical implementation reference for Studio Max rendering. Historical master blueprints remain archived; this doc is the live engineering map.

## Workflows

1. **Vocal:** Sheet → Generation Workstation → Full Studio Draft → Generate Song → Render Studio → Approve → Library / release.
2. **Instrumental:** Vault → Generate Instrumental → Render Studio → Approve → Library / release.

## Modules

- `src/lib/song-generation/*` — recipes, entitlements, costs, provenance.
- `src/lib/server/render/*` — jobs, devices, ink reservations, quotas.
- `src/app/api/render/*` — authenticated APIs (server-write Firestore).
- `render-companion/` — local ACE-Step worker + cloud Dockerfile.

## Flags

`config/productSurfaces`: `songGeneration`, `cloudRendering`, `artistSignature`, `voiceMatch`, `stemsMidi` (default `off`).

## Economy

See `scripts/verify-ink-economy.ts` — 200 Ink per 52-bar draft + 4:00 render; Max 80k Ink ≈ 400 cycles/month.
