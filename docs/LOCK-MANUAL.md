# LOCK / Finish-a-Rhyme — Full Product Manual

**Product name in UI:** Open LOCK / Finish this bar  
**Branch:** `feat/lock`  
**Checkpoint before LOCK:** tag/branch `pre-lock` / `checkpoint/pre-lock` @ `6a500d0`  
**Last committed LOCK work:** `9992f84` (server-pass kill flag)  
**Uncommitted since then (at time of writing):** conversion UX polish, Close LOCK, LockShell skin, How-to/Whats New, **Admin → Config → LOCK System** toggle  

---

## 1. What this is (one paragraph)

LOCK is Bar 4 Bar’s **unfinished-bar dare**: someone starts a seed bar (optionally with DNA vibe + embed), anyone can write the next bar **without an account**, get an instant **LOCK score stamp** + share card, then feel pressure to **name the echo** (signup) so they get credit, Activity, and a path into **The Scene / Bloodline / Studio / Artist Home**. It is **not** music generation and **does not store audio** (embed URLs only).

Think of it as the Auto-Tune analogy: the *tool effect* (LOCK score) becomes a **cultural stamp** people want on their name — not “try our blank SaaS sheet.”

---

## 2. Why it exists (funnel problem it solves)

| Before | After LOCK (when ON) |
|--|--|
| Lands → blank guest try sheet → almost no signup | Guest lands on a **dare** with one job: finish the bar |
| Signup felt like saving a blank tool | Signup = **name your stamp** + join living cast on The Scene |
| Features (Scene, Artist Home, DNA studio) were back-loaded | Post-stamp **Where next** doors introduce them after the dopamine hit |

---

## 3. Kill switches & admin control

### Preferred live switch (no redeploy)

**Admin Panel → Config → LOCK System**

- Saves Firestore `config/lockFeature` `{ enabled, updatedAt, updatedBy }`
- Flips: `/lock/*`, Discover finish-the-bar cards, Artist Home module, Press Desk publish, What’s New card, lock APIs — **does not** change guest `/`
- Soft kill: toggle **Off** → Deploy

### Resolution order

1. `LOCK_FORCE_OFF=1` → **always off** (overrides admin; needs restart)
2. Else if admin has saved a config doc → **admin `enabled` wins**
3. Else if `NEXT_PUBLIC_LOCK=1` → **env bootstrap on** (local dogfood until first admin save)
4. Else → **off**

### Public status

- `GET /api/lock/status` → `{ enabled, source, updatedAt }`
- Client hook: `useLockFeature()` in `src/hooks/use-lock-feature.ts`
- Server: `await isLockFeatureEnabled()` in `src/lib/server/lock-feature.ts`

### Hard code rollback

```bash
git checkout pre-lock
# or
git checkout checkpoint/pre-lock
```

### Related short ops doc

See also `docs/LOCK.md` for a compact kill-flag / loop cheat sheet.

---

## 4. Home routing (logged out vs in)

**Guest `/` = Pressing playground** (live Artist Home draft). Ads promise profiles + writing tools — the home door matches.

| Who | `/` behavior |
|--|--|
| Logged out | Live Pressing / Artist Home playground (claim profile or try writing) |
| Logged in | Scene / Vault as before |

**Try sheet** (`/try`): Architect-style unfinished starter on bar 1; guest finishes on bar 2.

**Guestbook / Friends (playground):** Neomaiya Sol appears as the sample first friend and guestbook line. Her name links to her real `/profile/{slug}` (resolved via `GET /api/profile/neomaiya`, fallback `neomaiya-sol`). After signup, usage-init can seed the same first-friend + guestbook welcome for real.

When LOCK / finish-the-bar social is **ON**, casts stay at `/lock/house` and `/lock/[id]` (Discover / Artist Home / shared links) — optional side door only.

Ops detail for guest doors: [GUEST_TRY_SHEET.md](./GUEST_TRY_SHEET.md).


---

## 5. Core concepts glossary

| Term | Meaning |
|--|--|
| **Open LOCK** | A public cast: seed bar + echoes while `status: open` |
| **House LOCK** | Platform dare at `/lock/house` (id `house`). Stays open; cannot be closed by artists |
| **Seed** | The starting unfinished bar |
| **Echo** | One submitted next bar + LOCK score |
| **LOCK score** | 0–100 heuristic stamp vs DNA/seed + end-sound hitch (no Ink, no model) |
| **Labels** | `Off-world` · `In-world` · `Hard LOCK` |
| **Unnamed** | Echo with no `authorName` / not claimed — guest stamp only |
| **Named + watch** | Signup/claim puts name on echo + watches cast for Activity |
| **Bloodline / Verse Tree** | Interactive path explorer: walk forks via `parentEchoId`; **Song so far** shows full ancestry |
| **Answer from here / Continue from here** | Reply branches from a selected echo; UI always shows seed + prior path lines |
| **Artist Pick** | Casting artist crowns one echo (credit) |
| **Clear for release** | Optional credit/split offer to **named** picked author |
| **Close LOCK** | Owner stops new echoes; bloodline stays readable |
| **Open in studio** | Handoff seed + your bar into `/try` demo lines |

---

## 6. Rights ladder (legal/product)

1. **Submit** = display license only (no ownership)
2. **Artist Pick** = credit
3. **Clear for release** = optional split/credit offer (accept/decline)
4. **No music gen** · **no audio stored** on Bar 4 Bar — embeds are external links only

---

## 7. Data model (Firestore)

### `locks/{lockId}`

- `status`: `open` | `closed`
- `ownerId`, `ownerName`, `ownerSlug?`
- `seedBar`, `embedUrl?`, `dnaSnapshot?`
- `echoCount`, `watcherCount`
- `artistPickEchoId?`, `clearedAt?`, `clearNote?`
- `isHouse?`, `createdAt`, `updatedAt`

### Subcollections

- `locks/{id}/echoes/{echoId}` — text, lockScore, lockLabel, parentEchoId, authorId/Name, isPick, createdAt
- `locks/{id}/watchers/{userId}` — watch state
- `locks/{id}/clearOffers/{…}` — clear-for-release offers

### Feature flag

- `config/lockFeature` — admin live toggle

Rules: see `firestore.rules` → `match /locks/{lockId}` and public-read `config/{configId}`.

---

## 8. Scoring (how the stamp is made)

File: `src/lib/lock/score-echo.ts`

- Token overlap vs DNA snapshot (or seed if no DNA)
- End-sound / rhyme hitch vs seed last word
- Length penalties for tiny/huge lines
- Maps to score + label (`Off-world` / `In-world` / `Hard LOCK`)
- **Free & guest-safe** — no Ink burn, no LLM call

---

## 9. Routes & APIs

### Pages

| Path | Role |
|--|--|
| `/lock/house` | House dare |
| `/lock/[id]` | Public LOCK UI |
| `/lock/[id]/bloodline` | **Verse Tree** — Song so far + forks; browse by Newest / Best fit / Artist pick |
| `/lock/[id]/manage` | Owner: Pick, Close, Clear for release |
| `/admin` → Config | LOCK System card + Invite Gate |

### APIs

| Method | Path | Role |
|--|--|--|
| GET | `/api/lock/status` | Public on/off |
| GET/POST | `/api/admin/lock-feature` | Admin config |
| POST | `/api/lock` | Create Open LOCK (auth) |
| GET | `/api/lock/[id]` | Lock + top echoes |
| POST | `/api/lock/[id]/echo` | Submit bar (guest or auth) |
| POST | `/api/lock/[id]/watch` | Claim name + watch |
| GET | `/api/lock/[id]/bloodline` | Full echo list |
| POST | `/api/lock/[id]/pick` | Artist Pick |
| POST | `/api/lock/[id]/clear` | Clear-for-release offer / respond |
| POST | `/api/lock/[id]/close` | Owner closes cast |
| GET | `/api/discover` | Includes Open LOCK cards when feature on |

---

## 10. UI surfaces (where LOCK appears)

1. **Public LOCK page** — seed, composer, score card, Unnamed pressure, Where next doors, Top locks
2. **Verse Tree (Bloodline)** — path explorer: pick forks to build the composed verse; write from tip; ancestry always visible
3. **Manage** — Pick / Close / Clear
4. **Press Desk** — Publish Open LOCK panel (Artist Home edit)
5. **Artist Home module** `openLock` — featured cast link (hidden if system off)
6. **Scene Discover** — “Open LOCK” cards
7. **Activity** types: `lock_answered`, `artist_pick`, `lock_clear_offer`
8. **How-to** chapter + FAQs; **What’s New** item when feature on
9. **Admin Config** — LOCK System toggle

Shared look: `LockShell` / `LockPlate` / `LockVersePath` / `LockVerseForks` — Scene-like glow, grain, headline type.

Helpers: `src/lib/lock/bloodline-tree.ts` (index, ancestry, children).

---

## 11. Scenario playbooks

### Scenario A — Cold visitor (conversion happy path)

1. Admin has finish-the-bar **ON**
2. Visitor hits marketing/`/try` (or a shared `/lock/...` link)
3. Sees the unfinished bar, types a reply → **Drop your bar**
4. Gets Fit score card + share; CTAs prioritize Studio handoff
5. Optional sign-in to put their name on the reply + watch Activity
6. After auth, `LockClaimBootstrap` claims reply + starts watch
7. **Where next:** Keep writing in Studio · Verse Tree · Artist Home · Scene

**Feel:** clear dare → write → keep writing in the real product (not jargon walls).

---

### Scenario B — Visitor stays Unnamed

1. Locks a bar, closes tab
2. Echo remains on bloodline as **Unnamed**
3. No Activity when others answer
4. Artist can still see the bar; Clear-for-release **blocked** until named

**Feel:** low-friction write still feeds the cast; conversion not required to participate.

---

### Scenario C — Answer from here (branching / Verse Tree)

1. On public page, tap **Continue from here** on a reply — **Song so far** shows seed + every prior bar in the chain (not just the tip)
2. Or open **Verse Tree** (`/lock/[id]/bloodline`): pick forks to walk a strain; **Song so far** builds the composed verse
3. **Write next from this tip** → `/lock/[id]?branch=…` with full ancestry restored
4. Submit sets `parentEchoId` → bloodline shows branched fork under that tip
5. Deep `?branch=` always walks parents so you never reply blind to a line mid-song

---

### Scenario D — Artist publishes their own cast

1. LOCK System **ON**
2. Edit Public Page / Press Desk → Open LOCK
3. Enter seed (± embed URL) → publish
4. Enable **Open LOCK** module; store `featured.openLockId`
5. Share `/lock/{id}` or Artist Home module
6. Manage → Pick winner → optional Clear offer % → optional **Close LOCK**

House LOCK cannot be closed (platform cast).

---

### Scenario E — Artist Pick + Clear for release

1. Echoes pile up; owner opens Manage
2. **Pick** a named echo → Activity `artist_pick` to author
3. Clear for release with optional `%` → Activity `lock_clear_offer`
4. If pick is Unnamed → clear blocked until they name

---

### Scenario F — Close the cast

1. Owner Manage → **Close LOCK** (confirm)
2. `status: closed` — no new echoes
3. Bloodline / Pick / Clear still usable
4. Public page shows closed banner

---

### Scenario G — Studio depth handoff

1. After stamp, **Open in studio**
2. Persists demo lines `[seed, echo]` → `/try`
3. Guest/full sheet with DNA tools — secondary depth, not the first door

---

### Scenario H — Soft kill mid-campaign

1. Admin → LOCK System → Off → Deploy
2. Guest `/` stays Pressing playground; `/lock/*` redirects home; APIs 404 “LOCK is off”
3. Existing Firestore locks remain; just unreachable via product door
4. Existing Firestore locks remain; just unreachable via product door

---

### Scenario I — Emergency hard kill

1. Set `LOCK_FORCE_OFF=1`, restart
2. Admin cannot enable until env cleared
3. Use if Firestore toggle unreachable / incident

---

### Scenario J — Local dogfood before first admin save

1. `NEXT_PUBLIC_LOCK=1` in `.env.local`
2. System on via **env bootstrap**
3. Open Admin LOCK card → Deploy once → Admin becomes source of truth
4. Can remove env bootstrap afterward

---

## 12. Unnamed vs Named (conversion table)

| | Unnamed (guest) | Named + watch |
|--|--|--|
| Write / Lock it | Yes | Yes |
| Bloodline label | Unnamed | Display name |
| Share LOCK card | Yes | Yes |
| Activity on answers / picks / clear | No | Yes |
| Artist Pick credit path | Visible but weak | Yes |
| Clear for release | No | Yes if picked |
| Post-signup land | — | The Scene (`/`) + claim bootstrap |

---

## 13. Post-stamp “Where next” (feature intro)

After Lock it, doors teach the rest of the app:

| Door | Teaches |
|--|--|
| Enter The Scene | Home block, Discover, friends wall — cast stays alive |
| Walk the Verse Tree | Interactive path: Song so far + forks; browse filters jump into a path |
| Open in studio | Full sheet, DNA, Ink, remix |
| Visit Artist Home | Public face of the casting artist |

---

## 14. Activity & notifications

- Named echo lands → watchers get `lock_answered` (anon submits skip notify to avoid junk)
- Artist Pick → `artist_pick`
- Clear offer → `lock_clear_offer`
- Watch requires auth + claim path via `/api/lock/.../watch`

---

## 15. Commit / change history (for this branch)

### Committed on `feat/lock`

| Commit | What |
|--|--|
| `87ea44a` | Scaffold + kill flag + house door |
| `4cd6602` | Full social LOCK: Firestore, APIs, public UI, bloodline, manage, watch/Activity, Press Desk, Discover, Artist Home module, score, docs |
| `9992f84` | Server-pass / layout gate so localhost honors flag (client `NEXT_PUBLIC_*` inlining unreliable) |

### Uncommitted since `9992f84` (at time of writing)

- **LockShell** visual language (Scene-matched atmosphere)
- Clear **Continue from here** → Song so far path + composer focus
- **Close LOCK** API + Manage UI
- **Still Unnamed** + **Where next** conversion doors; signup next → Scene
- How-to chapter/FAQs + What’s New LOCK card
- **Admin LOCK System** toggle (`config/lockFeature`, `/api/lock/status`, `/api/admin/lock-feature`)
- Wire all lock APIs / home / discover / client hooks to async admin flag

---

## 16. Key files (map)

| Area | Path |
|--|--|
| Flag (client sync / types) | `src/lib/lock-feature.ts` |
| Flag (server resolve) | `src/lib/server/lock-feature.ts` |
| Server CRUD / notify | `src/lib/server/lock.ts` |
| Score | `src/lib/lock/score-echo.ts` |
| Types | `src/lib/lock/types.ts` |
| Handoff session | `src/lib/lock/session.ts` |
| Public UI | `src/components/lock/lock-public-page.tsx` |
| Shell | `src/components/lock/lock-shell.tsx` |
| Claim after signup | `src/components/lock/lock-claim-bootstrap.tsx` |
| Publish | `src/components/lock/publish-open-lock-panel.tsx` |
| Admin card | `src/components/admin-lock-feature-card.tsx` |
| Hook | `src/hooks/use-lock-feature.ts` |
| Short ops doc | `docs/LOCK.md` |
| This manual | `docs/LOCK-MANUAL.md` |

---

## 17. Dogfood checklist

- [ ] Admin → LOCK System **On** → Deploy
- [ ] Incognito `/` → house LOCK
- [ ] Lock a bar → score card → Unnamed plate
- [ ] Continue from here → Song so far (full ancestry) → branch
- [ ] Name echo / signup → Scene + claim toast
- [ ] Verse Tree: pick forks → composed path; Write from tip
- [ ] `?branch=` deep link restores ancestry path
- [ ] Publish own LOCK from Press Desk
- [ ] Manage Pick → Clear → Close
- [ ] Discover shows Open LOCK card when signed in
- [ ] Admin Off → `/` no longer forces LOCK; `/lock/house` redirects home
- [ ] Telegram: open / lock / branch / name CTA appear in chat
- [ ] Admin Metrics → LOCK finish-the-bar funnel shows counts

---

## 18. Analytics & Telegram (funnel)

See also short table in `docs/LOCK.md`.

**Drop-off ladder (Admin Metrics):**

Open → Typed → Locked → (optional Branch) → Name CTA / Signup CTA / Where next

**“Someone wrote after someone else”** = `lock_branch` (server-fired when `parentEchoId` is set on echo submit). Telegram headline: *Answered after someone else*.

Collection: `studio_lock_funnel_events` · API: `/api/analytics/lock-funnel` · Alert kind: `lock_funnel`

---

## 19. Non-goals / constraints (do not break)

- No music generation
- No audio file storage (embeds only)
- Do not merge `feat/lock` to `main` until dogfooded
- Prefer Admin soft kill over deleting data
- Keep `/try` reachable as full-sheet escape

---

*End of manual.*
