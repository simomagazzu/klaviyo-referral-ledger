---
description: Run a comprehensive security audit on the codebase
---

# Security Audit

Run the `security-audit` skill against the codebase and produce a full confidence-based report.

## Behavior

1. **Report first, fix second.** Never apply fixes without the user's explicit confirmation.
2. Follow the skill's review process verbatim: scope detection → context loading → per-area scan → exploitability verification → structured output.
3. Use the skill's confidence rubric: only **HIGH** confidence findings go into the main report; **MEDIUM** findings go under "Needs Verification"; **LOW** is omitted.
4. Use the skill's output format (summary table + findings blocks).

## After producing the report

Ask the user directly:

> Want me to fix the Critical and High items? (I'll ask before touching Medium.)

- **User confirms**: apply fixes in order of severity (Critical → High). For Medium findings, ask per-finding before touching. After each batch of fixes, run:
  ```bash
  pnpm lint && pnpm typecheck
  ```
- **User declines**: stop. The report itself is the deliverable.
- **User wants only some items**: apply only what they pick, in order.

## What this command does NOT do

- Does not apply any fixes without confirmation.
- Does not fix Low findings (they aren't reported in the first place).
- Does not run `pnpm audit` by itself — that's part of the skill's "Dependencies" check, already covered.
- Does not open pull requests or commit. Leave the diff for the user to review.

## Runtime capabilities

No advanced runtime features required. The skill reads files and grep-scans — works identically in every runtime. See `.shared/CAPABILITIES.md`.
