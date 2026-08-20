# Project rules

- This is BA, an AI-assisted songwriting workstation—not a full-song generator.
- Preserve the existing architecture, visual identity, Firebase data, Stripe billing, Ink economy, and user-facing behavior.
- Never rewrite an entire file when a targeted change will work.
- Never alter unrelated files.
- Before editing, inspect the relevant implementation and current git diff.
- For ambiguous requests, ask before making structural decisions.
- After editing, run typecheck, lint, tests, and build when available.
- Report every changed file and why it changed.
- Never delete or migrate production data without explicit approval.
- Do not add packages unless necessary and approved.
