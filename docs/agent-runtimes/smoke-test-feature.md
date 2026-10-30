# Smoke-Test Feature: Read-only Settings Page

This is a **maintainer validation artifact**, not a user feature. It's a deliberately tiny feature description a maintainer can feed to any runtime when running through `codex-checklist.md` (or an equivalent for another runtime).

Keeping this here (rather than under `specs/`) prevents polluting real specs with test fixtures.

---

## The feature (one paragraph)

Add a read-only Settings page at `/settings` that shows the signed-in user's email and account creation date. No editing, no save button, no new database fields — it just reads existing Better Auth session data and renders it.

## Why this makes a good smoke test

- **Small enough to run end-to-end in minutes** — one page, one server component, zero database migrations.
- **Touches the auth layer** — exercises the `requireAuth()` helper, which is a convention the boilerplate enforces.
- **No external APIs** — so the docs-fetcher agent should skip cleanly, which is the interesting path to test.
- **One phase, two waves** at most — easy to verify `/continue-feature`'s sequential path.

## Expected spec shape

A correctly-generated `specs/settings-page/` folder should contain:

1. `requirements.md` — single-paragraph Summary, one-line Users, no new data model, "Design Direction" field filled in (even if generic).
2. `implementation-plan.md` — one phase, 2–3 tasks, all wave:1 or wave:1 + wave:2. Real file paths from the codebase (`src/app/`, `src/lib/session.ts`).
3. `action-required.md` — should say "No manual steps required." (no external services).
4. `decisions.md` — may be empty or have one trivial decision.
5. `research-notes.md` — important. Must show `Codebase Scout: complete` and `Docs Fetcher: skipped (no external APIs)`. If the runtime has no MCP docs tool, that's fine — the skip reason is different but the command must not fail.

## Expected build shape

After `/continue-feature` runs to completion:

- `src/app/(authed)/settings/page.tsx` (or similar — the location is whatever the existing layout convention implies)
- `src/app/(authed)/settings/page.tsx` uses `requireAuth()` from `src/lib/session.ts`
- `docs/features/settings-page.md` exists with the template fields filled in
- All checkboxes in `specs/settings-page/implementation-plan.md` are checked `- [x]`
- `pnpm lint && pnpm typecheck && pnpm build:ci` all pass

## Cleanup after the smoke test

```bash
rm -rf specs/settings-page docs/features/settings-page.md
git restore src/app        # if the test created new files
```

## What "success" means

The smoke test passes if:

1. The spec generation produces all the files above with real paths.
2. `/continue-feature` runs in sequential mode without waiting on any background processes.
3. The build compiles after the feature is done.
4. Every checkbox is ticked and the feature doc exists.

The smoke test **does not** require parallel mode to work. If a maintainer wants to test parallel mode, they should run the same feature and force Mode A in `/continue-feature` — but a failure there means "parallel mode is not verified for this runtime," not "the repo is broken."
