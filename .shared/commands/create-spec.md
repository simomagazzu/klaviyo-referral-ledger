---
description: Interview the user about what they want to build, then create a detailed spec
---

# Create Spec

Three phases: **interview**, **research**, **generate**.

## Runtime capabilities

This command works on any runtime. Research prefers parallel sub-agents + MCP docs lookup when available, but has a fully local-first fallback that needs neither. See `.shared/CAPABILITIES.md`.

## Phase 1: Interview

Before creating any files, have a focused conversation to understand what the user wants to build. Ask questions in this order — adapt based on answers, skip what's already clear.

### Core Questions

Ask these in order, 2-3 at a time. Every question must be answered before generating the spec.

1. **What does the app do?** (one sentence — what problem does it solve?)
2. **Who uses it?** (who are the users, are there different roles with different access?)
3. **What are the 3-5 most important things a user can do?** (core features — be specific, push back on vague answers like "a dashboard")
4. **Accounts and login**: does the app require users to sign in? **You must explicitly ask this** — never assume. If yes, ask which method(s) — multiple can be combined:
   - **Email + password** (classic)
   - **Magic link** (passwordless, click-a-link from email)
   - **Email OTP** (one-time code via email)
   - **Google OAuth** (one-click "Continue with Google")
   - **No authentication** (public app, anyone can use it without signing in)

   The boilerplate's Better Auth setup supports all of the above out of the box. If the user picks any email-based method (password, magic link, OTP), Resend is required for sending emails — flag this as an action-required item.

   Then: can anyone sign up, or is access invite-only? What does a user see right after they log in for the first time?
5. **What data does the app store?** (think about the main database tables — what are the key entities and how do they relate?)
6. **Walk me through the key screens**: what does someone see when they first visit the app (before logging in)? Is there a public landing page, or does it go straight to login? Then walk through the main pages once logged in — what's on each one?
7. **Design and feel**: how do you want this app to look and feel? Think of apps or websites whose design you love — what appeals to you about them? Are you thinking minimal and clean, bold and expressive, professional, playful, premium? Dark mode, light mode, or both? Any specific colors, fonts, or branding in mind? If you have no preference, say so and we'll choose something great.
8. **Does it need AI?** If yes: what exactly should the AI do and when does it run?
9. **Any third-party integrations?** (payments, email sending/receiving, external APIs, file storage)

### Follow-Up Questions (ask only if not already clear)

- If multi-user: is data shared between users, or is each user's data private? If shared, what can users see/do with each other's data?
- What happens when something goes wrong? (e.g. a third-party fails, a user submits invalid data — what should the user see?)
- What's the MVP — the minimum that makes this useful — vs nice-to-have features?
- Does it need real-time updates (live data, notifications)?
- Is there file uploading involved?

### Default infrastructure assumptions — DO NOT ask about these

The boilerplate ships with opinionated defaults. Assume them silently. Only ask if the user volunteers a different need (e.g. "I want MySQL", "we already have Supabase set up", "no email — too expensive to run").

| Concern | Default — assume this | When to ask |
|---|---|---|
| **Database** | PostgreSQL. **Local development = Docker** (boilerplate ships with `docker-compose.yml` running Postgres on port 5432 by default). **Production = managed Postgres** (e.g. Neon, Supabase, Vercel Postgres) — flag in `action-required.md` so the user provisions one before deploy. | User mentions a different DB engine, or already has hosted infra. |
| **ORM** | Drizzle (already configured in `src/lib/db.ts` and `src/lib/schema.ts`). | Never. |
| **Auth** | Better Auth (handles email+password, magic link, OTP, Google OAuth — see Q4). | Q4 already covers method choice. |
| **AI** | OpenRouter via Vercel AI SDK (only if Q8 is yes). | If user asks for a specific model provider. |
| **Email** | Resend (only if Q4 picks an email-based auth method, or other transactional email is needed). | If user names a different ESP. |
| **File storage** | Local filesystem in dev, Vercel Blob in production (already wired in `src/lib/storage.ts`). | If user mentions S3/R2/etc. |

When generating `action-required.md` later, the production database is the one item from this table that always needs the user's attention before deploy — list a managed Postgres provider as an action item unless the user already named one during the interview.

### Interview Rules

- Ask 2-3 questions at a time, never all at once
- Summarize what you've understood after each round
- Push for specifics: "a dashboard" → "what's on the dashboard, exactly?"; "users can manage their data" → "what does managing mean — create, edit, delete, share?"
- For design: if the user says "no preference" or "whatever looks good", commit to a direction yourself and confirm it — never leave design as undefined. Make a bold, specific choice.
- If the user is not a developer, translate their answers into technical implications without jargon: e.g. "so we'll need a database table for X" — confirm this is right
- Never assume. If something is ambiguous, ask.
- Once you have enough detail on all 9 core questions, present a full confirmation summary:

```
Here's what I understand you want to build:

**App**: [one-liner]
**Users**: [who + roles]
**Auth**: [login methods + signup policy + first-login experience]
**Core features**:
1. [feature — specific]
2. [feature — specific]
3. [feature — specific]

**Data model**: [key entities + relationships]
**Multi-user data**: [shared vs private, what users can see]
**Key screens**:
- [Pre-login: landing page or straight to login?]
- [Screen 1 — what's on it]
- [Screen 2 — what's on it]
**Design direction**: [aesthetic — e.g. "minimal, dark mode, cool blues, subtle animations"]
**AI usage**: [yes/no + what it does + when it runs]
**Integrations**: [list]

Does this capture it? Anything missing or wrong?
```

Only proceed to Phase 1.5 after the user confirms.

## Phase 1.5: Research

Ground the spec in the actual codebase so `### Technical Details` sections reference real paths and real symbols, not placeholders.

Tell the user: "Great! Let me quickly research the codebase before generating your spec..."

### What to produce

Two JSON artifacts under `.planning/` (create the folder if missing):
- `.planning/research-codebase.json` — **always produced** (local only, no external calls)
- `.planning/research-docs.json` — produced only if external APIs are needed AND an external docs tool is available

### How to produce them — pick an execution mode

**Mode A — Parallel sub-agents (preferred when reliably available)**: spawn two background research agents with the briefs below. Use file-based polling (`.planning/research-*.json`) to detect completion. If after 120 seconds a file hasn't appeared, treat that agent as incomplete.

**Mode B — Inline in the main session (safe default)**: you yourself do the research. Read the files, synthesize the findings, write the JSON artifacts directly. No polling, no timeouts.

Use Mode B unless you are confident your runtime runs background sub-agents reliably. Mode B is always correct.

### Research Agent 1 / Inline Research — Codebase Scout (always runs)

**Goal:** map the existing codebase so spec paths and symbol names are real.

Read and report on:
1. `src/lib/schema.ts` — list all existing tables and their key columns
2. `src/app/api/` — list all existing API routes (file path + HTTP methods)
3. `src/components/` — list all components with a one-line description
4. `src/app/` — list all existing pages and layouts

For each item relevant to the planned feature, note:
- Exact file path
- What it does
- Whether it can be reused, extended, or must be created fresh

Write `.planning/research-codebase.json`:
```json
{
  "existing_tables": [{"name": "...", "columns": ["..."]}],
  "existing_routes": [{"path": "...", "methods": ["..."], "description": "..."}],
  "reusable_components": [{"path": "...", "description": "..."}],
  "existing_pages": [{"path": "...", "description": "..."}],
  "patterns_to_follow": ["..."],
  "files_to_read_per_phase": {
    "phase_1": ["src/lib/schema.ts", "..."],
    "phase_2": ["..."]
  }
}
```

### Research Agent 2 / Inline Research — Docs Fetcher (conditional)

Runs only if BOTH of these are true:
1. The feature needs external APIs (detected from interview: payments, email, SMS, maps, OAuth providers, etc.).
2. An external documentation tool is available in the runtime (e.g. a Context7 MCP server, a `query-docs` tool, or similar).

**If no external docs tool is available**, skip this agent entirely and write a clear note into `research-notes.md` under "Research Status": `docs: skipped — no external docs tool in this runtime. Verify API shapes from vendor docs before implementing.`

**If an external docs tool is available**, use it to look up each API:
- Authentication method
- Key endpoints
- Request/response shapes
- SDK name (if any)
- Rate limits
- Known gotchas

Write `.planning/research-docs.json`:
```json
{
  "apis": [
    {
      "name": "...",
      "auth_method": "...",
      "key_endpoints": ["..."],
      "sdk": "...",
      "gotchas": ["..."]
    }
  ],
  "tool_used": "context7 | other | skipped",
  "skipped_reason": "..."
}
```

Do not invent docs. If a library isn't in the available tool's index, note it and proceed with best available knowledge from the main context.

### Progress output

Print one status line after each check:

```
Researching codebase...
  Codebase Scout:  {✓ done / ⏳ running / ⚠ incomplete}
  Docs Fetcher:    {✓ done / ⏳ running / — skipped (no docs tool) / ⚠ incomplete}
```

In Mode A, poll `.planning/*.json` files via Bash (or your runtime's file-check primitive). If a research file never appears within 120 seconds, treat it as incomplete and move on.

In Mode B, you produce the files directly — no polling needed.

### Consuming research output

Before generating spec files, read whichever research artifacts exist:
- `.planning/research-codebase.json` — should always exist
- `.planning/research-docs.json` — may or may not exist

Use them to:
1. Populate `### Files to Read` sections with real paths from `files_to_read_per_phase`
2. Populate `### Technical Details` with actual table names, column names, existing component names, real import paths
3. Create `specs/{feature-name}/research-notes.md` (see step 5 in Phase 2)

If research is incomplete, add a note in the affected `### Technical Details` section:
`NOTE: research incomplete — verify these paths before implementing`

## Phase 2: Generate Spec

### 1. Create the feature folder

Path: `specs/{feature-name}/` (kebab-case)

### 2. Create `requirements.md`

```markdown
# {Feature Name}

## Summary
{One paragraph describing the app/feature}

## Users
{Who uses this, their roles, and what each role can do}

## Auth
{Login methods (email/password, Google, or both) + signup policy (open or invite-only) + what a user sees on first login}

## Core Features
1. **{Feature}** — {description, specific enough that a developer knows what to build}
2. **{Feature}** — {description}
...

## Data Model
{Key entities, their relationships, important fields. Note which data is shared across users vs private.}

## Key Screens
{List of main pages/views with a one-line description of what each contains}

## Design Direction
{If `DESIGN.md` exists at the project root: write "See `DESIGN.md` for the project-wide aesthetic direction. Feature-specific notes:" then list anything ONLY relevant to this feature (e.g. a special table layout, a unique empty-state illustration, an interaction pattern not yet in DESIGN.md). Do not duplicate DESIGN.md's content.}

{If `DESIGN.md` does NOT exist: state the full aesthetic direction inline — pick one from the seven directions in the `frontend-design` skill (Editorial / Brutalist / Technical-Utility / Maximalist / Soft-Tactile / Retro-futuristic / Playful), describe color, typography, motion, and reference apps. Do not use banned tone words ("minimal", "clean", "premium", "modern", "sleek").}

## AI Integration
{How AI is used, what it does, when it runs — or "None" if not applicable}

## Error Handling
{What happens when things go wrong: third-party failures, invalid input, empty states}

## Acceptance Criteria
- [ ] {Criterion 1}
- [ ] {Criterion 2}
...
```

### 3. Create `implementation-plan.md`

```markdown
# Implementation Plan: {Feature Name}

## Overview
{Brief summary of the build approach}

## Phase 1: {Phase Name} [S/M/L] [feature: {feature-slug}]

{What this phase accomplishes}

### Tasks
- [ ] [wave:1] Task description
- [ ] [wave:1] Task description
- [ ] [wave:2] Task description (blocked by: wave:1)
- [ ] [wave:2] Task description [complex] (blocked by: wave:1)

### Technical Details
{CLI commands, schemas, code patterns, file paths — everything an agent needs to implement this phase without asking questions. Use real file paths and existing symbol names from the codebase. Never invent placeholder paths.}

### Files to Read
{List the specific files from the codebase that are relevant to this phase — this feeds into context management}

## Phase 2: {Phase Name} [S/M/L] [feature: {feature-slug}] (blocked by: Phase 1)
...
```

**Size labels**: S = single file change, M = 2-5 files, L = 6+ files or architectural

**Feature tag rules**:
- Every phase gets `[feature: {slug}]` — a kebab-case identifier for the capability this phase contributes to
- Phases that build the same user-facing capability share the same `feature:` slug
- The slug determines which `docs/features/{slug}.md` file gets written or updated in the Final Report
- Example: `## Phase 1: Brand Schema [L] [feature: brand-management]`
- Example: `## Phase 3: Brand Settings Page [M] [feature: brand-management]` (same feature as Phase 1)

**Wave marker rules**:
- Every task gets `[wave:N]`
- Wave 1 = no dependencies (safe to start immediately, can run in parallel)
- Wave 2+ = blocked by the previous wave completing
- Tasks in the same wave are independent of each other
- Wave numbering resets per phase (not global)
- The `(blocked by: wave:N)` annotation is human-readable documentation only
- Wave markers are used by `/continue-feature` whether running in parallel or sequential mode — in sequential mode, waves execute one task at a time in the order listed

**Wave assignment example**:
```markdown
### Tasks
- [ ] [wave:1] Create `users` table in schema.ts
- [ ] [wave:1] Create `sessions` table in schema.ts
- [ ] [wave:2] Run db:generate and db:migrate (blocked by: wave:1)
- [ ] [wave:2] Add indexes on users.email and sessions.userId (blocked by: wave:1)
- [ ] [wave:3] Write seed script for local development (blocked by: wave:2)
```

### 4. Create `action-required.md`

**Who this file is for**: someone who is not a developer. Write every step as if explaining to a friend who has never used a developer dashboard before.

**What belongs here — the only two categories:**

1. **Account/credential setup**: creating accounts on third-party services, getting API keys, adding env vars to `.env`. These are things a human must physically do before the code can run.
2. **Post-deploy configuration**: webhook URLs, OAuth redirect URIs, DNS records — anything that requires a live public URL or can only be done after the app is deployed.

**What does NOT belong here:**
- Code tasks (writing callbacks, configuring SDK options) — the implementation agent handles those
- Testing instructions ("use ngrok", "test with curl") — not an action item
- Monitoring or operational advice ("monitor for abuse") — not a setup step
- Anything vague or hypothetical

**How to write each step:**
- One clear action per bullet
- Exact navigation path: "Go to resend.com → API Keys → Create API Key"
- Say what to do with the result: "paste it into RESEND_API_KEY in your .env file"
- If a technical term is unavoidable, explain it in plain English in brackets: "MX records [these tell email servers where to deliver mail for your domain]"
- If a step can only be done after deploying, explain why in one sentence: "This requires your app's public URL, which you won't have until after deploying."

```markdown
# Action Required: {Feature Name}

## Before you start building
{Only include if there are credential/account setup steps. These must be done before the code can run.}

- [ ] **{Action}** — {plain-English explanation of what to do and where, written for a non-developer}

## After deploying
{Only include if there are steps that require a live public URL. Explain why each step can't be done earlier.}

- [ ] **{Action}** — {explanation + why it needs a live URL}
```

If there are no manual steps at all: write "No manual steps required."

**Resend example (good):**

```markdown
## Before you start building

- [ ] **Create a Resend account** — Go to resend.com and sign up for a free account. You'll use this to send and receive emails.

- [ ] **Get your Resend API key** — In the Resend dashboard, go to API Keys → Create API Key. Copy the key and paste it into `RESEND_API_KEY` in your `.env` file.

- [ ] **Add a domain for receiving emails** — In the Resend dashboard, go to Domains → Add Domain. Enter a subdomain you own (like `inbox.yourdomain.com`). Resend will show you DNS records [instructions your domain registrar needs to route email to Resend] — add those to wherever you bought your domain (GoDaddy, Namecheap, etc.). This can take up to 24 hours to activate.

## After deploying

- [ ] **Tell Resend where to forward incoming emails** — Once your app is live, go to Resend Dashboard → Inbound → Add Endpoint and enter your app's URL: `https://yourdomain.com/api/webhooks/resend`. You can't do this before deploying because Resend needs a real public URL.
```

### 5. Create `research-notes.md`

Human-readable summary of research findings. Skip only if both the codebase scout and the docs fetcher were unavailable or incomplete (rare).

```markdown
# Research Notes: {Feature Name}

Generated during spec creation. Do not edit manually.

## Codebase Findings

### Existing Tables
{list from research-codebase.json — table name + relevant columns}

### Reusable Components
{components that can be used as-is for this feature}

### Existing Routes
{API routes relevant to this feature}

### Patterns to Follow
{specific patterns the implementation agents should mirror}

### Files to Read (per phase)
{structured list sourced from files_to_read_per_phase}

## External API Notes
{if docs research ran: one section per API with auth method, key endpoints, SDK, gotchas}
{if docs research was skipped: "External API docs: skipped (no docs tool available in this runtime). Verify vendor docs before implementing {list APIs}."}
{if no external APIs needed: "No external APIs required for this feature."}

## Research Status
- Codebase Scout: {complete / incomplete — reason}
- Docs Fetcher: {complete / skipped (no docs tool) / skipped (no external APIs) / incomplete — reason}
- Execution mode: {parallel / sequential}
```

### 7. Create `decisions.md`

```markdown
# Architecture Decisions: {Feature Name}

Decisions made during planning. Reference these if questions come up during implementation.

## {Decision Title}
**Context**: {Why this decision came up}
**Decision**: {What was decided}
**Alternatives considered**: {What else was considered and why it was rejected}
```

## Rules

- Tasks must be atomic — implementable in one session by an agent
- Mark complex tasks with `[complex]` for visibility
- The `### Technical Details` section is the **single source of truth**. If it wasn't captured there, it's lost.
- The `### Technical Details` section must use **real file paths and existing symbol names** from the codebase (sourced from research). Never invent placeholder paths like `src/components/MyComponent`.
- The `### Files to Read` section enables efficient context loading in `/continue-feature`
- Do NOT include testing tasks unless the user explicitly asks
- Each phase's size label helps estimate effort

## After Creating

Do the following in order:

### 1. Announce the spec

Tell the user the spec is ready and give a one-line summary of each phase (phase number, name, size label, what it does). Keep it brief — one sentence per phase.

Example:
> Spec ready. Here's what we're building:
>
> **Phase 1** [L] — Schema + auth foundation (7 new tables, email OTP, organizations)
> **Phase 2** [L] — Brand management: add-brand flow, app shell with sidebar
> **Phase 3** [M] — Resend inbound webhook: receive, deduplicate, store, AI-categorize
> ...

### 2. Surface manual steps inline

Read `specs/{feature-name}/action-required.md`. Then, matching the exact headings used by the template in section 4 of Phase 2:

- If it contains a `## Before you start building` section with one or more steps: present them directly in the conversation. Don't say "go read the file" — list the steps yourself and ask the user to confirm when done.

  Example:
  > Before we can start building, you'll need to do a few things:
  >
  > **1. Create a Resend API key** — go to resend.com/api-keys, create a key, paste it into `RESEND_API_KEY` in your `.env`
  > **2. Verify your sending domain** — add the DNS records from Resend Dashboard → Domains to your registrar
  >
  > Let me know when these are done and I'll start building.

- If it contains a `## After deploying` section: mention those steps briefly so the user knows they exist, but don't block on them.

  Example:
  > There are also a couple of steps that can only be done after deploying (like registering the webhook URL in Resend) — I'll remind you when we get there.

- If the file says **"No manual steps required."** (or contains neither of the two sections above with actionable items): skip the manual-steps conversation entirely and move straight to step 3.

### 3. Ask to start building

Once manual steps are acknowledged (or if there are none), ask directly:

> Ready to start building? I'll work through all the phases automatically. Just say the word.
