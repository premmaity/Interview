# System architecture

## Context

```mermaid
C4Context
  title Interview Mentor system context
  Person(candidate, "Candidate", "Practices and reviews their own interviews")
  System(system, "Interview Mentor", "Durable AI-assisted coaching; no hiring decisions")
  System_Ext(ai, "AI/STT provider", "Question generation, evaluation, transcription")
  System_Ext(email, "Email provider", "Recovery delivery seam; production implementation pending")
  Rel(candidate, system, "Practices", "HTTPS")
  Rel(system, ai, "Validated structured requests", "HTTPS")
  Rel(system, email, "Generic recovery workflow", "HTTPS")
```

## Containers

```mermaid
C4Container
  title Interview Mentor containers
  Person(candidate, "Candidate")
  Container(web, "React web", "TypeScript, Vite", "Static accessible UI")
  Container(api, "FastAPI API", "Python", "Stateless REST/SSE, auth, orchestration")
  Container(worker, "Worker", "Python", "Retryable evaluation jobs")
  ContainerDb(db, "PostgreSQL", "SQL", "Authoritative users, sessions, turns, reports")
  ContainerDb(redis, "Redis", "Key Value", "Rate metadata and bounded job queues")
  ContainerDb(objects, "Object storage", "S3", "Optional short-lived media/resume artifacts")
  System_Ext(provider, "AI/STT provider")
  Rel(candidate, web, "Uses")
  Rel(web, api, "Cookie + CSRF REST/SSE")
  Rel(api, db, "Async SQL")
  Rel(api, redis, "Rate limits / enqueue")
  Rel(worker, redis, "Consumes / failed-job visibility")
  Rel(worker, db, "Idempotent writes")
  Rel(api, provider, "Question/STT adapter")
  Rel(worker, provider, "Evaluation adapter")
  Rel(api, objects, "Signed artifact seam")
```

The API is stateless between requests. PostgreSQL is authoritative; Redis loss can delay jobs or degrade distributed rate limiting but cannot erase a completed answer.

## Authentication sequence

```mermaid
sequenceDiagram
  actor C as Candidate
  participant W as Web
  participant A as API
  participant D as PostgreSQL
  C->>W: Submit email/password
  W->>A: POST /auth/login
  A->>D: Lookup normalized email
  A->>A: Verify Argon2id and throttle
  A->>D: Store hash(opaque token), hash(CSRF)
  A-->>W: HttpOnly session cookie + readable SameSite CSRF cookie
  W->>A: Mutation + cookies + X-CSRF-Token
  A->>D: Resolve unexpired, unrevoked session
  A->>A: Constant-time CSRF verification
  A-->>W: Authorized response
```

## Answer to next question

```mermaid
sequenceDiagram
  participant W as Web
  participant A as API
  participant D as PostgreSQL
  participant P as AI adapter
  W->>A: POST answer + client_request_id
  A->>D: Lock owned session row
  A->>D: Check unique(session, request_id)
  alt duplicate
    A-->>W: Rehydrate current durable state
  else accepted
    A->>D: Validate ACTIVE/current question; insert answer
    alt more questions
      A->>P: Generate one validated question
      A->>D: Insert unique(session, sequence), advance counter
    else final answer
      A->>D: Transition ACTIVE → EVALUATING
      A->>A: Enqueue durable identifiers
    end
    A-->>W: Current session state
  end
```

## Voice transcription

```mermaid
sequenceDiagram
  actor C as Candidate
  participant W as Web
  participant A as API
  participant S as STT adapter
  C->>W: Explicitly consent and record
  W->>A: Bounded MediaRecorder upload
  A->>A: Authorize session, MIME/size checks
  A->>S: Audio bytes + language
  S-->>A: Transcript
  A->>A: Discard raw bytes (default retention 0)
  A-->>W: Editable transcript
  C->>W: Review/edit, then submit text
```

## Async evaluation and reconnect

```mermaid
sequenceDiagram
  participant A as API
  participant R as Redis
  participant K as Worker
  participant P as AI adapter
  participant D as PostgreSQL
  A->>D: Commit EVALUATING + final answer
  A->>R: Enqueue session ID
  K->>R: BRPOP job
  K->>D: Load durable turns; skip completed jobs
  K->>P: Validate each structured evaluation
  K->>D: Store answer/aggregate evaluations; COMPLETED
  Note over K,R: Bounded retry, then failed-job list and FAILED state
```

```mermaid
sequenceDiagram
  actor C as Candidate
  participant W as Web
  participant A as API
  participant D as PostgreSQL
  C->>W: Refresh/reconnect
  W->>A: GET /interviews/{id}
  A->>D: Authorize and load questions/answers/state
  A-->>W: Durable current question and completed turns
  W->>A: Retry same answer request ID if prior outcome unknown
  A-->>W: Existing result without duplicate model charge
```

## Entity relationships

```mermaid
erDiagram
  USERS ||--o{ AUTH_SESSIONS : has
  USERS ||--o| CANDIDATE_PROFILES : owns
  USERS ||--o{ INTERVIEW_SESSIONS : practices
  USERS ||--o{ INTERVIEW_TEMPLATES : owns
  INTERVIEW_TEMPLATES o|--o{ INTERVIEW_SESSIONS : snapshots
  INTERVIEW_SESSIONS ||--o{ INTERVIEW_QUESTIONS : contains
  INTERVIEW_QUESTIONS ||--o| INTERVIEW_ANSWERS : receives
  INTERVIEW_SESSIONS ||--o{ EVALUATIONS : produces
  INTERVIEW_ANSWERS o|--o| EVALUATIONS : assessed_by
  USERS ||--o{ QUIZ_ATTEMPTS : owns
  QUIZ_ATTEMPTS ||--o{ QUIZ_ANSWERS : contains
  USERS o|--o{ AUDIT_EVENTS : causes
```

Critical constraints include normalized unique email, unique optional username, unique `(session_id, sequence)` questions, unique question answers, unique `(session_id, client_request_id)` idempotency, bounded score/confidence checks, and user/created-time indexes for history. User ownership is included in every session lookup to prevent horizontal access.

## Extraction seams

Keep the modular monolith until measured load justifies change. The first candidates for extraction are evaluation orchestration (provider quotas), media/transcription (bandwidth/CPU), and interview orchestration (only if lock contention becomes measurable). Kafka and Kubernetes are deliberately absent.
