# MediaVault — Production Deployment Guide (Phase 14)

## 1. Prerequisites
- Linux host (Ubuntu 22.04+), Docker Engine 24+, Docker Compose v2
- A domain with DNS A-record pointing at the host
- For production object storage: AWS S3 bucket + IAM keys (or self-hosted MinIO cluster)

## 2. Environment
```bash
cp .env.example .env
```
Edit `.env` and set **strong** values:
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — 64-char random strings (`openssl rand -hex 32`)
- `POSTGRES_PASSWORD`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`
- `COOKIE_DOMAIN=yourdomain.com`, `NODE_ENV=production`
- `S3_PUBLIC_URL` → your CDN domain in front of the bucket
- `CLAMAV_ENABLED=true`

## 3. First boot
```bash
docker compose up -d --build
# wait for healthchecks, then run migrations + seed once:
docker compose exec api node dist/database/seed.js   # or: npm run seed in a one-off
```
The `minio-init` service creates the bucket and sets public-read on derivatives automatically.

## 4. TLS
Terminate TLS at Nginx (or a managed LB). Add a certbot sidecar or mount certs:
```nginx
listen 443 ssl http2;
ssl_certificate     /etc/letsencrypt/live/yourdomain/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain/privkey.pem;
```
Redirect :80 → :443. Set `secure: true` cookies (already keyed off `NODE_ENV=production`).

## 5. Production hardening checklist
- [ ] Rotate all default seed passwords immediately after first login
- [ ] Restrict Postgres/Redis/Elastic/MinIO ports to the internal Docker network only (remove host `ports:` mappings in prod compose override)
- [ ] Put media bucket behind a CDN (CloudFront / Cloudflare) using `S3_PUBLIC_URL`
- [ ] Set `WEB_ORIGIN` to the real origin for CORS
- [ ] Configure log shipping (`docker compose logs` → Loki/CloudWatch)
- [ ] Enable Postgres automated backups (pg_dump cron or managed RDS)
- [ ] Set resource limits per service (`deploy.resources.limits`)
- [ ] Scale workers: `docker compose up -d --scale worker=4`

## 6. Health & observability
- API readiness: `GET /api/categories` (public, cheap)
- Queue depth: inspect BullMQ via Redis (`LLEN bull:video-processing:wait`)
- Add `/metrics` (Prometheus) by mounting `@willsoto/nestjs-prometheus` if desired

## 7. Zero-downtime deploys
```bash
docker compose build api web worker
docker compose up -d --no-deps --build api      # rolling
docker compose up -d --no-deps --build web
docker compose up -d --no-deps --scale worker=4 worker
```
Migrations are backward-compatible (expand/contract): deploy schema additions before code that requires them.

## 8. Backups & DR
- **Postgres:** nightly `pg_dump` + WAL archiving (or managed PITR)
- **Object storage:** enable bucket versioning + cross-region replication
- **Elasticsearch:** index is rebuildable from Postgres — run a reindex job rather than backing it up
- **Redis:** AOF enabled; refresh tokens regenerate on next login, so loss is non-fatal
