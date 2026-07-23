# MiroFish — what you need

Aligned with [Sanjay Shankar’s MiroFish setup guide](https://sanjayshankar.me/mirofish-setup-guide-ai-market-simulation/) (March 2026).

---

## Two ways to run MiroFish

| Path | You need |
|------|----------|
| **Web demo** (Reality Seeds + Simulation Requirement) | **2 files in this folder** — see below |
| **Self-hosted** (clone GitHub repo) | Python 3.10+, Node 18+, `uv`, API keys (OpenAI, Gemini, Zep Cloud), `.env` — full steps in the [setup guide](https://sanjayshankar.me/mirofish-setup-guide-ai-market-simulation/) |

Bar 4 Bar docs assume the **web UI** unless you install locally.

---

## Files in this folder (only 2 matter for MiroFish)

| File | MiroFish field | When |
|------|----------------|------|
| **[reality-seed.md](./reality-seed.md)** | **01 / Reality Seeds** | Upload **once** per graph build (~7–10 min GraphRAG) |
| **[simulation-prompts.md](./simulation-prompts.md)** | **02 / Simulation Requirement** | Paste one prompt per run (reuse same graph) |

That’s it. Everything else was merged or moved out.

---

## Workflow (~15–20 min per run after graph exists)

1. Upload **`reality-seed.md`** → wait for graph build.
2. Paste **Run 1** from **`simulation-prompts.md`** → simulate (~4–6 min).
3. Read report → repeat with Run 2–5 prompts **without re-uploading** the seed (same graph).
4. Add real beta quotes to the “Real user quotes” section in `reality-seed.md` before rebuilding the graph.

---

## What you do **not** need in this folder

- ❌ Multiple seed files — one brief is enough ([guide](https://sanjayshankar.me/mirofish-setup-guide-ai-market-simulation/#the-seed-document-most-important-input))
- ❌ Separate conversion-hypotheses file — merged into `reality-seed.md`
- ❌ Stripe funnel checklist — lives in **`docs/conversion-tracking-checklist.md`** (after simulation, not uploaded to MiroFish)

---

## Self-hosted extras (only if you install MiroFish locally)

From the setup guide:

- **OpenAI** (GPT-4o-mini) — ontology + report
- **Gemini 2.0 Flash** — agent personas + simulation turns (free tier)
- **Zep Cloud** — GraphRAG memory (free tier)
- Hybrid routing ≈ **$0.01/run**

---

## Suggested first run

**Run 5** in `simulation-prompts.md` after you’ve skimmed Runs 1–4 — or start with **Run 1** if you only care about catalog vs ink-first messaging.

---

*Bar 4 Bar live economy: May 2026 — `studio-tiers.ts`, `subscription.ts`, `trial.ts`.*
