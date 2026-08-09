# LOCK scaffold (kill-flagged)

Public unfinished-bar dare surface. Scaffold only — no DNA score, bloodline DB, Artist Pick, or audio storage yet.

## Kill flag

| | Behavior |
|--|--|
| `NEXT_PUBLIC_LOCK` unset / empty / `0` | **OFF (default)** — `/` unchanged (guest try or marketing); `/lock/*` redirects home |
| `NEXT_PUBLIC_LOCK=1` | **ON** — logged-out `/` → `/lock/house`; scaffold UI on `/lock/*` |

```env
# Local experiment only (.env.local) — do not enable in production until ready
NEXT_PUBLIC_LOCK=1
```

Redeploy / restart Next after changing the flag.

## Soft revert (no git)

```env
NEXT_PUBLIC_LOCK=0
```

Or remove the variable. Logged-out users get today’s door again.

## Hard rollback

- Tag: `pre-lock`
- Branch: `checkpoint/pre-lock`

```bash
git checkout pre-lock
# or
git checkout checkpoint/pre-lock
```

Feature work lives on `feat/lock`. Leave `main` alone until you deliberately merge.

## Routes

| Path | Flag OFF | Flag ON |
|------|----------|---------|
| `/` (logged out) | Guest try or marketing (unchanged) | Redirect → `/lock/house` |
| `/lock/house` | Redirect → `/` | House LOCK scaffold |
| `/lock/[lockId]` | Redirect → `/` | Same scaffold shell (placeholder id) |
| `/try` | Guest sheet | Guest sheet (escape hatch) |
| `/welcome` | Marketing | Marketing |

## Home priority (logged out)

1. LOCK (if on) → `/lock/house`
2. Guest try sheet (if on) → `/albums/try/tracks/guest-sheet`
3. Else → public marketing landing

## Scaffold UI

- Seed bar placeholder + one textarea + **LOCK IT** (no-op until later)
- Rights microcopy (display only; no ownership by submitting)
- Links to `/welcome` and `/try`
- No Firestore writes, no audio upload, no music gen

## Invite gate

`/lock/` is invite-gate exempt (same idea as `/share/`) so public LOCK URLs work during private beta when the flag is on.
