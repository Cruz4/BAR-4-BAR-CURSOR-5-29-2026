# LOCK — full social engagement (kill-flagged)

Unfinished-bar dares with DNA LOCK stamps, echo bloodlines, watch/Activity push, Artist Home + Scene, Artist Pick, studio handoff, and clear-for-release offers.

## Kill flag / restore

| | Behavior |
|--|--|
| **Admin → Config → LOCK System** | **Live on/off** (Firestore `config/lockFeature`) — no redeploy |
| Never saved in admin yet | Falls back to `NEXT_PUBLIC_LOCK=1` bootstrap if set |
| `LOCK_FORCE_OFF=1` | **Hard kill** — overrides admin until env cleared + restart |
| Code rollback | `git checkout pre-lock` or `checkpoint/pre-lock` |

```env
# Optional local bootstrap before first admin save
NEXT_PUBLIC_LOCK=1

# Emergency only (overrides Admin)
LOCK_FORCE_OFF=1
```

**Soft kill (preferred):** Admin Panel → Config → LOCK System → Off → Deploy.  
**Hard kill:** `LOCK_FORCE_OFF=1` + restart/redeploy.  
**Hard rollback:** `git checkout pre-lock`.  
Feature branch: `feat/lock`. Do not merge to `main` until ready.

## Guest home (important)

**Logged-out `/` is the Pressing / Artist Home playground** (type your name + bar → live page). Demo **Friends** and **Guestbook** include Neomaiya Sol — tap her name to open her live Artist Home (`/api/profile/neomaiya`). Finish-the-bar on the **try sheet** (`/try`) seeds a deep Lyrical Architect unfinished line. Social finish-the-bar (`/lock/*`) stays a side door when the Admin flag is on — never the home hijack. See [GUEST_TRY_SHEET.md](./GUEST_TRY_SHEET.md).

## Product loop

1. Artist publishes an unfinished bar (Press Desk) or use house prompt at `/lock/house`  
2. Anyone writes the next bar (no account) → **Fit score** + share card  
3. Optional: sign in to put your name on the reply + watch Activity  
4. Post-submit doors: Keep writing in Studio · Share · All replies · Artist Home  
5. Artist **Pick** · optional **Close** · **Clear for release**  
6. Scene Discover can show live casts; Artist Home module links in (when enabled)  


## Rights

- Submit = display license only  
- Artist Pick = credit  
- Clear for release = optional split offer (accept/decline)  
- No music gen · no audio storage (embed URLs only)

## Routes

| Path | Role |
|------|------|
| `/lock/house` | Platform house dare |
| `/lock/[id]` | Public LOCK |
| `/lock/[id]/bloodline` | Verse Tree path explorer |
| `/lock/[id]/manage` | Owner pick + clear + **close** |
| `/api/lock/*` | Persist / watch / pick / clear / close |

## Unnamed vs named

| | Unnamed (guest) | Named + watch |
|--|--|--|
| Write | Yes | Yes |
| Bloodline label | Unnamed | Display name |
| Activity | No | Yes (answers, picks, clear) |
| Clear for release | No | Yes if picked |

## Analytics & Telegram

LOCK funnel mirrors the guest try-sheet tracker.

| Event | When | Telegram |
|--|--|--|
| `lock_open` | Viewed a LOCK page | Yes |
| `lock_typed` | Started typing (once/session) | No (metrics only — drop-off) |
| `lock_submit` | Locked a bar (server on echo API) | Yes |
| `lock_branch` | Answered from someone else's echo | Yes — “Answered after someone else” |
| `lock_share_card` | Downloaded/copied stamp card | Yes |
| `lock_name_cta` | Tapped Name your echo | Yes |
| `lock_signup_cta` | Left for signup | Yes |
| `lock_where_next` | Scene / bloodline / Artist Home door | Yes |
| `lock_studio` | Open in studio | Yes |
| `lock_write_another` | Write another | Yes |
| `lock_bloodline` | Opened bloodline | Yes |

- Persist: Firestore `studio_lock_funnel_events`
- API: `POST /api/analytics/lock-funnel`
- Admin Metrics → **LOCK finish-the-bar funnel** drop-off ladder
- In-app admin feed kind: `lock_funnel` (same Telegram bot as signup / guest try)

Requires `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` (disable with `TELEGRAM_ALERTS_ENABLED=false`).

## Home priority (logged out)

LOCK (if on) → guest try → marketing landing. `/try` always remains the full-sheet escape.

After naming, signup `next` prefers **The Scene** (`/`) so the cast feels like joining the living home — not a blank SaaS sheet.
