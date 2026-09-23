# AKAsheet Render Companion

Local-first ACE-Step 1.5 worker for Studio Max. Pairs with AKAsheet via `/api/render/devices/*` and polls `/api/render/jobs/*/claim`.

## Requirements

- NVIDIA GPU 6 GB+ (8 GB recommended)
- ~80 GB free disk for full model manifest
- Python 3.11+

## Quick start (dev)

```bash
cd render-companion
pip install -e .
python -m akasheet_render.worker --api-base http://localhost:9002
```

Set `AKASHEET_ID_TOKEN` and paired `RENDER_DEVICE_ID` / `RENDER_DEVICE_TOKEN` from Settings → Render Devices.

## Cloud worker

See `docker/Dockerfile.cloud-worker` — same recipe contract, scale-to-zero on RunPod/Modal.
