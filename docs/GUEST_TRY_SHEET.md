# Guest try sheet + Pressing home

Logged-out home and the free writing sheet are **two doors**:

| Path | What guests get |
|------|-----------------|
| **`/`** | **Pressing playground** — live Artist Home draft (name, bar, Mix, Wall, Friends, Guestbook). Claim free to save; **Try writing free** opens the sheet. |
| **`/try`** | Real track editor (`/albums/try/tracks/guest-sheet`) with an Architect-style unfinished starter — finish the next bar on the sheet. |

Social finish-the-bar (`/lock/*`) is a separate side door when Admin LOCK is on — it never hijacks `/`.

## Pressing playground (guest `/`)

- Session draft: `b4b-guest-pressing-draft` (see `src/lib/guest-pressing-session.ts`)
- Demo Friends + Guestbook show **Neomaiya Sol**; her name links to her live Artist Home (`GET /api/profile/neomaiya` resolves the slug, fallback `neomaiya-sol`)
- After signup (**new accounts only**), claim bootstrap can apply the Pressing draft to the new Artist Home
- **Sign in** as an existing artist discards the sandbox draft — their saved profile is unchanged (no “claimed / saved” toast)

## Demo AI vs signup Ink (try sheet)

| | Guest try sheet (logged out) | After signup |
|--|--|--|
| What you get | Up to **2 Generate Next** assists / browser (`GUEST_DEMO_MAX_USES`) | Signup Ink on the account |
| Spends | Cookie `b4b_demo_uses` — **not** Ink | Real Ink balance |
| Shared? | No — demo cap does not reduce signup Ink | Signup Ink does not refill the demo cookie |

Other Co-Writer tools on the try sheet need an account. Only Generate Next is on the free demo path.

## Disable try sheet deep link (optional)

```env
NEXT_PUBLIC_GUEST_TRY_SHEET=0
```

Redeploy. `/try` no longer treats the guest album path as the try sheet product door (see `src/lib/guest-try.ts`). Guest `/` stays the Pressing playground either way.

## Routes

| Path | Behavior |
|------|----------|
| `/` (logged out) | Pressing / Artist Home playground |
| `/` (logged in) | The Scene (or Vault if Scene kill switch off) |
| `/try` | Alias → guest try sheet |
| `/albums/try/tracks/guest-sheet` | Real `TrackEditor` — local-only vault, demo AI caps |
| `/api/profile/neomaiya` | Public Neomaiya Sol slug lookup (guestbook / friends links) |

## Soft gate (try sheet)

- Write freely; track stays in `localStorage` (`b4b-guest-track`)
- Generate Next uses `/api/ai/demo` (demo caps) — no Ink
- Sign up to save → bars hand off into the account vault via claim / First Song flows
