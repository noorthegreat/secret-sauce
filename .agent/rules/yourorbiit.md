---
trigger: always_on
---

IMPORTANT: NEVER TRY TO APPLY DATABASE MIGRATIONS OR CHANGES DIRECTLY! The expert will run all database migrations and modifications manually. Output any SQL they will need when necessary.
IMPORTANT: WHEN USING MCP SERVERS, THE SUPABASE PROJECT ID IS ALWAYS: vlaqcfzmsjzgmzxodhkd
Generate types when needed by running `npm run gen-types`.
Never edit 'types.ts' manually, it should always be updated using 'npm run gen-types'
Follow OWASP Top 10 (2025), OWASP ASVS 5.0, and OWASP Secure Coding Practices for every code change.
Use parameterized queries, strict input validation, contextual output encoding, least privilege, and safe error handling by default.
Prevent XSS, CSRF, SSRF, IDOR, secret leakage, insecure deserialization, unsafe file handling, weak auth/session handling, and sensitive-data exposure.
Never hardcode secrets or commit real credentials. Use `.env.example` placeholders only, and keep real values in untracked env files or managed secret stores.
If a request is underspecified and security-sensitive behavior could change, ask a focused follow-up question before implementing.
