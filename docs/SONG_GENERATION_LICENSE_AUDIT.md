# Song Generation License Audit

**Status:** Pre-production gate — pin revisions before cloud GA.  
**Last reviewed:** 2026-09-20

## Pinned stack (target)

| Asset | Pin | License | Commercial SaaS |
|-------|-----|---------|-----------------|
| ACE-Step 1.5 code | `ace-step/ACE-Step-1.5` @ tag `v1.5.0` (verify at release) | MIT | Yes — retain notice |
| ACE-Step base weights | Hugging Face revision recorded in companion manifest | Per model card | Verify per card before cloud |
| Basic Pitch | `spotify/basic-pitch` release tag pinned in companion | Apache-2.0 | Yes |
| FFmpeg | Static LGPL build from approved vendor script | LGPL-2.1+ | Yes with source offer |

## Excluded

- **Demucs / UMXL / HTDemucs checkpoints** — not shipped; ACE native extract only.
- **Spleeter** — optional future; MIT code but not default path.
- **ADTOF-pytorch drum MIDI** — NC weights; drum MIDI uses cleared heuristic post-extract only when licensed.
- **RVC / DDSP default bundles** — Voice Match beta blocked until replacement stack cleared.

## Historical diligence

Some ACE-Step forks briefly carried non-MIT Space terms; production pins the upstream MIT repository only. Archive counsel notes in `legal/ace-step-license-history.md` when created.

## Weight manifest

The Render Companion downloads `companion-manifest.json` (SHA-256 per file). Admin **Product Surfaces → Song Generation** refuses cloud starts if manifest `licenseClearForCloud` is false.

## Action items before cloud GA

1. Written counsel sign-off on ACE weight cards used in cloud workers.
2. FFmpeg build provenance archived.
3. Voice Match remains `off` until SVC chain audit complete.
