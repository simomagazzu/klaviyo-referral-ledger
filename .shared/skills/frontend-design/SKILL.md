---
name: frontend-design
description: Create distinctive, production-grade UI with high design quality. Use this skill when building pages, components, layouts, or any visible UI. Generates polished interfaces that feel intentional rather than auto-generated.
---

This skill guides the creation of frontend interfaces that feel genuinely designed. Two failure modes must be prevented: incomplete UI (missing states, broken on mobile, no error handling) AND generic UI (the unmistakable "AI dashboard" look). Both are slop. Completeness without character is still slop.

## Step 0 — Read project context FIRST

Before designing anything, check what the project already establishes:

1. **`DESIGN.md`** at the project root — if it exists, this is the source of truth for aesthetic direction, font choices, color story, motion personality, and visual references. Honor it before falling back to anything in this skill.
2. **`tailwind.config.ts` / global CSS** — the project's tokens (fonts, colors, radii, easings) are not suggestions. Use what's defined; don't introduce new values inline.
3. **`references/` folder** — if it contains screenshots or links, treat them as visual targets.
4. **Existing components** — match the established pattern. Read 2-3 files in `components/` before creating new ones.

If `DESIGN.md` is missing or empty AND no aesthetic direction has been given by the user, ask before generating UI. Do not silently default. Silent defaults are how slop happens.

## Design thinking — commit before coding

Write down, in your plan or in chat, before generating any code:

- **Purpose**: What does this screen do? What is the user trying to accomplish?
- **Aesthetic direction**: Pick one from the list below and commit. Do not blend two.
- **Hierarchy**: What is the single most important element on this screen? Design toward it. Everything else is secondary.
- **What this is NOT like**: Name the slop pattern this screen will avoid.

### Aesthetic directions

Pick one and commit fully. These are not vibes — each has specific implications for fonts, color, spacing, motion, and composition.

- **Editorial** — print-like restraint, serif headings, generous margins, asymmetric column composition. Feels like a magazine spread.
- **Brutalist** — raw, high-contrast, hard shadows or no shadows, monospaced or unconventional fonts, exposed structure, deliberate "ugliness."
- **Technical / Utility** — dense, monospace-leaning, terminal-influenced, every pixel earns its place. Linear-app or developer-tool flavor.
- **Maximalist** — busy, layered, multiple typefaces in tension, bold color, texture, deliberate excess. Energy over restraint.
- **Soft / Tactile** — rounded forms, layered depth without glassmorphism, warm off-whites, grain or noise texture, soft shadows used sparingly.
- **Retro-futuristic** — late-90s / early-2000s design language reimagined: pixelated edges, chrome, intentional gradients, vintage system fonts.
- **Playful** — character-driven, illustrative, generous accent color, irregular shapes, expressive motion.

**Banned tone words**: "premium," "refined," "modern," "clean," "sleek," "minimalist." These produce the same generic output every time. They are slop magnets. Use a direction from the list above instead.

## Banned defaults — hard rules

The agent must NEVER ship these without explicit user override:

**Typography**
- Inter, Roboto, Arial, system-ui, Helvetica as primary fonts
- Space Grotesk (overused by AI to the point of parody)
- A single sans-serif for the whole UI without a contrast pairing
- All headings the same weight and size as body copy

**Color**
- Purple-to-pink gradients
- Violet-to-indigo gradients
- Blue-to-purple gradients
- Pure black `#000000` — use an off-black like `#0E0E10`
- Pure white `#FFFFFF` — use an off-white like `#FAFAF7`
- A blue accent (`#3B82F6` and similar) without project justification — blue is the default everyone reaches for

**Layout**
- Centered hero + 3-column feature cards + footer CTA (the "AI landing page")
- Sidebar + topbar + 4 stat cards + chart + table (the "AI dashboard")
- Card grids where every card is identical width and styled identically
- Perfect symmetry as the default composition

**Motion**
- `transition-all` — always specify which property animates
- Raw `duration-300`, `duration-500` literals — use named project easings instead
- Generic ease curves — projects should define named easings

**Components**
- Untouched shadcn defaults for `Button`, `Input`, `Card` — the project must customize these with at least one aesthetic-aligned variant
- Lucide icons used as decoration without a labeled purpose

If the user explicitly asks for one of these, do it. Otherwise, refuse and propose an alternative.

## Typography — where character actually lives

- **Pair, don't pick**: use two fonts in deliberate contrast. Common patterns: serif heading + sans body; mono heading + sans body; distinctive sans + utility sans. A single font everywhere is the slop default.
- **Scale variation**: use real scale jumps. Heading-to-body ratio of 4-6x is normal for editorial layouts; 1.5x is timid. Pick a scale and use the full range.
- **Tracking and leading**: headings often want tighter tracking (`tracking-tight` or below). Body text often wants slightly looser leading. Defaults are rarely optimal for character.
- **Numerals**: for data-heavy UI, use `font-variant-numeric: tabular-nums` so numbers align in tables.
- **Fonts worth considering** (not prescribed — match the aesthetic): Fraunces, Instrument Serif, Söhne, Geist, IBM Plex (Sans/Serif/Mono), JetBrains Mono, Inter Tight (different from Inter), Departure Mono, Migra, Editorial New, PP Neue Montreal.

## Hierarchy — beyond bold and big

Hierarchy is composed from many tools, not just font weight:

- **Scale** — make the most important element dramatically larger than secondary ones. Timid scale ratios produce flat-looking UI.
- **Position** — top-left and visual center carry the most weight. Use position deliberately.
- **Density** — surround the most important element with whitespace. Crowd the secondary stuff.
- **Color contrast** — accent color should appear sparingly, on the *one* thing that matters most on screen.
- **Asymmetry** — perfect centering is a slop tell. Deliberate off-center composition reads as designed.

## Required for every screen — completeness rules

These are non-negotiable. A screen missing any of these is incomplete, regardless of aesthetic.

1. **Empty state** — if a list or table can be empty, design the empty state. Icon + message + CTA, matching the screen's aesthetic. No generic "No data" placeholders.
2. **Loading state** — skeleton loaders matching the actual layout shape, or a deliberate spinner with motion that fits the aesthetic. Never a blank flash.
3. **Error state** — designed message with a recovery action. Don't leave the user wondering.
4. **All actions present** — if the spec says users can add, edit, delete, share, or archive, all must be reachable in the UI.
5. **Mobile-aware** — responsive Tailwind classes (`sm:`, `md:`, `lg:`). Tables scroll horizontally. Touch targets ≥44px.
6. **Dark mode** — every component works in both modes. Use semantic Tailwind tokens (`bg-background`, `text-foreground`, `bg-muted`, `text-muted-foreground`, `border`, `ring`). Never hardcode hex values.
7. **Keyboard accessible** — focus rings visible, logical tab order, Escape closes dialogs.

## Stack discipline — shadcn + Tailwind 4

- **Check what exists first**: `Card`, `Button`, `Badge`, `Dialog`, `Table`, `Tabs`, etc. Install missing primitives with `pnpm dlx shadcn@latest add <name>`.
- **Customize, don't accept defaults**: shadcn primitives ship neutral on purpose. The project should have at least one non-default variant per primary component, tied to the aesthetic direction. If those don't exist yet, create them as part of the work.
- **Project tokens over Tailwind defaults**: if the project defines a custom radius scale, motion easing, or color in `tailwind.config.ts`, use those. Don't reach for `rounded-lg` if the project has `rounded-card`.

## Layout — default shapes AND escape hatches

When no aesthetic direction is set, or the user explicitly asks for a "standard" interface, these are reasonable defaults:

- **Dashboard shell**: sidebar + main content area, user info at the bottom of sidebar
- **Page header**: title + subtitle + primary action button (top right)
- **Stat cards**: 3-4 cards with number, label, optional trend indicator
- **Data tables**: `border-b` rows, `hover:bg-muted/50` on rows, sticky header when long
- **Forms**: labels above inputs, helper text below, validation inline

When an aesthetic direction IS set, reach for these layout-breaking primitives instead:

- **Asymmetric grids** — content blocks of different widths, deliberately offset
- **Full-bleed sections** — escape the container, let backgrounds run edge to edge
- **Oversized typography** — headings that occupy 30-50% of the viewport height
- **Marquee / ticker strips** — horizontal scrolling content as a design element
- **Broken-grid composition** — elements that deliberately cross gutters
- **Sidebar-less layouts** — top navigation + content, when the dashboard pattern doesn't fit
- **Split-screen layouts** — two unequal halves with different backgrounds or content density

The default shapes are starting points, not destinations. If the project has aesthetic direction, the layout should reflect it — not retreat to the dashboard template.

## Motion — character, not decoration

- **Named easings only**: use easings defined in the project (e.g., `ease-snap`, `ease-settle`, `ease-drift`). If they don't exist, define them in `tailwind.config.ts` first.
- **Be specific**: animate `opacity`, `transform`, `colors` — never `all`.
- **Stagger for lists**: when 3+ items appear together, stagger their entry by 30-60ms each.
- **Respect `prefers-reduced-motion`**: wrap motion in the appropriate query.
- **Restraint is also a choice**: a brutalist UI with no transitions reads as more designed than a generic UI with `transition-all duration-200` everywhere. Choose, don't default.

## Spacing and composition

- Section padding: `px-6 py-8` or `p-6` minimum for page-level content
- Card padding: `p-6` minimum
- Stack gap: `space-y-6` between major sections, `space-y-4` within a card
- Inline gap: `gap-3` or `gap-4` between sibling elements
- Whitespace is load-bearing, not empty. Generous margins read as confident; tight margins read as cramped.

## Never do this

- Ship a page with no navigation back to the main area
- Leave list items with no way to interact (no edit, no delete, no detail link)
- Use `<div>` where `<Card>` or `<Button>` would be correct
- Skip the page header — every page needs a clear title
- Design only the happy path — empty / error / loading states are required
- Default to centered card grids when an aesthetic direction is set
- Pick a font without thinking about pairing
- Use `transition-all`
- Reach for purple gradients
- Generate UI without writing down the aesthetic direction first
- Treat "minimal" or "clean" as a design direction — they aren't, they are slop magnets
