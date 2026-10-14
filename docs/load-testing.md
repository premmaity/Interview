# Load testing

The k6 scenario at [infra/load/interview.js](../infra/load/interview.js) covers registration/login, session creation/start, answer submission, duplicate idempotent replay, and paginated history using the deterministic fake provider.

Run against an isolated environment only:

```bash
docker compose up --build -d
k6 run -e BASE_URL=http://localhost:8000 infra/load/interview.js
```

The scenario ramps to 50 virtual candidates for two minutes. Gates are under 1% request failures, over 99% checks, and p95 below 300 ms for the mixed non-provider workload. Increase in steps (50, 100, 200 concurrent sessions), watching database pool use, row-lock time, Redis queue age, worker throughput, and provider budget. Do not run against production or a paid provider; keep `AI_PROVIDER=fake`.

## Baseline

The repository host did not expose Docker or k6, so a PostgreSQL/k6 number would be fabricated. The verified local functional baseline on this host is:

- full backend suite: 27 tests at 88.92% branch-aware coverage;
- fake-provider workflow tests include repeated idempotent submissions and cross-user denial;
- frontend production build: 0.67 seconds, 463.95 kB JavaScript / 142.98 kB gzip and 18.19 kB CSS / 4.81 kB gzip;
- dependency audits: zero known Python and npm findings.

Record the first real PostgreSQL k6 run here before public deployment with date, commit, machine/service sizes, database pool, VUs, request rate, p50/p95/p99, failure rate, queue age, and CPU/memory. The expected first externally imposed bottleneck is provider quota/tail latency; with the fake provider, database connection count or row-lock contention should appear first.
