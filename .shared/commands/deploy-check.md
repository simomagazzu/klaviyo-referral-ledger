---
description: Validate the project is ready for deployment
---

# Deploy Check

Runs a comprehensive pre-deployment checklist.

## Checks

### 1. Code Quality
```bash
pnpm lint && pnpm typecheck
```
Both must pass. No exceptions.

### 2. Build Test
```bash
pnpm build:ci
```
The app must build without errors.

### 3. Environment Variables

Read `env.example` and verify each required variable is documented. Check for:
- [ ] No default dev credentials in production code
- [ ] `BETTER_AUTH_SECRET` is not the default placeholder
- [ ] `POSTGRES_URL` is set to a production database (not localhost)
- [ ] `NEXT_PUBLIC_APP_URL` points to the real domain

### 4. Security Audit

Scan all files in `src/app/api/` for:
- [ ] Every route uses `applyRateLimit()`
- [ ] Protected routes use `requireApiAuth()`
- [ ] Request bodies are validated with Zod
- [ ] No `console.log` statements (use `logger` instead)

### 5. Database

- [ ] All schema changes have corresponding migrations in `drizzle/`
- [ ] No pending schema changes: compare `src/lib/schema.ts` against last migration

### 6. Dependencies

```bash
pnpm audit --audit-level=high
```

Report any high or critical vulnerabilities.

### 7. Git Status

```bash
git status
git log origin/main..HEAD --oneline
```

- [ ] No uncommitted changes
- [ ] Branch is up to date with main

## Output

```
# Deploy Readiness Report

## Results
| Check | Status |
|-------|--------|
| Lint | ✅ / ❌ |
| TypeCheck | ✅ / ❌ |
| Build | ✅ / ❌ |
| Environment | ✅ / ⚠️ |
| Security | ✅ / ⚠️ |
| Database | ✅ / ⚠️ |
| Dependencies | ✅ / ⚠️ |
| Git | ✅ / ⚠️ |

## Verdict: {READY / NOT READY}

{If not ready: list blocking issues}
{If ready: "Safe to deploy. Run `git push` and trigger your deployment pipeline."}
```
