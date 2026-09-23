# Third-Party Notices — AKAsheet Song Generation

AKAsheet optional song rendering uses open-source components pinned in `docs/SONG_GENERATION_LICENSE_AUDIT.md`. This file summarizes obligations for redistribution and commercial SaaS use.

## Core generation

| Component | License | Use |
|-----------|---------|-----|
| [ACE-Step 1.5](https://github.com/ace-step/ACE-Step-1.5) | MIT | Local/cloud music generation, repaint, stem extract, LRC |
| FFmpeg (LGPL build, no GPL/nonfree codecs) | LGPL-2.1+ | Transcode, loudness, format conversion |

## Post-processing (shipped features)

| Component | License | Use |
|-----------|---------|-----|
| [Basic Pitch](https://github.com/spotify/basic-pitch) | Apache-2.0 | Pitched-stem audio → MIDI (starting transcription) |

## Explicitly excluded from production builds

| Component | Reason |
|-----------|--------|
| Demucs / Open-Unmix separation weights | Weight licenses restrict commercial redistribution |
| ADTOF drum MIDI weights | CC BY-NC-SA |
| RVC / DDSP-SVC default weight bundles | Unclear commercial rights on bundled encoders/vocoders |

## Voice Match beta (admin-only until cleared)

SoulX-Singer-SVC and dependencies are benchmarked separately; no default weights ship until counsel clears every encoder, F0, vocoder, and dataset license.

## Artist Signature

User-owned training audio only. ACE LoRA/LoKr adapters are private per account; MIT ACE-Step training code applies.

## Notices

MIT and Apache-2.0 components require retaining copyright and license text in source distributions. LGPL FFmpeg requires offering corresponding source for the linked build — see `render-companion/NOTICE-ffmpeg.md` when the companion ships.

Full commit hashes, Hugging Face revisions, and SHA-256 manifests: `docs/SONG_GENERATION_LICENSE_AUDIT.md`.
