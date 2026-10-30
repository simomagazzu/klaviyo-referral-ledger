---
name: security-audit
description: Security code review for vulnerabilities. Use when asked to "security review", "security audit", "find vulnerabilities", "check for security issues", or before deploying. Provides systematic review with confidence-based reporting.
---

# Security Audit

Identify exploitable security vulnerabilities in the codebase. Report only **HIGH CONFIDENCE** findings — clear vulnerable patterns with attacker-controlled input.

## Scope: Research vs. Reporting

**CRITICAL DISTINCTION:**

- **Report on**: Only confirmed vulnerabilities with exploitable paths
- **Research**: The ENTIRE codebase to build confidence before reporting

Before flagging any issue, you MUST research the codebase to understand:
- Where does this input actually come from? (Trace data flow)
- Is there validation/sanitization elsewhere?
- What framework protections exist? (React auto-escaping, Drizzle parameterization, etc.)

**Do NOT report issues based solely on pattern matching.** Investigate first, report only what you're confident is exploitable.

## Confidence Levels

| Level | Criteria | Action |
|-------|----------|--------|
| **HIGH** | Vulnerable pattern + attacker-controlled input confirmed | **Report** with severity |
| **MEDIUM** | Vulnerable pattern, input source unclear | **Note** as "Needs verification" |
| **LOW** | Theoretical, best practice, defense-in-depth | **Do not report** |

## Severity Classification

| Severity | Impact | Examples |
|----------|--------|----------|
| **Critical** | Direct exploit, severe impact, no auth required | RCE, SQL injection, auth bypass, hardcoded secrets |
| **High** | Exploitable with conditions, significant impact | Stored XSS, SSRF, IDOR to sensitive data |
| **Medium** | Specific conditions required, moderate impact | Reflected XSS, CSRF, path traversal, missing rate limits |
| **Low** | Defense-in-depth, minimal direct impact | Missing headers, verbose errors |

---

## Do Not Flag (False Positives)

### Server-Controlled Values

These are configured by operators, not controlled by attackers:

| Source | Example | Why It's Safe |
|--------|---------|---------------|
| Environment variables | `process.env.POSTGRES_URL` | Deployment configuration |
| Config files | `next.config.ts`, `drizzle.config.ts` | Server-side files |
| Hardcoded constants | `const BASE_URL = "..."` | Compile-time constants |
| Framework settings | `betterAuth({ ... })` | Not user-modifiable |

### Framework-Mitigated Patterns

| Pattern | Why It's Usually Safe |
|---------|----------------------|
| React `{variable}` in JSX | Auto-escaped by default |
| Drizzle `db.select().from(table).where(eq(...))` | Query builder parameterizes |
| `apiResponse({ data })` / `apiError(msg)` | Controlled response format |
| Better Auth session handling | Framework manages cookies securely |

**Only flag when:**
- React: `dangerouslySetInnerHTML={{__html: userInput}}`
- Drizzle: `db.execute()` with template literal interpolation of user input
- API routes: `req.json()` used without Zod validation via `parseBody`

### General Rules
- Test files (unless explicitly reviewing test security)
- Dead code, commented code, documentation
- Code paths that require prior authentication (note the auth requirement instead)

---

## This Stack — What to Check

### 1. API Routes — `src/app/api/`

Scan every route file. Each one MUST have:

| Check | Pattern | Severity if missing |
|-------|---------|---------------------|
| Rate limiting | `applyRateLimit()` before logic | Medium |
| Authentication | `requireApiAuth()` on user-data routes | Critical |
| Input validation | `parseBody(req, zodSchema)` for POST/PUT/PATCH | High |
| No raw body | Never `await req.json()` — always `parseBody` | High |

For each route, report: `[path] [rate-limit: Y/N] [auth: Y/N/n-a] [validation: Y/N/n-a]`

### 2. SQL / Query Safety

```typescript
// SAFE: Drizzle query builder (parameterized)
db.select().from(users).where(eq(users.id, userId));
db.insert(users).values({ name });

// FLAG: Raw SQL with interpolation
db.execute(`SELECT * FROM users WHERE id = ${userId}`);  // SQL injection
db.execute(sql`SELECT * FROM users WHERE id = ${userId}`);  // CHECK: tagged template may be safe
```

### 3. XSS & Content Injection

```tsx
// SAFE: React auto-escapes
<div>{userInput}</div>
<span>{data.name}</span>

// FLAG: Explicit unsafe rendering
<div dangerouslySetInnerHTML={{__html: userInput}} />  // Critical
// Only safe if sanitized with DOMPurify

// FLAG: URL-based XSS
<a href={userInput}>  // Check for javascript: protocol
<iframe src={userInput} />
```

### 4. Environment & Secrets

- Grep for hardcoded keys: patterns like `sk-`, `pk_`, `password=`, `secret=`, `-----BEGIN` in `.ts`/`.tsx` files (excluding `.env`, `env.example`, `node_modules`)
- `.env` must be in `.gitignore`
- `BETTER_AUTH_SECRET` default placeholder not used outside `env.example`
- `BETTER_AUTH_URL` is set in config

### 5. Path Traversal

Any file operation with user-supplied paths must validate against a root directory:

```typescript
// SAFE: Validates resolved path is within allowed root
const resolved = join(root, userPath);
if (!resolved.startsWith(root + "/")) throw new Error("Invalid path");

// FLAG: No validation
const filepath = join("public/uploads", req.query.file);  // ../../../etc/passwd
fs.readFile(filepath);
```

Check `src/lib/storage.ts` and any upload/download routes.

### 6. Command Injection

```typescript
// FLAG: Critical — any of these with user input
exec(userInput);
execSync(userInput);
spawn(cmd, { shell: true });  // If cmd has user input
child_process.exec(userCmd);

// CHECK: execSync in health route — is the command hardcoded or user-influenced?
```

### 7. Authentication & Sessions

- `BETTER_AUTH_SECRET` validated as 32+ characters
- `BETTER_AUTH_URL` / `baseURL` is set in auth config
- No session data leaked in client responses
- Health endpoint returns minimal info in production (not config state)
- Protected pages use `requireAuth()`, protected API routes use `requireApiAuth()`

### 8. Security Headers — `next.config.ts`

| Header | Required | Value |
|--------|----------|-------|
| `Content-Security-Policy` | Yes | Restricts script/style sources |
| `X-Content-Type-Options` | Yes | `nosniff` |
| `X-Frame-Options` | Yes | `DENY` or `SAMEORIGIN` |
| `Referrer-Policy` | Yes | `strict-origin-when-cross-origin` or stricter |
| `Strict-Transport-Security` | Yes (production) | `max-age=31536000; includeSubDomains` |
| `X-XSS-Protection` | **Must NOT exist** | Deprecated, can cause issues |

### 9. Dependencies

```bash
pnpm audit --audit-level=high
```

Report any high or critical vulnerabilities.

### 10. Error Handling

- API route `catch` blocks must return generic messages via `apiError()`, not `error.message` or stack traces
- Production health endpoint must not expose config state
- No `console.log` in API routes (use `logger` if available)

### 11. SSRF (Server-Side Request Forgery)

```typescript
// FLAG: User-controlled URL in server-side fetch
const data = await fetch(req.query.url);  // SSRF

// SAFE: URL from config/env
const data = await fetch(process.env.API_URL);  // Server-controlled
```

### 12. Prototype Pollution

```typescript
// FLAG: Object merge with user input
Object.assign(target, userObject);  // If userObject from request
{ ...target, ...req.body };  // CHECK: Spread is generally safe, but verify

// SAFE: Zod-validated input (strips unknown keys)
const data = schema.parse(req.body);
```

---

## Review Process

1. **Detect scope**: What files are being reviewed? (full audit = all `src/`, targeted = specific routes)
2. **Load context**: Read AGENTS.md for project patterns, check `src/lib/api-utils.ts` for helper signatures
3. **Scan API routes**: Every file in `src/app/api/` — check rate limiting, auth, validation
4. **Trace user input**: For each route, trace where request data flows. Does it reach a dangerous sink?
5. **Check infrastructure**: Headers in `next.config.ts`, secrets handling, storage security
6. **Verify exploitability**: For each finding, confirm attacker-controlled input reaches the vulnerable pattern
7. **Report**: Only HIGH confidence findings. Note MEDIUM as "Needs verification"

---

## Output Format

```markdown
## Security Audit Report

### Summary
| Category | Status | Issues |
|----------|--------|--------|
| API Routes | pass/fail | count |
| SQL Safety | pass/fail | count |
| XSS/Injection | pass/fail | count |
| Secrets | pass/fail | count |
| Path Traversal | pass/fail | count |
| Command Injection | pass/fail | count |
| Auth & Sessions | pass/fail | count |
| Headers | pass/fail | count |
| Dependencies | pass/fail | count |
| Error Handling | pass/fail | count |
| SSRF | pass/fail | count |

### Findings

#### [VULN-001] [Vulnerability Type] (Severity)
- **Location**: `file.ts:123`
- **Confidence**: High
- **Issue**: [What the vulnerability is]
- **Impact**: [What an attacker could do]
- **Evidence**:
  ```typescript
  [Vulnerable code snippet]
  ```
- **Fix**: [How to remediate]

### Needs Verification

#### [VERIFY-001] [Potential Issue]
- **Location**: `file.ts:456`
- **Question**: [What needs to be verified]
```

If no vulnerabilities found: "No high-confidence vulnerabilities identified."

## After the Audit

**Report first. Do not apply fixes automatically.** The report itself is the primary deliverable.

Once the report is out, ask the user:

> Want me to fix the Critical and High items? (I'll ask before touching Medium.)

Then:

- **User confirms**: apply fixes in order of severity (Critical → High). For each Medium finding, ask before touching — some are intentional design choices (e.g. loose CSP in dev mode, missing HSTS on localhost). After each batch of fixes, run `pnpm lint && pnpm typecheck`.
- **User declines**: stop. The report is the deliverable.
- **User wants only some**: apply exactly what they pick, in severity order.

Never commit or open a PR as part of the audit — leave the diff for the user to review.
