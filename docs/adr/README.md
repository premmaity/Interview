# Architecture decision records

## ADR-001: Modular monolith plus worker

**Decision:** Keep one FastAPI deployable with domain/service/repository boundaries and one worker entry point. **Why:** one developer can operate it, transactions stay local, and the known load does not justify network boundaries. **Consequence:** modules must not bypass ownership or state-machine services; evaluation/media/orchestration remain future extraction seams.

## ADR-002: PostgreSQL authority, Redis transient coordination

**Decision:** PostgreSQL owns every completed turn, lifecycle state, report, profile, and auth session. Redis carries rate-limit counters and bounded job messages only. **Why:** a cache outage must not erase interviews. **Consequence:** workers receive durable IDs and are idempotent; readiness treats Redis as required when dispatch mode is `redis`.

## ADR-003: Opaque server sessions

**Decision:** Store only SHA-256 hashes of high-entropy opaque session/CSRF tokens; put the session token in an HttpOnly SameSite cookie and mirror CSRF in a readable SameSite cookie/header. **Why:** no bearer credential is exposed to `localStorage`, revocation is immediate, and device sessions are inspectable. **Consequence:** cross-origin production deployments require exact CORS origins, credentials, TLS, and CSRF headers.

## ADR-004: Provider abstraction and versioned structured prompts

**Decision:** Domain code depends on `AIProvider` and `SpeechToTextProvider`; fake and Groq adapters implement validated Pydantic contracts. Prompts are versioned files. **Why:** deterministic local tests, bounded outputs, model replacement, and prompt rollback. **Consequence:** provider output cannot choose state, counts, tools, URLs, database operations, or authorization.

## ADR-005: Voice is progressive enhancement

**Decision:** Text is permanent. Prefer `SpeechRecognition || webkitSpeechRecognition` when present; otherwise MediaRecorder uploads to bounded STT. Raw audio retention defaults to zero. **Why:** browser speech APIs are uneven and audio is high-risk personal data. **Consequence:** the user edits text before submission; TTS is deferred until immutable object artifacts and TTL cleanup are complete.

## ADR-006: Redis list worker before a queue platform

**Decision:** Start with a small Redis list, bounded retries, failed-job visibility, and idempotent database checks. **Why:** evaluation volume is modest and an extra queue framework is not yet justified. **Consequence:** monitor queue age/depth; move to a managed queue or dedicated orchestration service if scheduling, priority, or throughput requirements outgrow this contract.

## ADR-007: Render topology

**Decision:** Use a Render static site, Docker API, Docker worker, managed PostgreSQL, and Key Value as the default production path. **Why:** it matches repository history and keeps the operational surface small. **Consequence:** API and static site are separate origins; owners must set exact origins/cookies, external S3-compatible storage, log/error drains, and paid pre-deploy support.

