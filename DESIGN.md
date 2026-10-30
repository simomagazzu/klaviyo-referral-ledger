# Design Direction — Klaviyo Referral Ledger

> Source of truth for the project's aesthetic. The `frontend-design` skill reads this on every UI task.
> The app implements the Claude Design file `Klaviyo Referral Ledger.dc.html` (kept in `design/prototype/`) with the LOOP design system v3 "Precisione".

## Aesthetic direction

**Technical-Utility.** An internal finance ledger for one agency owner: dense tables, tabular numbers, and one big figure per screen (the period payout). Navy and white do the work. Colour carries meaning only: red = a check failed, amber = an open question, green = active or resolved. No decoration, no illustrations.

## Reference

- `design/prototype/Klaviyo Referral Ledger.dc.html`: layout, copy and states of every view
- `design/prototype/_ds/…/colors_and_type.css` and `components.css`: the LOOP tokens and components

## Typography

**Heading and body:** Poppins (local files in `src/app/fonts`). Hierarchy comes from weight and size only.
**Scale:** h1 22px/600 navy · client name 32px/600 · period payout 48px/500 navy · body 14–16px · captions 12–13px.
**Tabular numerals:** required everywhere (`tabular-nums` on the shell).

## Color story

**Mode:** light only (the LOOP system has no dark palette).
**Accent:** navy `#192575` for primary actions, selected chips and figures. Hover is navy-700 `#121B5C`, and table totals use navy-900 `#0B1240`.
**Ink:** `#0E1236`, muted `#4A5072`. **Surfaces:** white, with navy-50 `#F3F4FA` for filter panels, expanded rows and table headers.
**Rules:** `rgba(25,37,117,.12)` decorative, `rgba(25,37,117,.52)` control borders.
**Semantic:** danger `#B8352E`/`#FBEDEC`, warning `#8F620A`/`#FBF3E2`, success `#16794F`/`#E7F4EE`, "new" blue `#2074A3`/`#EAF2F8`.
All are Tailwind tokens in `src/app/globals.css` (`bg-navy-50`, `text-danger`, `border-rule-strong`, …).

## Radii

`rounded-tag` 6px (badges, month boxes) · `rounded-control` 12px (buttons, inputs, chips, tiles) · `rounded-card` 20px (tables, filter panel) · `rounded-panel` 28px (referral cards, empty states, chart).

## Motion personality

Deliberate restraint. Only hover colour and the row chevron animate, at 140ms with `ease-snap`. Reduced motion is respected.

## Layout personality

Single column, `max-w-[1240px]`, 32px gutters (16px on phones), 32px between sections. Top tabs are the navigation. Wide tables scroll horizontally inside their card, and the page itself never scrolls sideways.

## Tone of voice

Plain, factual English. Say what was found and what to do; ask instead of accusing.
- "Did this client churn from SMS? I see the payout was cut short early: last line Apr 2, 2026, window ends Apr 18, 2027." ✓
- "Error: Klaviyo underpaid!" ✗

## Anti-patterns for this app

- No insights, forecasts or recommendations on screen: the owner asks questions when needed.
- Never show Managed Accounts data.
- Label inferred rules as inferred.
- No emoji, no shadows (except overlays), no gradients except the logo.

## Component customizations

- **Button:** primary navy 48px (`sm` 40px), outline = LOOP secondary (white, navy text, strong rule), link = underlined navy.
- **Input / Textarea:** 48px, 12px radius, strong rule border, navy on hover/focus.
- **Chips:** `ChoiceChips` (radiogroup with a visible label and a check icon) and `FilterChips` (toggle buttons with counts) in `src/components/ledger/primitives.tsx`.
