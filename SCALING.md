# MediaVault — Scaling Architecture for 10M+ Media Files (Phase 15)

This describes how MediaVault evolves from the single-host Compose stack to a system
that comfortably serves **10 million+ media files** and high concurrent traffic.

## 1. The numbers we design for
- 10M media rows, ~5 derivatives each (images) or ~7 HLS renditions (video) → 50–70M objects
- Assume 70% photos / 30% video. Avg photo derivatives ≈ 2 MB; avg video ≈ 600 MB transcoded
- Storage: ~7M × 2MB (≈14 TB photos) + ~3M × 600MB (≈1.8 PB video). Video dominates → tiering matters
- Read-heavy: browse/search/stream vastly outnumber uploads (≈ 100:1)

## 2. Architectural principles
1. **Stateless app tier** — API and Web hold no local state, so they scale horizontally behind a load balancer.
2. **Bytes never touch the API** — presigned PUT/GET means uploads/downloads go client↔CDN/S3 directly. The API only moves JSON.
3. **Async everything heavy** — transcoding, thumbnailing, AV scan, indexing all run on the queue, scaled independently of request traffic.
4. **Cache the hot set** — the small fraction of trending media serves the majority of reads; push it to CDN + Redis.

## 3. Tier-by-tier scaling

### CDN / edge (most important lever)
- Put CloudFront/Cloudflare in front of the object store. 95%+ of media bytes should be served from edge cache, never origin.
- Long `Cache-Control: public, max-age=31536000, immutable` on derivatives (keys are content-addressed by mediaId, so they never change).
- HLS segments are individually cacheable — ABR streaming scales naturally on a CDN.

### Application tier (API + Web)
- Run behind an L7 load balancer (ALB / Nginx / Traefik). Target 4–20 replicas of each, autoscaled on CPU + p95 latency.
- Next.js: ISR for media-detail/profile/album pages (cache rendered HTML at the edge, revalidate on a TTL). Homepage feeds use ISR + client infinite scroll.
- Session state is in Redis/JWT, so any replica can serve any request.

### Worker tier (the elastic crunch)
- Separate autoscaling group keyed on **queue depth**, not CPU. Scale video workers when `bull:video-processing:wait` grows.
- Split queues by cost: a fleet of cheap image workers (high concurrency) and a fleet of GPU/CPU-heavy video workers (low concurrency, bigger instances).
- Idempotent jobs + `attempts`/backoff already in place → safe to kill/restart workers freely.
- For 4K/large video, shard a single file into segment-parallel transcode jobs and stitch the HLS playlist (fan-out/fan-in).

### PostgreSQL
- **Primary + read replicas.** Route feed/detail/search-fallback reads to replicas; writes to primary.
- Connection pooling via **PgBouncer** (transaction mode) — essential at high replica counts.
- Partition high-churn append tables (`views`, `downloads`, `activity_logs`) **by month** (declarative partitioning). Drop old partitions cheaply.
- Move running counters (`view_count`, `favorite_count`) to Redis and flush to Postgres periodically to avoid hot-row write contention.
- At extreme scale, shard `media`/`media_files` by `owner_id` hash; keep global search in Elasticsearch so cross-shard queries don't hit Postgres.

### Redis
- Run as a cluster (or managed ElastiCache). Separate logical concerns: cache DB, BullMQ broker DB, rate-limit DB. Consider distinct clusters for queue vs cache so a queue backlog can't evict hot cache.

### Elasticsearch
- Multi-node cluster, index sharded (start with 3–5 primary shards, 1 replica). 10M docs is small for ES; the win is offloading all text/faceted search off Postgres.
- Index asynchronously from the worker (already wired via `indexer.ts`). Rebuildable from Postgres → no backup needed.
- Use index aliases for zero-downtime reindex/mapping changes.

### Object storage
- S3 with **lifecycle tiering**: originals → Infrequent Access after 30 days → Glacier after 180 days (derivatives/HLS stay in Standard, served via CDN).
- Enable Transfer Acceleration or multipart for large video uploads.

## 4. Data-flow at scale (upload)
```
client ──presign──▶ API ──▶ Postgres (placeholder row)
client ──PUT bytes────────────────────▶ S3 (direct, no API)
client ──complete──▶ API ──enqueue──▶ Redis/BullMQ
                                  │
                       worker fleet (autoscaled on depth)
                          ├─ ClamAV scan
                          ├─ Sharp (5 sizes)  OR  FFmpeg (HLS ABR)
                          ├─ write media_files/versions/metadata
                          └─ index → Elasticsearch
client ◀──poll status / SSE── API
public reads ◀── CDN ◀── S3 (derivatives, immutable, edge-cached)
```

## 5. Capacity playbook (what to scale when)
| Symptom | Lever |
|---|---|
| High p95 on browse/detail | More Web/API replicas; raise ISR cache TTL; add CDN page cache |
| Slow media delivery | CDN cache-hit ratio; check `Cache-Control`; add edge POPs |
| Upload→ready latency rising | Scale worker fleet on queue depth; split 4K into segment jobs |
| DB CPU high on reads | Add read replicas; route reads off primary; add Redis cache |
| DB write contention on counters | Move counters to Redis, batch-flush |
| `views`/`logs` tables huge | Monthly partitioning + retention drop |
| Search latency | Add ES data nodes; increase shards; tune queries |

## 6. Reliability
- Multi-AZ for DB (primary/replica in different AZs), object store is inherently multi-AZ.
- Workers are stateless and jobs are retried → a lost worker just delays, never loses, processing.
- Graceful degradation: search falls back to Postgres if ES is down (already implemented in `search.service.ts`); AV scan can be toggled; processing failures mark media `failed` for retry, never block the API.

## 7. Cost controls
- Video transcoding is the dominant cost — only generate renditions ≤ source resolution (already enforced), and consider on-demand transcode of rare renditions.
- Storage tiering (above) cuts cold-storage cost by 5–10×.
- CDN offload keeps egress and origin compute low.
