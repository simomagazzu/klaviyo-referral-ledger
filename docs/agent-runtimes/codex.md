# OpenAI Codex — Runtime Support

This page documents what the boilerplate expects from the OpenAI Codex CLI runtime and what is actually verified. It is deliberately conservative: claims here should be testable.

## What the repo assumes Codex provides

| Capability | Expected | Notes |
|---|---|---|
| Reads `AGENTS.md` automatically | Yes | Codex's documented behavior. `CLAUDE.md` is a symlink to `AGENTS.md` so the same content is picked up by multiple agents. |
| Reads markdown files under `.agents/commands/` as custom commands | Reasonable expectation | Codex supports agent skills via `.agents/skills/`. Custom-command discovery across Codex versions has shifted — if a slash command is not recognized, the user can still **open the markdown file directly and feed it to Codex**. Every shared command is self-contained and works this way. |
| Reads skills under `.agents/skills/{name}/SKILL.md` | Yes | Matches the "open agent skills standard" Codex uses. |
| Bash tool / file read / file write | Yes | Required for any useful coding work. |
| MCP tools (e.g. Context7) | Optional | If an MCP docs tool is configured, `/create-spec` uses it. If not, the command skips external docs research and notes the skip in `research-notes.md`. |

## What is NOT assumed

| Capability | Why we don't assume | Fallback |
|---|---|---|
| Slash-command argument substitution (`$ARGUMENTS`) | Not guaranteed to be substituted across all Codex versions. | Commands resolve the target (e.g. feature name) from repo state; ask the user only if truly ambiguous. |
| Background parallel sub-agents with reliable completion tracking | Codex's `/agent` and Agents SDK exist, but orchestration guarantees in the CLI are still in flux. | `/continue-feature` has an explicit **Sequential Mode** that runs tasks one at a time in the main session. Same output files, same completion behavior — slower, but reliable. |
| File-based polling loops running for minutes in the background | Not required in sequential mode. | Sequential mode produces research and task output inline, so no polling loop is needed. |

## How shared commands degrade

Every shared command in `.shared/commands/` includes a short "Runtime capabilities" section at the top and references [`.shared/CAPABILITIES.md`](../../.shared/CAPABILITIES.md) for the full model. The rule is:

1. **Prefer** advanced runtime features when clearly available.
2. **Fall back** to a single-session sequential path when they are not.
3. **Never hard-depend** on capabilities the runtime hasn't confirmed.

Specifically:

- `/create-spec`: has two research modes — parallel sub-agents (if reliably supported) or inline research in the main session. Inline is always correct.
- `/continue-feature`: has two execution modes — parallel waves via sub-agents or sequential execution in the main session. Sequential is always correct.
- `/starter-prompt`: chains the above — inherits both fallbacks.
- `/security-audit`: does not use sub-agents or MCP docs lookup at all. Works identically in every runtime.
- `/deploy-check`: runs shell commands only (`pnpm lint`, `pnpm typecheck`, `pnpm build:ci`, `pnpm audit`, `git status`). Works identically in every runtime.

## What a maintainer should verify before claiming full Codex parity

Run through [`codex-checklist.md`](./codex-checklist.md). The checklist covers:

- Command discoverability (does Codex recognize `/starter-prompt` etc., or does the user need to feed the markdown directly?)
- Sequential mode actually produces the expected files with no sub-agents available
- Skill auto-trigger behavior (does `security-audit` activate on "security review"?)
- The symlink structure is respected (`.agents/commands`, `.agents/skills`)

## Known gaps / things not verified

These are honest gaps, not roadmap items:

1. **Parallel mode on Codex is not smoke-tested** by the maintainer of this repo. The docs describe what it *should* look like, but the guarantee is "sequential mode works." Anyone extending this to verify parallel mode should run the full checklist with `/continue-feature` forced into Mode A.
2. **Slash-command discovery under `.agents/commands/`** varies by Codex version. If your Codex build doesn't pick up custom commands from that folder, the fallback is to paste the content of `.shared/commands/{name}.md` into your Codex session manually. Every command is written to work that way.
3. **MCP docs tools are runtime-specific.** If you connect Context7 (or any equivalent) to Codex, `/create-spec` will use it. If you don't, it won't — and the spec will say so.
