# MediaVault

Production-grade media-sharing platform (photos + video) — Flickr/Unsplash/SmugMug/Vimeo/Google Photos hybrid.

## Stack
- **Frontend:** Next.js 15, React, TypeScript, TailwindCSS, shadcn/ui
- **Backend:** NestJS, TypeScript, TypeORM
- **Data:** PostgreSQL, Redis, Elasticsearch
- **Storage:** S3-compatible (MinIO in dev)
- **Processing:** Sharp (images), FFmpeg (video/HLS), ClamAV (AV), BullMQ (queue)
- **Infra:** Docker Compose, Nginx

## Layout
```
mediavault/
  apps/
    api/        NestJS API + workers
    web/        Next.js 15 frontend
  design/       architecture doc + clickable HTML mockups
  deploy/       nginx, init scripts
  docker-compose.yml
```

## Quick start (dev)
```bash
cp .env.example .env
docker compose up -d postgres redis elasticsearch minio clamav
# backend
cd apps/api && npm install && npm run migration:run && npm run seed && npm run start:dev
# worker (separate terminal)
cd apps/api && npm run start:worker
# frontend
cd apps/web && npm install && npm run dev
```
Web: http://localhost:3000 · API: http://localhost:4000 · MinIO console: http://localhost:9001

## Full stack via Docker
```bash
cp .env.example .env
docker compose up -d --build
```
Then visit http://localhost (Nginx fronts web + api).

## Default accounts (from seed)
| Role | Email | Password |
|---|---|---|
| Super Admin | super@mediavault.local | ChangeMe!123 |
| Admin | admin@mediavault.local | ChangeMe!123 |
| User | user@mediavault.local | ChangeMe!123 |

> Public registration is disabled by design. Admins create accounts.

See `design/ARCHITECTURE.md` for phases 1–10 and `design/preview/index.html` for the clickable UI.
See `DEPLOYMENT.md` and `SCALING.md` for production.
