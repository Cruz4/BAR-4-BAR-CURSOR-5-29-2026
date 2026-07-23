# Computer-use agent playbook (Option B)

You drive the **logged-in TikTok app or TikTok Web** on this PC.  
The human owns the account and filled `targets.txt` / the tracker queue.  
You do **not** scrape for new users. You do **not** invent handles.

## Hard rules

1. **Only** message handles with `status=todo` in `docs/tiktok-outreach/tracker.csv` (after import).
2. **One send per handle.** Never re-DM someone already `sent` / `skipped` / `failed` / `blocked`.
3. **Pace:** wait **3–5 minutes** between successful sends (pick randomly in that range). Max **15 sends per session** unless the human raises the limit in chat.
4. **Stop immediately** on: CAPTCHA, phone verify, “try again later”, send button disabled, chat request limits, suspicious activity, logout, or anything that looks like a block. Set that handle to `blocked`, write what you saw in `note`, and **end the session**.
5. **Do not** claim they are an AI artist. **Do not** edit templates into spammy sales language. Optional: personalize **one** short compliment if their profile/last post is visible — otherwise send the template as-is.
6. **Do not** ask for or type the TikTok password. Account must already be logged in.
7. Stay inside this repo’s outreach files for logging. Prefer the CLI below over hand-editing CSV when possible.

## Session setup (human does this first)

1. Log into TikTok (desktop app **or** https://www.tiktok.com) on this machine.
2. Put handles in `docs/tiktok-outreach/targets.txt` (one per line).
3. In the repo root:

```bash
npm run tiktok:dm -- import-targets
npm run tiktok:dm -- queue
```

4. Start a **Cursor agent with computer use / desktop control** and paste `AGENT-PROMPT.md`.

## Agent loop (per handle)

1. Run: `npm run tiktok:dm -- peek`  
   → prints next `@handle`, template id, and copies message to clipboard.  
   If queue empty → stop and report summary.
2. Open TikTok (app or browser — whichever is already logged in).
3. Go to that user’s profile (search `@handle` or open their URL if known).
4. Open **Message** / DM.
5. Paste clipboard (`Ctrl+V`). Wait ~1–2s. Click **Send**.
6. If send succeeded:

```bash
npm run tiktok:dm -- mark-sent "@handle"
```

7. If messaging isn’t available / privacy / can’t send:

```bash
npm run tiktok:dm -- mark-skip "@handle" "reason here"
```

8. Wait 3–5 minutes. Repeat from step 1 until max session sends or stop rule.

## Status meanings

| status | meaning |
|--------|---------|
| `todo` | waiting to be messaged |
| `sent` | DM sent |
| `skipped` | couldn’t message (privacy, no button, etc.) |
| `failed` | UI error / uncertain |
| `blocked` | platform challenge — **stop session** |

## After the session

Tell the human:
- how many `sent` / `skipped` / `blocked`
- any CAPTCHA or limit hit
- remind them to check TikTok inbox for replies and run `npm run tiktok:dm -- replied "@handle"` when someone answers

## Risk note (for the human)

Automating TikTok DMs can violate TikTok’s Terms and risk account restriction. Keep lists short, pace slow, watch the first few sends yourself.
