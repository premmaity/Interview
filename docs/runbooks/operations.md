# Operations runbooks

## Provider outage or cost circuit breaker

1. Confirm provider status, 429/5xx rate, latency, and account quota without logging request bodies.
2. Reduce worker concurrency; return 429/503 with `Retry-After` instead of accepting unbounded work.
3. Preserve sessions in `evaluating`; do not fabricate reports. If a validated fallback is configured, switch via environment and redeploy.
4. When healthy, replay failed jobs by durable session ID only after confirming no aggregate evaluation exists.
5. Record duration, affected session IDs/count (not transcript content), cost impact, and corrective action.

## Stuck or growing queue

1. Inspect queue depth, oldest job age, worker health, provider errors, and DB pool saturation.
2. Pause producers or scale workers within provider concurrency limits. Do not blindly add consumers during provider throttling.
3. Inspect `interview:evaluation:retries` and `interview:evaluation:failed`; jobs use bounded exponential delayed retries and stop after three attempts.
4. Requeue only sessions still in `evaluating`. Completed sessions are idempotently skipped.
5. If Redis data is lost, query durable `evaluating` sessions and enqueue their IDs in bounded batches.

## High API error rate

1. Segment by status, route, request ID, deploy version, and dependency; never inspect credentials/transcripts in logs.
2. If readiness fails, check PostgreSQL first, then Redis when dispatch mode requires it.
3. Roll back the app for a release regression; shed AI/media work for dependency overload.
4. Verify login, create, answer/idempotent retry, history, and report after recovery.

## Migration failure

1. Stop rollout; do not let other replicas auto-run migrations.
2. Capture the Alembic revision and database error, then confirm whether the failed DDL was transactional.
3. Restore the pre-deploy snapshot if data/schema is ambiguous. Otherwise apply a reviewed forward fix.
4. Downgrade only when the migration's `downgrade()` is verified safe. Use expand/contract for production removals.

## Secret leak

1. Revoke the credential at its issuer immediately; rotate dependent services and invalidate affected sessions.
2. Review usage/audit logs and restrict provider budgets. Do not paste secret values into the incident record.
3. Remove from the current tree, enable push protection, and follow [history cleanup](../security/history-cleanup.md) only in a coordinated window.
4. Re-clone all deployments/collaborator checkouts after a force rewrite.

## Backup restore

1. Maintain encrypted daily PostgreSQL backups with a 30-day rolling window and object lifecycle/versioning where artifacts are enabled.
2. Monthly, restore into an isolated account/network, run `alembic current`, row-count/foreign-key checks, and a read-only session/report smoke test.
3. Record recovery point/time achieved. Never connect a restore test to production providers or email.
4. For real recovery, stop writes, restore the selected point, apply forward migrations, rotate database credentials, then reconcile jobs by durable state.

## Rollback

1. Identify the last healthy commit/image and schema compatibility.
2. Pause workers if they can write an incompatible schema, then redeploy API and worker.
3. Keep expanded columns/tables during application rollback; clean them in a later reviewed release.
4. Run health/readiness and the full smoke journey. Re-enable workers and monitor queue age/errors.

## Routine checks

- Daily: backup success, provider spend/quota, failed jobs, high-severity errors.
- Weekly: dependency/secret scan, database growth/index health, object lifecycle sample.
- Monthly: restore drill, session cleanup, SLO review, rate-limit effectiveness.
