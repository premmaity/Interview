# Capacity and scalability estimate

## Planning workload

- 10,000 monthly active candidates; 20% practice on a busy day.
- 200 concurrent sessions initially, with a horizontal path to 1,000 subject to provider quotas.
- Typical round: 5 questions, 350 input tokens and 500 generated/evaluation tokens per turn, one final aggregate.
- Busy hour assumption: 600 sessions × 5 turns = 3,000 answer submissions (0.83 average requests/s, burst factor 20–50).
- At 200 live sessions with a turn every 90 seconds, approximately 2.2 AI-bound turns/s; at 1,000, approximately 11 turns/s.
- If half of answers use voice at 90 seconds and 32 kbps compressed, a round produces about 0.9 MB of transient audio; 10,000 monthly users × two five-turn rounds × 50% voice is roughly 45 GB/month processed but near-zero retained by default.
- Text/database growth is small: at about 12 KB per turn including indexes/JSON, 100,000 monthly turns add roughly 1.2 GB before backups and bloat.

## Initial sizing

- API: two replicas, 1 vCPU/1 GB each, 10 database connections each, request timeout below the platform timeout.
- Worker: one 1 vCPU/1 GB process with provider concurrency 4–8; scale by queue age, not CPU alone.
- PostgreSQL: start at 1–2 GB RAM with 50–100 connections through a pooler; retain daily backups.
- Redis: 256 MB is ample for bounded queue messages and expiring counters when `noeviction` is used for job safety.

## Horizontal path

API replicas are stateless; add replicas behind the platform load balancer while keeping total pool size below database limits. Worker replicas consume the same queue, and handlers first inspect the durable state. Apply per-user/global token budgets and provider semaphores before raising worker count. Audio objects must be immutable and stored outside process filesystems.

## Likely first bottleneck

The first limit is the AI/STT provider's request/token quota and tail latency—not Python request handling. At roughly 11 AI turns/s for 1,000 concurrent sessions, quotas, retries, and cost budgets dominate. Queue age and provider 429s should page before CPU. The next limit is database connection count if API/worker replicas are scaled without a global pool budget.

## Objectives and alerts

- 99.5% monthly availability.
- p95 non-AI API latency below 300 ms.
- p95 first AI output below 3 seconds when the provider is healthy (streaming remains a Phase 3 optimization).
- Alert on 5xx >2% for 5 minutes, login failure spikes, provider 429/5xx >5%, queue oldest age >120 seconds, queue failed list non-empty, DB pool >80%, backup failure, and disk >80%.

