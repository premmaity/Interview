# Threat model

## Assets and trust boundaries

Primary assets are credentials, auth sessions, resumes/job descriptions, transcripts, reports, optional audio, provider keys, and provider spend. Browser, API, PostgreSQL, Redis/worker, object storage, and external providers are separate trust boundaries. All user/profile/media text is untrusted data, including text that attempts to override prompts.

| Threat | Controls | Residual / next control |
| --- | --- | --- |
| Credential stuffing and enumeration | Generic login/recovery errors, Argon2id, IP+identity throttles, 12–128 character policy | Add breached-password screening and verified email delivery |
| Session theft / XSS | HttpOnly opaque cookie, no localStorage bearer, CSP, no AI HTML rendering, short revocable records | Add CSP reporting and session-management UI |
| CSRF | SameSite cookies plus double-submit token verified against a server-side hash | Use same-origin deployment where practical |
| Cross-user object access | Every query includes authenticated owner; authorization test covers horizontal access | Continue object-level tests for every new resource |
| Prompt injection | Versioned system prompt, explicit untrusted delimiters, strict JSON schema, server owns lifecycle/auth/tools | Add adversarial prompt regression corpus |
| Malicious uploads | MIME allowlist, bounded reads, unpredictable object keys seam, no raw audio retention | Resume upload remains disabled until malware scanning exists |
| Denial/cost attack | Tight auth/media/AI rates, bounded input/question counts, provider timeouts/retries, worker concurrency and failed list | Add account quotas and global daily spend circuit breaker before public launch |
| Provider outage/malformed output | Typed adapter, validation, bounded retry only for retryable faults, deterministic fake, durable EVALUATING/FAILED state | Add provider fallback and operator replay UI |
| Duplicate requests/races | Row lock/transaction plus unique `(session, client_request_id)` and `(session, sequence)` | Add a PostgreSQL concurrent integration test in CI |
| Audio/privacy | Explicit consent, visible states, editable transcript, size/MIME limit, raw bytes discarded | Add object lifecycle audit before any audio retention |
| Secret disclosure | `.env` ignored, names-only example, CI secret scan, no provider payload logs | Owner must rotate leaked historical keys and coordinate history rewrite |

Logs include request/session identifiers and error types, not cookies, credentials, raw resumes, transcripts, or provider payloads. Scores must not use or infer protected attributes and must always be labeled coaching feedback.

