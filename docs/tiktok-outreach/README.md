# TikTok DM Outreach Kit

Helpers for **manual** or **computer-use assisted** TikTok DMs.  
Nothing here scrapes TikTok or sends messages by itself — Send still happens in the TikTok app/web.

## Option B — Computer-use agent (recommended path for hands-off clicking)

1. Log into TikTok on this PC (app or browser).
2. Put handles in `targets.txt` (one per line).
3. Import + check queue:

```bash
npm run tiktok:dm -- import-targets
npm run tiktok:dm -- queue
```

4. Start a **Cursor agent with computer use / desktop control**.
5. Paste the contents of **`AGENT-PROMPT.md`** as the agent’s instructions  
   (full detail in **`COMPUTER-USE-PLAYBOOK.md`**).

The agent will: `peek` → open TikTok → paste → Send → `mark-sent` → wait 3–5 min → repeat.  
It must **stop** on CAPTCHA / limits (`mark-blocked`).

## Manual quick start

```bash
npm run tiktok:dm
npm run tiktok:dm -- next "@someartist" "liked their freestyle"
npm run tiktok:dm -- list
npm run tiktok:dm -- stats
npm run tiktok:dm -- replied "@someartist"
```

**Windows PowerShell:** always quote handles — `"@name"`.

## Queue commands

```bash
npm run tiktok:dm -- import-targets   # targets.txt → tracker todo rows
npm run tiktok:dm -- queue            # list todos
npm run tiktok:dm -- peek             # next todo + copy message
npm run tiktok:dm -- mark-sent "@h"
npm run tiktok:dm -- mark-skip "@h" "no message button"
npm run tiktok:dm -- mark-failed "@h" "ui glitch"
npm run tiktok:dm -- mark-blocked "@h" "captcha"
```

## Files

| File | Purpose |
|------|---------|
| `targets.txt` | Your list of handles to import |
| `dm-templates.json` | 20 human-tone DM variants |
| `tracker.csv` | Queue + send log |
| `AGENT-PROMPT.md` | Paste this into a computer-use agent |
| `COMPUTER-USE-PLAYBOOK.md` | Full Option B rules |
| `../../scripts/tiktok-dm-outreach.mjs` | CLI |

## Pace / risk

Keep lists short. Space sends. Watch the first few if an agent is driving. Automating TikTok DMs can risk account limits — use slowly and only on handles you chose.
