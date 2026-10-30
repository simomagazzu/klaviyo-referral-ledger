# Runtime Capability Model

> Reference document — not a slash command. Commands in `.shared/commands/` link here.

Shared commands in this repo are written to run on any coding agent that can execute markdown instructions — Claude Code, OpenAI Codex, Cursor Composer, or future agents with a comparable runtime. Every command is **capability-aware**: it prefers advanced runtime features when present but never hard-depends on them.

The table below is the contract. Each shared command references this file (or inlines a short version) and must handle both paths for every capability it uses.

| Capability | Preferred path | Required fallback |
|---|---|---|
| **Slash command arguments** (e.g. `$ARGUMENTS`) | If the runtime substitutes arguments before execution, use them. | If not substituted, infer from repo state (e.g. the only folder under `specs/`, the single in-progress spec). If still ambiguous, ask the user one concise question. |
| **Parallel background sub-agents** (Claude `Task` tool, Codex `/agent`, Cursor 2.0 parallel agents) | Spawn one sub-agent per task in the current wave, run concurrently, wait on completion. | Execute each task sequentially in the main session using the same brief. No wave-parallelism; same end result. |
| **File-based progress polling via Bash** | Used only in the parallel path to read sub-agent output files (`.planning/*.json`) while they run. | In sequential mode, skip polling entirely — the orchestrator produces the output files directly. |
| **External docs lookup via MCP** (e.g. Context7) | If the runtime exposes an MCP docs tool, use it for external-library research. | Skip external docs research. Note in `research-notes.md`: "External docs: skipped (no MCP docs tool available). Verify API shapes before implementing." Work from local codebase knowledge. |
| **Runtime-native slash-command discovery** | Type `/{name}` in supported agents (Claude Code, Cursor 2.0, recent Codex builds). | If the runtime doesn't recognize the slash command, the user reads the markdown file at `.shared/commands/{name}.md` directly and follows the instructions. |

## How commands reference this

Each command includes this block near the top:

```markdown
## Runtime capabilities

This command works on any runtime. When an advanced capability is available
(parallel sub-agents, MCP docs, $ARGUMENTS substitution) the command uses it;
otherwise it falls back to a single-session sequential path. See
`.shared/CAPABILITIES.md` for the full model.
```

Any step that *requires* a capability must say so explicitly and link here. Any step that just *prefers* a capability must specify the fallback inline.

## What "runnable in a single-session sequential path" means

If all advanced capabilities are missing, the command must still:
1. Produce the same output files (specs, feature docs, migrations, etc.).
2. Complete without blocking on polling loops or file watchers.
3. Report progress inline instead of via background notifications.
4. Take longer — that's the accepted trade-off.

It must **not**:
- Loop indefinitely waiting for a file that will never appear.
- Silently skip steps.
- Produce files that reference sub-agent outputs the orchestrator never received.
