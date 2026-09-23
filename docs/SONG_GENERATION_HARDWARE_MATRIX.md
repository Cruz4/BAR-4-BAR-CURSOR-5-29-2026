# Song Generation Hardware Matrix

Marketing claims must match **certified** rows only. Default public copy: **NVIDIA 6 GB+ on Windows/Linux** local companion; phones are controllers/players.

| Class | VRAM | 240s vocal song (Auto Best) | Repaint 30s | Notes |
|-------|------|----------------------------|-------------|-------|
| NVIDIA certified | 8 GB | ~3–6 min warm | ~45–90s | Primary supported path |
| NVIDIA certified | 12 GB | ~2–4 min | ~30–60s | Recommended |
| NVIDIA certified | 24 GB | ~1.5–3 min | ~20–45s | Studio tier |
| NVIDIA degraded | 6 GB | ~6–12 min, smaller model | slower | `degraded` capability |
| Apple Silicon | 16 GB unified | benchmark pending | — | Not certified until pass |
| AMD discrete | 8 GB+ | benchmark pending | — | Not certified until pass |
| CPU fallback | 16 GB RAM | 45–120+ min | very slow | `cloud_only` recommended |

Cloud worker: single NVIDIA L4/A10 class, same recipe contract as companion.

Benchmark script: `render-companion/scripts/benchmark_matrix.py` (run on release candidates).
