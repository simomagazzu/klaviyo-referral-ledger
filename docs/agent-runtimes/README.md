# Agent Runtimes

The boilerplate's shared commands and skills are designed to run in any reasonable AI coding runtime. This folder documents what each runtime provides, what is verified, and where the fallbacks kick in.

The capability model itself lives at [`.shared/CAPABILITIES.md`](../../.shared/CAPABILITIES.md) — read that first.

## Runtimes

| Runtime | Primary support status | Docs |
|---|---|---|
| **Claude Code** | Parallel mode verified | (no dedicated doc — the repo was developed against this runtime) |
| **OpenAI Codex CLI** | Sequential mode designed; parallel mode not smoke-tested | [`codex.md`](./codex.md) · [`codex-checklist.md`](./codex-checklist.md) |
| **Cursor Composer** (2.0+) | Sequential mode designed; parallel mode relies on Cursor 2.0 native multi-agent | (not yet smoke-tested — contributions welcome) |

## What "verified" means

A runtime is "verified" for a mode only when a maintainer has walked through the corresponding checklist on a clean clone and confirmed the expected output. We intentionally do not claim verification based on reading docs.

Sequential mode is designed to be correct in every runtime that can read markdown, execute shell commands, and read/write files — which is the minimum floor for any agentic coding CLI.

## How to file runtime compatibility reports

If you run one of the checklists (or add a new runtime), open a PR against this folder:
- New runtime: add `{runtime}.md` modeled on `codex.md` and `{runtime}-checklist.md` modeled on `codex-checklist.md`.
- New verification result: paste the completed checklist template into an issue, and update the status table above.
