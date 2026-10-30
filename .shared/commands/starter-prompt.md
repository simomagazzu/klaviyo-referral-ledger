---
description: Build a complete app from scratch — interview, spec, starter-prompt doc, then auto-build
---

# Starter Prompt

Builds a full application from a conversation. Interviews the user, creates all spec files, generates a persistent `docs/business/starter-prompt.md` context document, then orchestrates the build through `/continue-feature` (parallel wave execution when the runtime supports it, sequential otherwise).

**Use this when starting a brand new app.** For adding features to an existing app, use `/create-spec` instead.

## Runtime capabilities

This command chains `/create-spec` and `/continue-feature`, inheriting both their fallbacks. See `.shared/CAPABILITIES.md`.

---

## Phase 1 + 1.5 + 2: Interview and Spec Generation

Read `.shared/commands/create-spec.md` and follow its **Phase 1** (Interview), **Phase 1.5** (Research), and **Phase 2** (Generate Spec) exactly — including all interview rules, research agents, polling, and spec file generation.

When Phase 2 is complete you will have created:
- `specs/{feature-name}/requirements.md`
- `specs/{feature-name}/implementation-plan.md`
- `specs/{feature-name}/action-required.md`
- `specs/{feature-name}/decisions.md`
- `specs/{feature-name}/research-notes.md` (if research completed)

**Stop before create-spec's "After Creating" section** — this command has its own handoff.

---

## Phase 1.2: Design Deep-Dive

Run these questions immediately after the main Phase 1 interview, before moving to Phase 1.5 Research. If any were already answered naturally during the interview, skip them — do not ask twice.

Ask each question conversationally, one at a time:

1. **Reference apps** — "Show me 2–3 apps whose design you want to emulate — screenshots, URLs, or just names."
2. **Density** — "Should this feel information-dense (like Linear or Notion) or spacious and minimal (like the Vercel or Stripe dashboard)?"
3. **Primary action** — "What is the single most important action a user takes in the app? How prominent should it be?"
4. **Navigation pattern** — "Sidebar, top nav, or bottom nav? Should it collapse on mobile?"
5. **Data display** — "Are there tables, card grids, or lists of items? Roughly how many columns? Should they be sortable or filterable?"
6. **Empty states** — "What should the app show when there's no data yet — an illustration, a call-to-action, placeholder text?"
7. **Color and mode** — "One accent color or a full palette? Any specific hex codes or brand colors to lock in? Dark mode, light mode, or system?"

Record all answers — they feed directly into the `## Design System` and `## Key Screens` sections of the starter-prompt document.

---

## Phase 2.5: Generate Project Design Documents

This phase produces **two** files:
1. `DESIGN.md` at the project root — the source of truth for aesthetic direction (read by the `frontend-design` skill on every UI task).
2. `docs/business/starter-prompt.md` — full project context for any future agent session.

Create both folders if needed: `mkdir -p docs/business`

### File 1: `DESIGN.md` (project root)

Write to `DESIGN.md` using the design deep-dive answers. This file is consumed by the `frontend-design` skill's Step 0 — its presence prevents the skill from falling back to "ask the user" every UI session.

```markdown
# Design Direction — {App Name}

> Source of truth for the project's aesthetic. The `frontend-design` skill reads this on every UI task.

## Aesthetic direction

**{One of: Editorial / Brutalist / Technical-Utility / Maximalist / Soft-Tactile / Retro-futuristic / Playful}**

{One paragraph explaining the choice: what this aesthetic looks like applied to THIS app specifically. Not generic — tied to the app's domain and audience. Reference 1-2 apps from the interview that exemplify the direction.}

## Reference apps

- {App name or URL — what to emulate}
- {App name or URL — what to emulate}
- {App name or URL — what to emulate}

## Typography

**Heading**: {font name + reasoning — e.g. "Fraunces 600 — slight serif tension, signals editorial seriousness without feeling stuffy"}
**Body**: {font name + reasoning — e.g. "Geist — neutral utility face that lets the headings carry the personality"}
**Mono** (if used): {font name — e.g. "JetBrains Mono for inline code and numerical data"}
**Pairing rationale**: {why these two work together — contrast in serif/sans, weight difference, mood difference}

**Scale**: {tight / default / loose} · heading-to-body ratio: {e.g. "5x — h1 at 4rem, body at 0.875rem"}
**Tracking**: {tight / default — applied to which elements}
**Tabular numerals**: {required for tables and stat cards / not needed}

## Color story

**Mode**: {dark / light / system — defaults to {x}}
**Accent**: {hex or oklch — used for the single most important action per screen}
**Off-black**: {hex — never `#000000`}
**Off-white**: {hex — never `#FFFFFF`}
**Surfaces**: {how cards, panels, and layered elements differentiate from background}
**Semantic colors** (success, warning, destructive): {brief — keep in line with aesthetic}

These map to the variables in `src/app/globals.css` (`@theme` block) — update those values to match this story.

## Motion personality

**Character**: {e.g. "Deliberate restraint. Most things don't animate at all. The few things that do, do so decisively."}

**Named easings** (defined in `globals.css`):
- `ease-snap` — {when to use: e.g. "primary action hovers, button presses, micro-feedback"}
- `ease-settle` — {when to use: e.g. "things landing on screen — modals, page transitions, dropdown reveal"}
- `ease-drift` — {when to use: e.g. "ambient/decorative motion, never on primary interactions"}

**Stagger**: {e.g. "list items appearing together stagger by 40ms"}
**Reduced motion**: respected globally via `@media (prefers-reduced-motion)`.

## Layout personality

**Composition rule**: {e.g. "asymmetric — content is offset from page center, never perfectly balanced"}
**Density**: {compact / balanced / spacious}
**Default page max-width**: {e.g. "max-w-6xl"}
**Spacing scale**: {tight / default / generous}
**Whitespace philosophy**: {e.g. "generous around primary content, tight around secondary"}

## Tone of voice

{2-3 sentences describing how copy should read. Specific examples are better than adjectives.}
- {Example phrase that fits} ✓
- {Example phrase that does NOT fit} ✗

## Anti-patterns for this app

The `frontend-design` skill bans many slop patterns globally. This section adds project-specific bans:

- {e.g. "Do not use emoji in UI copy — they break the editorial tone"}
- {e.g. "Do not use card grids on the dashboard — use the asymmetric two-column composition instead"}
- {e.g. "Never blue accents — this brand uses warm tones only"}

## Component customizations required

shadcn primitives ship neutral. The following must have an aesthetic-aligned variant before they're considered done:

- **Button**: {e.g. "primary uses the accent color with no rounded corners; secondary is text-only with underline on hover"}
- **Card**: {e.g. "no shadow, single hairline border, slight asymmetric internal padding"}
- **Input**: {e.g. "underline-only, no enclosed border"}
- {add others as needed}
```

### File 2: `docs/business/starter-prompt.md`

Write `docs/business/starter-prompt.md` using everything gathered in the interview:

```markdown
# {App Name} — Project Context

> Paste this file into any new agent session (Claude Code, OpenAI Codex, Cursor Composer, or similar) to restore full project context instantly.

## ⚠ Critical Build Constraints

1. Routes `/` and `/dashboard` in the boilerplate are setup/demo scaffolding — **fully replace their contents**, never append to them
2. Never use Lorem Ipsum or placeholder text like "Coming soon" in any deliverable screen
3. Every screen that shows a list or table **must** have a real empty state implemented, not a blank box
4. The first build must be visually complete — no "I'll style this later" stubs or unstyled sections
5. Do not use the default shadcn gray card-with-title layout as a stand-in for real UI

---

## What This App Does
{one sentence from interview — the problem it solves}

## Users & Roles
{who uses the app, their roles, what each role can do}

## Authentication
{login methods — signup policy (open or invite-only) — what the user sees on first login}

## Key Screens

{For each screen identified in the interview, fill out this block:}

### Pre-login
- Layout: {e.g. "centered single-column, max-w-md"}
- Primary element: {e.g. "email + password form with Google OAuth button below"}
- Empty/unauthenticated state: {e.g. "redirect to /login — no flash of content"}

### {Screen name}
- Layout: {e.g. "two-col — sidebar 240px fixed left + main area scrollable"}
- Primary element: {e.g. "table of invoices with status badge column"}
- Secondary elements: {e.g. "filter bar at top, summary stat cards above table"}
- Empty state: {e.g. "centered illustration + 'Create your first invoice' CTA button"}
- Mobile behavior: {e.g. "sidebar collapses to hamburger, table becomes card list"}

{Repeat block for each screen}

## Core Features
{numbered list from requirements.md — specific, not vague}

## Design System

**Layout**: {sidebar / top-nav / bottom-nav} · {fixed / scrollable shell} · {max-width constraint, e.g. max-w-7xl}
**Density**: {compact / balanced / spacious}
**Accent color**: {hex or description} · **Mode**: {dark / light / system}
**Border radius**: {sharp (rounded-sm) / standard (rounded-md) / soft (rounded-xl) / pill}
**Typography scale**: {tight / default / loose}
**Reference apps**: {names or URLs from interview — what to emulate}
**Tone**: {e.g. "professional and calm, no playful microcopy"}

### Component Conventions
- **Forms**: {modal / slide-over panel / inline / dedicated page}
- **Confirmation dialogs**: {destructive actions only / always}
- **Loading states**: {skeleton screens / spinners / optimistic updates}
- **Notifications**: {toast — position: top-right / bottom-center — use for: {when}}
- **Tables**: {paginated / infinite scroll} · {row actions: dropdown menu / inline buttons}
- **Navigation**: {items, icons if any, active state style}

## Integrations
{third-party services used, or "None"}

## Tech Stack
Next.js 16 · React 19 · TypeScript · Better Auth · PostgreSQL via Docker (local) + managed Postgres (production) + Drizzle ORM · shadcn/ui · Tailwind 4{· OpenRouter}{· Resend}

---

## Context for Your Agent

This project was scaffolded from Simo's Agentic Coding Boilerplate. Important rules:

- **Do NOT restore boilerplate placeholder content.** The following default pages exist in the boilerplate and must be completely replaced — not appended to:
  - `/` — interactive setup wizard (replace with the actual landing page once setup is complete)
  - `/dashboard` — placeholder dashboard (replace with the real app dashboard)
- Read `src/lib/schema.ts` to understand the data model before any database work.
- Read `DESIGN.md` at the project root before any UI work — it is the source of truth for the app's visual direction.
- Check `specs/{feature-name}/` for implementation decisions and task status.
- Follow all conventions in `AGENTS.md`.
- Use `src/lib/api-utils.ts` helpers for all API routes (applyRateLimit, requireApiAuth, parseBody, apiResponse, apiError).

## Spec Location
`specs/{feature-name}/`
- `requirements.md` — full requirements
- `implementation-plan.md` — phased task list with completion status
- `decisions.md` — architecture decisions
```

---

## Phase 3: Handoff

Read `specs/{feature-name}/action-required.md`.

**If it has "Before you start building" steps:**
Present them inline — do not say "go read the file". List each step and ask the user to confirm when done.

> Before building, you'll need to:
>
> **1. {Step}** — {plain-English instruction}
>
> Let me know when these are done and I'll start building.

**If it has "After deploying" steps:** mention them briefly ("There are also a couple of steps only possible after deploying — I'll remind you then.") but do not block on them.

**If no manual steps:** skip this and proceed to Phase 3.5.

---

## Phase 3.5: Design Alignment Check

Before writing any code, output a short **UI spec summary** for the user to approve. This is mandatory — do not skip it even if the design feels clear.

Format it as:

> Here's how I'm planning to build the UI before I start:
>
> - **Shell**: {nav pattern and behavior — e.g. "fixed sidebar 240px, collapses to icon-only on mobile"}
> - **{Screen 1 name}**: {layout + key components — e.g. "full-width table with filter bar above, empty state is centered CTA"}
> - **{Screen 2 name}**: {layout + key components}
> - **Forms**: {where they live — e.g. "slide-over panel on the right"}
> - **Loading / empty states**: {approach — e.g. "skeleton on initial load, optimistic updates on mutations"}
> - **Component choices**: {notable shadcn components or custom ones — e.g. "DataTable with TanStack, Sheet for slide-overs, Sonner for toasts"}
>
> Does this match your vision, or should I adjust anything before I start?

**Wait for explicit approval.** If the user says "looks good" or equivalent, proceed to Phase 4. If they request changes, update **both** `DESIGN.md` AND `docs/business/starter-prompt.md` to reflect them before building. (DESIGN.md is the source of truth that the `frontend-design` skill reads on every UI task — it must stay in sync with what was approved.)

---

## Phase 4: Build

Once the design alignment is approved, say:

> Building now — I'll work through all phases automatically.

Then follow the orchestration from `.shared/commands/continue-feature.md`.

**Execution mode**: `/continue-feature` picks parallel wave execution when the runtime supports it reliably, otherwise sequential. Both modes produce the same output. Do not force parallel mode — trust the command's capability check.

### Build Quality Gates

After completing **each wave**, self-check every item before marking the wave done. Do not proceed to the next wave if any item fails.

- [ ] No default shadcn placeholder content or boilerplate copy is visible anywhere
- [ ] Empty states are implemented for every list, table, or feed view
- [ ] Loading states exist on all async operations (skeletons or spinners — no blank flashes)
- [ ] All destructive actions have a confirmation dialog
- [ ] Error states are handled and shown to the user — not just the happy path
- [ ] No screen is wider than its intended max-width constraint on desktop
- [ ] Nothing overflows or breaks at 375px viewport width on mobile
- [ ] Spacing is consistent — no mixed arbitrary margin/padding values across equivalent components
- [ ] Navigation active state is correct on all routes
- [ ] Forms validate inputs and show inline errors before submission

When all tasks across all phases are complete, continue-feature will generate one `docs/features/{slug}.md` per unique feature tag and print the final report.

---

## Phase 5: Boilerplate Cleanup

After the build is complete, remove all traces of the boilerplate. The app is now its own thing.

### 1. Rewrite `README.md`

Replace the entire README with a new one that describes the actual app:

```markdown
# {App Name}

{One-sentence description from the interview}

## Features

{List the app's actual features — pull from docs/features/*.md}

## Setup

### Prerequisites
- Node.js 18+, pnpm, Docker Desktop

### Installation
1. Clone the repo
2. `pnpm install`
3. `cp env.example .env` and fill in the values
4. `docker compose up -d && pnpm run db:migrate`
5. `pnpm dev`

### Environment Variables
{List required env vars and what they're for — pull from env.example}

## Tech Stack
{Tech stack from starter-prompt.md}

## Development
- `pnpm dev` — start dev server
- `pnpm check` — lint + typecheck
- `pnpm db:generate` — generate migrations after schema changes
- `pnpm db:migrate` — apply migrations
```

### 2. Clean up boilerplate references

Search the codebase for any remaining boilerplate references and remove them:
- Page titles or headings mentioning "Simo's Agentic Boilerplate"
- Links to `simomagazzu/create-app-like-simo`
- Comments referencing "boilerplate" or "template" in code that was newly written
- The setup wizard at `/` — it should have been replaced by the actual landing page during the build

**Do NOT delete**: `DESIGN.md` at the project root — that is now part of the app's identity, not boilerplate scaffolding. The `frontend-design` skill reads it on every UI task.

### 3. Update `AGENTS.md` header

Replace the first line:
```
# Simo's Agentic Coding Boilerplate — AI Assistant Guidelines
```
With:
```
# {App Name} — AI Assistant Guidelines
```

And update the Project Overview paragraph to describe the actual app, not the boilerplate. (`CLAUDE.md` is a symlink to `AGENTS.md`, so this one edit updates both.)
