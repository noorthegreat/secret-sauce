# Secret Sauce Claude Rules

Follow [AGENTS.md](./AGENTS.md) as the repository-wide source of truth for agent behavior.

## Non-Negotiable Security Defaults

- Follow OWASP Top 10 (2025), OWASP ASVS 5.0, and the OWASP Secure Coding Practices.
- Never hardcode secrets, API keys, passwords, or tokens.
- Use parameterized queries and explicit input validation for any database or search operation.
- Enforce authorization on every privileged read, write, admin action, and background job trigger.
- Use contextual output encoding and avoid unsafe HTML rendering.
- Block SSRF by refusing arbitrary outbound URLs and using allowlists for any external fetch targets.
- Do not log secrets, auth tokens, raw webhook payloads with credentials, or unnecessary personal data.
- Use secure error handling: internal structured logs, external minimal messages.
- Prefer framework-native protections for CSRF, cookies, headers, and auth/session handling.
- Treat uploads, imports, CSV handling, and email tooling as untrusted input surfaces.

## Repo-Specific Rules

- Never try to apply database migrations or changes directly. Output SQL or migration files when needed and let the expert run them manually.
- The Supabase project ID used with MCP tools is `vlaqcfzmsjzgmzxodhkd`.
- Generate types when needed with `npm run gen-types`.
- Never edit `types.ts` manually. Regenerate it instead.

## Delivery Expectations

- Inspect surrounding code before changing patterns.
- If a request is not specific enough and the security or data model impact is unclear, ask a focused follow-up question.
- After implementation, summarize protections added, remaining risks, and assumptions.
