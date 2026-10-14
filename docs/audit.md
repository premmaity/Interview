# Current-state audit and migration plan

Date: 2026-10-14

## Baseline verified

The repository history contains 11 commits on `main`; the credential file was added in the first commit and remained tracked. Its values were deliberately not read or emitted during this audit. Variable names confirm that it held a signing secret and two provider credentials. All must be treated as compromised.

The backend was one 227-line FastAPI module. It stored users, conversations, and TTS streams in process dictionaries; used unsalted SHA-256 passwords and browser bearer tokens; enabled wildcard CORS; coupled routes directly to Groq and RealtimeTTS; trusted a prompt to count questions; returned caught provider exceptions as HTTP 200; and generated one mutable audio filename per username. Its image exposed port 5000 while the process bound to 8000.

The frontend production build passed, but ESLint reported 80 errors and one warning. `npm audit` reported 24 findings: 1 critical, 14 high, 6 moderate, and 3 low. `main.jsx` activated only `App3.jsx`; seven other large JSX files were duplicate or dormant prototypes. The active UI stored bearer tokens in `localStorage`, hard-coded loopback URLs, had no router or typed API layer, used only `webkitSpeechRecognition`, and fetched protected audio without credentials. Quiz, resources, and job UIs referenced APIs the backend did not implement.

No meaningful backend tests, frontend tests, migrations, CI, production frontend configuration, operational documentation, or recovery procedures existed.

## Migration plan

1. **Contain risk:** remove the tracked environment file from the new tree, ignore local secrets, provide names-only examples, document key rotation and coordinated history cleanup.
2. **Foundation:** introduce the modular FastAPI application, PostgreSQL schema/Alembic, Redis readiness and queue seams, secure opaque cookie sessions with CSRF protection, profile APIs, structured errors, and containerized local infrastructure.
3. **Interview MVP:** add a transactional server state machine, idempotent answer submission, provider contracts and deterministic fake, durable questions/answers/evaluations, history/report/delete APIs, and the typed accessible React application.
4. **Voice/async:** provide browser speech as an enhancement, MediaRecorder/STT upload fallback with limits and consent, immutable artifact contracts, async evaluation jobs, SSE status, and cleanup seams.
5. **Operate:** add tests, lint/type gates, CI, production images, Render blueprint, diagrams, threat/capacity analysis, and incident/rollback runbooks.

The secondary quiz/resources/job modules are intentionally feature-flagged or deferred until they have complete server contracts and authorization. This prevents the dormant prototype UI from masquerading as shipped functionality.

## Retained, replaced, and removed

- Retained: the Interview Mentor product name, technical/behavioral practice intent, editable speech transcript concept, profile/quiz/resources ideas.
- Replaced: all authentication, persistence, interview orchestration, AI and media integration, route handling, frontend architecture, and deployment configuration.
- Removed after migration: duplicate `App*.jsx` prototypes, brittle remote animation/assets, fixed audio files, and server-side speaker playback.
- Deferred: vetted resources, stored quizzes, job discovery, production email delivery, malware scanner integration, and real TTS generation.

