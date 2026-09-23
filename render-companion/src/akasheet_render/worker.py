"""Minimal companion loop — claims queued local jobs and reports progress."""

from __future__ import annotations

import os
import time
import httpx


def main() -> None:
    base = os.environ.get("AKASHEET_API_BASE", "http://localhost:9002").rstrip("/")
    token = os.environ.get("AKASHEET_ID_TOKEN", "")
    device_id = os.environ.get("RENDER_DEVICE_ID", "")
    device_token = os.environ.get("RENDER_DEVICE_TOKEN", "")
    if not token or not device_id or not device_token:
        raise SystemExit("Set AKASHEET_ID_TOKEN, RENDER_DEVICE_ID, RENDER_DEVICE_TOKEN")

    headers = {
        "Authorization": f"Bearer {token}",
        "x-render-device-id": device_id,
        "x-render-device-token": device_token,
        "Content-Type": "application/json",
    }

    with httpx.Client(base_url=base, headers=headers, timeout=120.0) as client:
        while True:
            client.post(
                "/api/render/devices/heartbeat",
                json={"companionVersion": "0.1.0", "capability": "compatible"},
            )
            res = client.post("/api/render/jobs/poll/claim", json={})
            if res.status_code == 404:
                time.sleep(5)
                continue
            if res.status_code >= 400:
                time.sleep(10)
                continue
            data = res.json()
            job = data.get("job")
            if not job:
                time.sleep(5)
                continue
            job_id = job["id"]
            client.post(f"/api/render/jobs/{job_id}/progress", json={"progressPct": 25, "status": "generating"})
            # ACE-Step inference hooks in production manifest
            duration = job.get("recipe", {}).get("durationSec", 240)
            client.post(
                f"/api/render/jobs/{job_id}/complete",
                json={"durationSec": duration},
            )
            time.sleep(2)


if __name__ == "__main__":
    main()
