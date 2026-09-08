# Infrastructure costs (Google Cloud / Firebase)

Project: `lyricai-studio-otgxn` · AKAsheet

## August 2026 invoice ($18.35) — root causes

| Charge | Amount | Cause |
|--------|--------|--------|
| Firestore Internet egress | $8.26 | ~79 GiB downloaded to browsers — wall posts with inline `data:image/*` URLs (up to 900KB each), vault sync, profile loads, dev polling |
| Artifact Registry storage | $6.46 | ~65 GiB of stale Cloud Run deploy images |
| Firestore reads | $1.50 | 6.3M reads — listeners, wall/API queries, dev usage |
| Gemini output tokens | $1.04 | Studio AI (drafts, next line, effects) |
| Cloud Storage | $0.82 | ~46 GiB media (drops, wall images, voice) |
| Cloud Run CPU/RAM | $0.00 | Discounted this month; 313k invocations |

## Fixes shipped in repo

1. **Artifact Registry** — `npm run infra:prune-images` (keeps 3 newest deploy images)
2. **Firestore egress** — strip inline `data:image` from post API/feed when `imageStoragePath` exists; resolve images from Storage on the client; block new inline wall images; migrated **39 posts** (32 wall + 7 reverb) from inline blobs → Firebase Storage; `npm run infra:migrate-post-images` / `infra:repair-post-images` for one-time DB cleanup
3. **Firestore reads (dev)** — listener poll interval 15–20s → 120s; usage log listener 100 → 25 rows in dev
4. **Cloud Run** — `firebase.json` memory 4GiB → 1GiB
5. **Gemini** — `maxOutputTokens: 8192` on Genkit calls

## Monthly maintenance

```bash
npm run infra:audit-egress          # report large Firestore blobs
npm run infra:repair-post-images    # strip redundant inline post images (safe when storage path exists)
npm run infra:prune-images          # delete old Artifact Registry deploy images
```

After deploys, run `infra:prune-images` if the GCP bill shows Artifact Registry growth.

**Note:** `infra:prune-images` requires the [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (`gcloud`) authenticated to `lyricai-studio-otgxn`. Run from Cloud Shell if not installed locally.
