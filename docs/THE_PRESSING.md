# The Pressing — Living Field specification

Spec for another engineer or model to **understand, preserve, and recreate 1:1**.

The Pressing is AKAsheet’s generative Artist Home skin. It is **not** an image generator, **not** a per-letter style map, and **not** a server-side render.

If this file and `src/lib/profile/pressing.ts` disagree, **`pressing.ts` wins.**

## Canonical files

| Piece | Path |
|---|---|
| Composition engine (pure, client-safe) | `src/lib/profile/pressing.ts` |
| Painter (DOM / SVG / CSS) | `src/components/profile/living-press-field.tsx` |
| Owner editor | `src/components/profile/press-desk.tsx` (section “The Pressing”) |
| Persist / public mirror | `src/lib/server/artist-home.ts`, `src/app/api/profile/config/route.ts` |
| Guest sandbox draft | `src/lib/guest-pressing-session.ts` |
| Scene swipe backdrop | `src/components/scene/scene-immersive-feed-dialog.tsx` |
| Word split | `src/lib/lyrics-analysis/phonetics.ts` (`tokenizeLine`) |
| Syllable count | `src/lib/lyrics-analysis/syllables.ts` (`heuristicSyllables`) |

Product rule: **same seed + same faders = same skin, forever, on every device.**

---

## 1. Purpose

The Pressing is how an artist’s **lyrics style their public page**.

- Artist Home is not a generic dark theme. It is a unique “pressed plate” derived from a bar the artist chooses.
- Editor copy: *Pick the bar your skin is pressed from. Same bar, same skin — your lyrics style your page.*
- The field can **breathe** (Alive) with the bar’s syllable meter. Color does **not** rainbow-shift on scroll.
- It is a **brandable living background**, reused on Artist Home, the logged-out playground, Library, and Scene swipe-or-scroll (static, no motion).

What it is **not**:

- Not a stored PNG / WebGL scene.
- Not one style per letter.
- Not AI image generation.
- Not studio **Ink** currency. The fader named `ink` only means background darkness.

---

## 2. Mental model

```
seedText (≤280 chars) + faders + alive + autoDrift
        │
        ▼
   pressTokens()     ← pure, deterministic, no I/O
        │
        ├── hue / saturation / darkness
        ├── 2–4 visual layers from a 24-kind vocabulary
        ├── aperture, die-cut, type variant, plate serial
        └── CSS variables
        │
        ▼
 LivingPressField    ← paints layers; optional motion
```

**Letters do not have styles.** The entire normalized string is hashed. Changing one character can change hue, layer kinds, and geometry because the hash avalanches.

A second channel uses **words + syllables** (not letters) to bend some geometry (groove lobes, ghost words, breath period, density).

---

## 3. Persisted config (the only stored state)

```ts
type PressingFaders = {
  heat: number;  // 0–100
  grain: number;
  pace: number;
  ink: number;
};

type PressingConfig = {
  seedText: string;    // max 280
  faders: PressingFaders;
  alive?: boolean;     // default true — motion on
  autoDrift?: boolean; // default false — faster motion, NEVER recolors
};
```

Defaults (`DEFAULT_PRESSING` in `pressing.ts`):

| Field | Default |
|---|---|
| `seedText` | `Change this text to watch your page change.....` |
| `heat` | 55 |
| `grain` | 30 |
| `pace` | 40 |
| `ink` | 80 |
| `alive` | `true` |
| `autoDrift` | `false` |

Fader UX labels (Press Desk):

| Key | UI label | Low | High | Effect |
|---|---|---|---|---|
| `heat` | Color | washed | vivid | saturation + some layer punch |
| `grain` | Texture | clean | gritty | film grain opacity + mesh warp |
| `pace` | Motion | calm | restless | spin / breath speed |
| `ink` | Depth | lifted | deep night | background lightness (darker when high) |

Normalize on every read/write (`normalizePressingConfig`): trim seed, empty → default seed, clamp faders 0–100, `alive !== false`, `autoDrift === true` only.

**Do not persist `PressingTokens`.** Tokens are always recomputed.

---

## 4. Where it lives in data

`ArtistHomeConfig.theme` **is** the Pressing.

| Copy | Location |
|---|---|
| Owner | Firestore `users/{uid}/gamification/artistHome` |
| Public | `publicProfiles/{slug}.artistHome` (mirrored on save / gamification sync) |
| Save API | Authenticated `POST /api/profile/config` → `saveArtistHomeConfig` |
| Guest (logged out) | `sessionStorage` key `b4b-guest-pressing-draft` until claim |

Scene posts / Discover cards copy `theme` onto the card as `pressing?: PressingConfig` so swipe-or-scroll can paint without an extra fetch.

---

## 5. Engine algorithm (`pressTokens`) — recreate this exactly

All math is unsigned 32-bit (`>>> 0`). JavaScript `Math.imul` is required for 1:1 hashes.

### 5.1 Normalize seed

```
seedText = (config.seedText || DEFAULT).slice(0, 280)
hash input = seedText.trim().toLowerCase().replace(/\s+/g, ' ')
```

Case and extra whitespace do not change the hash. Adding a letter, changing a letter, or adding punctuation **does**.

### 5.2 `hashSeed` — FNV-1a 32-bit

```
offset = 0x811c9dc5
prime  = 0x01000193
hash = offset
for each char c in normalized:
  hash ^= charCode(c)
  hash = imul(hash, prime)
return hash >>> 0
```

This is the **identity of the bar**. Hue is `seedHash % 360`.

### 5.3 `mix(a, b)`

```
h = (a >>> 0) ^ imul(b >>> 0, 0x85ebca6b)
h = imul(h ^ (h >>> 13), 0xc2b2ae35)
return (h ^ (h >>> 16)) >>> 0
```

### 5.4 `identityHash` / `pressHash`

```
pressHash = mix(seedHash, heat*1009 + grain*1013 + pace*1019 + ink*1021)
```

Same bar, different faders → different `pressHash` (layers / geometry can change). Hue still comes from `seedHash`, so faders should not recolor the plate’s primary hue.

### 5.5 Syllable stats

```
words = tokenizeLine(seedText).slice(0, 16)
totalSyllables = sum(max(1, heuristicSyllables(w)) for w in words)  // empty → 2
density = totalSyllables / words.length                             // empty → 1.6
```

`tokenizeLine`: split on whitespace, normalize each word, drop empties.

`heuristicSyllables`: vowel-group count with silent-e / `-ed` / `-es` / `-le` / `-ism` / hiatus rules. See `src/lib/lyrics-analysis/syllables.ts`. **Do not use the CMU dictionary in Pressing** — heuristic only, so it stays client-safe and identical on every device.

Breath:

```
spoken = max(2.4, totalSyllables * 0.22)
breathSec = clamp(spoken * (1.55 - pace * 0.009), 3.2, 14)  // 2 decimals
```

### 5.6 Derived look

```
hue  = seedHash % 360
hue2 = (hue + 14 + ((pressHash >>> 8) % 22)) % 360
hue3 = (hue + 6  + ((pressHash >>> 12) % 14)) % 360

plateFamily = (pressHash >>> 8) % 8          // 0–7
aperture    = (pressHash >>> 20) % 5         // 0–4 vignette shape
cutStyle    = (pressHash >>> 18) % 6         // 0–5 die-cut clip
plateSkew   = ((pressHash >>> 22) % 25) / 10 - 1.2   // 2 decimals
typeVariant = (pressHash >>> 24) % 4         // headline tracking / italic

saturation  = clamp(32 + heat*0.5 + (density - 1.6)*8, 20, 88)
bgL         = clamp(11 - ink*0.09, 2, 11)
cardL       = clamp(bgL + 5, 6, 17)
grainOpacity = grain * 0.0024                // 4 decimals
motionSec   = round(clamp(40 - pace*0.26, 12, 40))
radiusPx    = clamp(round(10 + ((pressHash >>> 5)%10) - (density-1.2)*2), 4, 18)
```

### 5.7 Pick 2–4 layer kinds from 24

Vocabulary (`ALL_KINDS` order):

`grooves, wells, ribbons, mesh, ghosts, curtains, facets, ripples, arcs, motes, blade, film, lattice, beams, orbitals, scan, constellation, prisms, aurora, horizon, signal, spires, nova, circuit`

```
count = 2 + ((pressHash >>> 3) % 3)   // 2, 3, or 4
pool = copy(ALL_KINDS)
h = pressHash
repeat count times:
  h = mix(h, i * 9973 + 13)
  pick pool[h % pool.length], splice it out
if every picked kind is in ACCENT_ONLY { film, blade, scan, motes, spires }:
  replace first kind with 'grooves'
```

Each layer:

```
buildLayer(kind, seedText, mix(pressHash, i * 7919), words, faders, breathSec, depth)
depth = 0.35 + i * 0.22
```

`compositionId` = first two letters of each kind joined + `((pressHash >>> 16) % 100).toString(36)`

`plateSerial` = `(family+10).toString(36).toUpperCase() + "-" + (hash & 0xffff).toString(16).padStart(4,'0').toUpperCase() + "-" + ((hash>>>16)%100).toString().padStart(2,'0')`

### 5.8 Layer builders

Geometry is hash-driven. Recreate from the `buildLayer` switch in `pressing.ts` — do not invent new formulas if 1:1 is required.

Text coupling (the only places the bar “shows”):

- **grooves** — rings via `groovePathAtRadius(words, hash, lobes, …)`. Each word’s syllable count is an amplitude on a harmonic of the ring. `lobes = clamp(3 + min(words.length, 8), 3, 11)`. Ring count `n = 5 + ((hash >>> 4) % 6)`. Rotate seconds from pace.
- **ghosts** — up to 3 longest words (length ≥ 3, letters / `'` only), uppercase, placed as faint type. Fallback word `PRESS`.
- Other kinds (wells, ribbons, mesh, lattice, beams, orbitals, scan, constellation, prisms, aurora, horizon, signal, spires, nova, circuit, curtains, facets, ripples, arcs, motes, blade, film) are hash + fader geometry only.

### 5.9 CSS variables (`pressingCssVars`)

Sets `--ph-hue`, `--ph-hue2`, `--ph-hue3`, `--ph-bg`, `--ph-bg2`, `--ph-plate`, `--ph-card`, `--ph-card-solid`, `--ph-border`, `--ph-accent`, `--ph-accent-soft`, `--ph-accent2`, `--ph-accent2-soft`, `--ph-text`, `--ph-muted`, `--ph-grain`, `--ph-motion`, `--ph-breath`, `--ph-radius`, `--ph-skew`.

Copy formulas from `pressingCssVars` in `pressing.ts`.

`apertureMask(mode, hue)` and `dieCutClip(style)` are fixed CSS strings (5 apertures, 6 clips). Copy verbatim.

`pressingTypeClass(typeVariant)` maps 0–3 to headline tracking / italic classes.

---

## 6. What happens when the seed changes

| Edit | Result |
|---|---|
| Add / remove / change a character | New `seedHash` → hue can jump; layer kinds can swap; groove / ghost geometry changes |
| Only case or extra spaces | Often **no change** (normalize) |
| Same letters, different words | Hash changes **and** word / syllable channel changes |
| Faders only | Hue stays; mix, speed, darkness, some geometry / `pressHash` kinds can change |
| Toggle Alive | Same tokens; painter disables breathe / spin |
| Toggle Restless (`autoDrift`) | Faster stylus / spin only; never recolors |

There is **no interpolation** between seeds. Preview is instant: React state → `pressTokens` → paint. Save is a later POST.

---

## 7. Painter (`LivingPressField`)

- Input: `config` **or** precomputed `tokens`.
- `pressTokens(config)` in a `useMemo`.
- Injects keyframe CSS (`LIVING_CSS`): groove spin, well breath, ghost drift, ribbon flow, ripple, mote, blade, stylus, scan, orbit, aurora, signal, nova, circuit blink. `@media (prefers-reduced-motion: reduce)` kills `.ph-living-anim`.
- Stack: radial plate → `LayerView` per layer → aperture vignette → extra vignette if not `compact` → optional plate serial → optional SVG turbulence grain.
- `followWindowScroll`: parallax from `window.scrollY` (Artist Home). Overlays pass `false`.
- `staticField` (Scene swipe): paint composition with **no** breathe / spin / parallax; skip grain + serial; skip heavy blurs on wells. Hue plate still shows.
- `compact`: absolute positioning, smaller parallax (Press Desk preview).
- Motion on iff `!staticField && tokens.alive && !prefers-reduced-motion`.
- Restless iff `autoDrift && motionOk`.

Scroll **must never recolor**. Only `translate3d` / phase.

---

## 8. Surfaces (use)

| Surface | Behavior |
|---|---|
| Press Desk / Edit Public Page | Live preview; textarea + vault bar picker; Alive / Restless; four sliders; Randomize faders |
| Public Artist Home | Full living field behind modules |
| Logged-out `/` playground | Guest types name + bar; same engine; claim copies draft |
| Library | Owner pressing behind owned music |
| Scene swipe-or-scroll | `staticField`; keep ~8 recent artist fields mounted; CSS `--ph-bg` first; highlight via IntersectionObserver |

Do **not** mount a full living field (with RAF parallax) inside a snap-scroll feed. First paint of 2–4 SVG / blur layers on index change is what made swipe lag, and it delayed the bubble highlight on the same render.

---

## 9. Recreation checklist (1:1)

1. Port `pressing.ts` unchanged (hashes, mix constants, layer formulas, CSS var math, aperture / clip strings).
2. Port `heuristicSyllables` + `tokenizeLine` (heuristic path only).
3. Port `LivingPressField` layer SVG / DOM for all 24 kinds.
4. Persist only `PressingConfig`; never bake images.
5. Hue from seed hash only; scroll / restless never hue-shift.
6. Seed max 280; faders 0–100 integers.
7. Accent-only stack fallback to `grooves`.
8. Default seed string **exactly** as above if you want the shipping empty-state plate.
9. Verify: same seed + faders on two machines → identical `--ph-bg`, `compositionId`, `plateSerial`, layer kind list.

Golden test suggestion: hash `Change this text to watch your page change.....` with default faders and snapshot `seedHash`, `pressHash`, `hue`, picked kinds, and `compositionId`.

---

## 10. Constraints / product invariants

- Pure function; safe in browser and Node.
- No network in `pressTokens`.
- Artist Home public mirror must include `theme` so visitors need no owner auth.
- Vault lyrics stay private. The Pressing seed is **chosen public skin text**, not the whole vault.
- Scene feed should treat Pressing as a **theme object already on the card**, then paint locally.

---

## 11. File map

```
src/lib/profile/pressing.ts                         engine
src/components/profile/living-press-field.tsx       paint
src/components/profile/press-desk.tsx               editor
src/lib/profile/modules.ts                          ArtistHomeConfig.theme
src/lib/server/artist-home.ts                       Firestore + publicProfiles
src/app/api/profile/config/route.ts                 GET / POST
src/lib/guest-pressing-session.ts                   guest draft
src/components/scene/scene-immersive-feed-dialog.tsx  static reuse
```
