# Deployment

## Local reproducibility

```bash
cp .env.example .env
docker compose config
docker compose up --build
curl -fsS http://localhost:8000/health/live
curl -fsS http://localhost:8000/health/ready
```

`migrate` must complete before API/worker start. To include local S3-compatible storage, run `docker compose --profile object-storage up --build`; object storage is a seam and no resume/audio persistence is enabled by default.

## Render production path

1. Fork/connect the repository and validate [render.yaml](../render.yaml) with `render blueprints validate render.yaml`.
2. Set `FRONTEND_ORIGIN` on API and worker to the exact HTTPS static-site URL.
3. Set `VITE_API_BASE_URL` on the static site to the exact HTTPS API URL.
4. Set a newly issued `GROQ_API_KEY`; never reuse historical keys. Configure external S3 credentials only when an artifact feature is enabled.
5. Confirm `APP_ENV=production`, `COOKIE_SECURE=true`, the appropriate `COOKIE_SAMESITE`, managed PostgreSQL/Key Value internal URLs, and `EVALUATION_DISPATCH=redis`.
6. Attach log/error/metrics drains and define provider-spend alerts. Configure at least two API replicas when the selected plan supports it.
7. The API `preDeployCommand` applies `alembic upgrade head` once. Do not add migration commands to API/worker startup.
8. After deploy, run health, registration/login, one fake/staging interview, worker completion, history, logout, and cross-user authorization smoke tests.

Render's official Blueprint specification confirms `type: keyvalue`, `runtime: static`, cross-service `connectionString`, and `preDeployCommand` support: <https://render.com/docs/blueprint-spec>.

## Cookie and origin topology

The static site and API are separate origins. CORS allows only `FRONTEND_ORIGIN` with credentials. The Blueprint uses Secure + `SameSite=None` so authentication works across Render's separate default hostnames; double-submit CSRF remains mandatory. Prefer custom frontend/API hostnames under the same registrable domain and then switch to `COOKIE_SAMESITE=lax`. Browser third-party-cookie policies can still block a truly cross-site deployment, so validate login in target browsers or add a same-origin reverse proxy before launch.

## Release checklist

- CI green, zero high/critical dependency findings, secret scan clean.
- Migration tested up/down on a recent sanitized copy; backup snapshot completed.
- Provider quota/cost limits checked; worker and failed-job alerts enabled.
- Database pool budget: API replicas × pool + worker pools below managed limit.
- Static `VITE_API_BASE_URL`, API `FRONTEND_ORIGIN`, TLS, and cookie flags verified.
- `/health/live` and `/health/ready` connected to platform probes.
- Rollback image/commit and downgrade safety reviewed; destructive schema changes use expand/contract.

## Rollback

Prefer application rollback while leaving backward-compatible expanded schema in place. On Render, redeploy the prior successful commit/image, confirm readiness, pause workers if their schema contract differs, and run smoke tests. Only run `alembic downgrade <revision>` when the migration is explicitly data-safe and a backup exists. Never downgrade a destructive migration blindly.
