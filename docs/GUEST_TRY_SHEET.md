# Guest try sheet (real editor, no signup first)

New devices hitting `/` open the **real track editor** (`/albums/try/tracks/guest-sheet`) instead of the marketing landing.

## Demo AI vs signup Ink (separate)

| | Guest try (logged out) | After signup |
|--|--|--|
| What you get | Up to **3 Generate Next** assists / browser | **250 Ink** (`SIGNUP_INK`) on the account |
| Spends | Cookie `b4b_demo_uses` — **not** Ink | Real Ink balance |
| Shared? | No — demo cap does not reduce signup Ink | Signup Ink does not refill the demo cookie |

Other Co-Writer tools on the try sheet need an account. Only Generate Next is on the free demo path.

## Revert / disable

**Fast off-switch (no git rollback):**

```env
NEXT_PUBLIC_GUEST_TRY_SHEET=0
```

Redeploy. Logged-out users see the landing on `/` again. `/welcome` still shows the marketing page; `/try` redirects to `/welcome`.

**Full code rollback:** revert the commit that introduced guest try.

## Routes

| Path | Behavior |
|------|----------|
| `/` (logged out) | Redirect → guest try sheet (when flag on) |
| `/albums/try/tracks/guest-sheet` | Real `TrackEditor` — local-only vault, demo AI caps |
| `/welcome` | Marketing landing (pitch + old demo sheet) |
| `/try` | Short alias → guest sheet |

## Soft gate

- Write freely; track stays in `localStorage` (`b4b-guest-track`)
- Generate Next uses `/api/ai/demo` (3/browser, IP + global caps) — no Ink
- Sign up to save → bars hand off into “My Demo Track” via `FirstSongHero`
