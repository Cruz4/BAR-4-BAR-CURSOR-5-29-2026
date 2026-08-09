# LOCK — full social engagement (kill-flagged)

Unfinished-bar dares with DNA LOCK stamps, echo bloodlines, watch/Activity push, Artist Home + Scene, Artist Pick, studio handoff, and clear-for-release offers.

## Kill flag / restore

| | Behavior |
|--|--|
| `NEXT_PUBLIC_LOCK` unset / `0` | **OFF (default)** — `/` unchanged; `/lock/*` redirects home |
| `NEXT_PUBLIC_LOCK=1` | **ON** — logged-out `/` → `/lock/house`; full LOCK product live |

```env
# .env.local
NEXT_PUBLIC_LOCK=1
```

**Soft kill:** set `NEXT_PUBLIC_LOCK=0` (or unset) + restart/redeploy.  
**Hard rollback:** `git checkout pre-lock` or `checkpoint/pre-lock`.  
Feature branch: `feat/lock`. Do not merge to `main` until ready.

## Product loop

1. Artist publishes Open LOCK (Press Desk → Open LOCK) or use house LOCK  
2. Anyone writes next bar (no account) → **LOCK score stamp** + share card  
3. **Name your echo** (signup) → claim + **watch** → Activity/push on answers & picks  
4. Artist **Pick** + optional **Clear for release** split/credit offer  
5. Scene Discover shows live LOCKs; Artist Home module links in  
6. **Open in studio** deepens into the sheet (optional)

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
| `/lock/[id]/bloodline` | Strain tree / filters |
| `/lock/[id]/manage` | Owner pick + clear |
| `/api/lock/*` | Persist / watch / pick / clear |

## Home priority (logged out)

LOCK (if on) → guest try → marketing landing. `/try` always remains the full-sheet escape.
