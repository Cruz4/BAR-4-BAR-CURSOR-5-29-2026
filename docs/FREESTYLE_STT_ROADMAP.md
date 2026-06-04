# Freestyle Pad — voice pickup & transcription roadmap

> **Status:** Working well in production (~80%+ word accuracy reported). This doc tracks what shipped and what to improve next.  
> **Code:** `src/components/freestyle-pad.tsx`, `src/lib/speech-recognition.ts`, `src/lib/freestyle-transcription-context.ts`, `src/ai/flows/transcribe-freestyle-audio.ts`

---

## How it works today (Studio pickup)

1. User taps mic in **Freestyle Pad** (Pro; Visitor gets 30s demo).
2. Browser captures audio via **MediaRecorder** (not the flaky browser Speech API by default).
3. Every **~6.5 seconds**, a complete audio segment is sent to the server.
4. **Gemini 2.5 Flash** transcribes the clip with:
   - Rap/freestyle-oriented instructions (keep slang, no grammar “fixes”).
   - **Album theme**, **track vibe**, and **style profile** as hints.
   - **Last ~220 characters** of prior transcript so lines continue across chunks.
5. New text is merged into the pad (overlap dedupe at chunk boundaries).

Env flags (optional):

- `NEXT_PUBLIC_FREESTYLE_STUDIO_ONLY=1` — force MediaRecorder path only.
- `NEXT_PUBLIC_FREESTYLE_BROWSER_SPEECH=1` — opt-in desktop Chrome live speech (experimental; can beep/restart).

---

## Shipped improvements (2026)

| Area | Change |
|------|--------|
| Reliability | Studio mic path default; mobile-safe recorder restart; silence gate fixed when WebM decode fails |
| Audio | 6.5s segments, 96 kbps capture |
| Accuracy | Track context + prior transcript tail + chunk merge |
| UX | Achievement/celebration overlays no longer block modals |

---

## Roadmap — smart voice system (next)

Priority order for future sprints. Not required for launch while current accuracy is acceptable.

### Tier 1 — high impact, moderate effort

- [ ] **Editable transcript** in Freestyle Pad before “Add to Editor” (fix the last ~20% manually).
- [ ] **Mic input selector** (desktop): choose Bluetooth / USB / built-in mic.
- [ ] **Live mic level meter** in the pad so users know they’re loud enough before waiting on STT.
- [ ] **Session polish pass**: one optional AI pass on the full transcript (not per chunk) for punctuation and line breaks only.

### Tier 2 — accuracy & architecture

- [ ] **Overlapping segments** (e.g. 6s window, 4s stride) + merge duplicates — fewer words lost at chunk cuts.
- [ ] **Custom vocabulary** from track title, DNA strain terms, and forbidden/must-include guardrails.
- [ ] **Dedicated STT API** (Google Speech-to-Text or Whisper) for raw text, Gemini only for cleanup — evaluate cost/latency vs current all-Gemini chunks.
- [ ] **Stronger model A/B** for transcription-only calls (if Genkit exposes a better audio model).

### Tier 3 — polish & Pro perks

- [ ] **Per-artist slang profile** (saved in style vault) fed into every chunk.
- [ ] **Offline / poor-network queue** — buffer segments locally, transcribe when back online.
- [ ] **Yearly Pro perk copy**: “Priority Freestyle engine” if a faster model or longer sessions are added.

---

## Ops / testing

| Check | Command / note |
|-------|----------------|
| Local dev | `npm run dev` — needs `GEMINI_API_KEY` in `.env` |
| Deploy | `npm run deploy:live` when pushing hosted changes |
| Mic blocked | Browser site settings + HTTPS (or localhost) |
| Firestore `ERR_BLOCKED_BY_CLIENT` | Ad blocker — allowlist the app domain (unrelated to mic, affects sync) |

---

## Related docs

- [PRE_LAUNCH_CHECKLIST.md](./PRE_LAUNCH_CHECKLIST.md) — payments & webhooks
- [STRIPE_SETUP.md](./STRIPE_SETUP.md) — billing
- `src/lib/costs.ts` — `freestyleTranscription` session Ink (charged once per session start)

*Last updated: May 2026 — align with shipped `freestyle-pad` + `freestyle-transcription-context`.*
