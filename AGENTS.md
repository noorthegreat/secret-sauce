# Secret Sauce Agent Rules

These rules apply to any AI agent, assistant, or automation working in this repository.

## Mission

- Ship production-grade code with secure defaults.
- Follow OWASP Top 10 (2025), OWASP ASVS 5.0, and the OWASP Secure Coding Practices.
- Prefer framework-native protections, least privilege, deny-by-default authorization, and safe failure modes.

## Required Security Standards

- Prevent injection by using parameterized queries, typed APIs, allowlists, and strict schema validation.
- Prevent XSS with contextual output encoding, trusted rendering paths, and no unsafe HTML injection unless explicitly reviewed and sanitized.
- Prevent CSRF by using same-site cookies, origin checks, CSRF tokens where session auth is used, and framework-native anti-CSRF features.
- Prevent SSRF by disallowing arbitrary outbound URLs, validating destinations against allowlists, and refusing direct user-controlled fetch targets.
- Prevent IDOR and broken access control by checking authorization on every read/write path and scoping all data access to the authenticated actor.
- Prevent insecure deserialization and mass assignment by validating payload shape, rejecting unknown fields when appropriate, and mapping external input into explicit server-side models.
- Prevent secret leakage by never hardcoding secrets, never committing real credentials, and never logging tokens, API keys, or sensitive personal data.
- Prevent weak auth or session handling by using secure cookies, short-lived tokens where possible, session invalidation on sensitive changes, and rate limits on auth-related flows.
- Prevent unsafe file handling by validating content type, size, extension, storage path, and filename normalization before accepting uploads or downloads.
- Prevent sensitive-data exposure by minimizing collection, redacting logs, encrypting secrets in transit and at rest through managed platform features, and returning generic error messages to clients.

## Engineering Defaults

- Validate all untrusted input at trust boundaries with explicit schemas.
- Encode output for the exact rendering context: HTML, attribute, URL, JSON, and SQL are different contexts.
- Use safe error handling: log structured internal details, but return minimal client-safe messages.
- Use secure logging: include traceable metadata, exclude secrets and high-risk personal data.
- Use rate limiting and abuse controls on login, signup, feedback submission, waitlist, admin actions, and any expensive endpoint.
- Keep dependencies minimal, pinned where practical, and from trusted sources. Flag vulnerable packages before merge.
- Prefer server-side authorization checks even when the client already restricts UI access.
- Prefer idempotent admin actions, explicit confirmation for destructive behavior, and audit trails for privileged operations.

## Supabase And Data Rules

- Never apply database migrations or schema changes directly unless the user explicitly asks for migration files or SQL output.
- Always use Supabase policies, scoped queries, or server-side checks to enforce row-level access.
- Never expose the service role key to the client.
- Treat edge functions, cron routes, admin flows, and email tooling as privileged surfaces that require explicit authorization checks.

## Secret Handling

- Use `.env.example` for placeholders only.
- Keep real secrets in local untracked env files or managed secret stores.
- If you discover a tracked credential or token, stop and remove it from the new work before proceeding.

## Agent Workflow

- Before coding, inspect the relevant files and existing patterns.
- When a request is underspecified and security or data exposure could change, ask a targeted follow-up question before implementing.
- After coding, explain the security protections added, the remaining risks, and any assumptions made.
- If a requested change would introduce an obvious security regression, do not implement it silently. Call it out and propose a safer path.
