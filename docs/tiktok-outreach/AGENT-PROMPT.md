# Computer-use TikTok DM session

Repo path: Bar 4 Bar full app. Outreach kit: `docs/tiktok-outreach/`.

## Mission
Message only the handles already queued as `todo` in `docs/tiktok-outreach/tracker.csv`. Use TikTok on this PC (already logged in). Rotate copy via the CLI. Log every outcome. Stop on any block/CAPTCHA.

## Before first send
1. Confirm TikTok is open and logged in (app or browser).
2. Run `npm run tiktok:dm -- queue` and report how many `todo` remain.
3. Cap this session at **15** sends unless I say otherwise.

## Loop
1. `npm run tiktok:dm -- peek` (copies DM to clipboard; shows @handle + template #).
2. In TikTok: open that profile → Message → paste → Send.
3. On success: `npm run tiktok:dm -- mark-sent "@handle"`
4. If you can’t message them: `npm run tiktok:dm -- mark-skip "@handle" "reason"`
5. Wait **3–5 minutes**, then next `peek`.
6. Stop if queue empty, hit session cap, or anything looks blocked → `npm run tiktok:dm -- mark-blocked "@handle" "what you saw"` and end.

## Rules
- Do not invent handles or scrape for more users.
- Do not say they are an AI artist.
- Do not re-message people already sent/skipped/failed/blocked.
- Do not enter passwords.
- Prefer CLI for tracker updates.
- Quote handles in shell commands: `"@name"` (Windows PowerShell).

## When done
Summarize counts (sent / skipped / blocked / remaining todo) and any issues.
