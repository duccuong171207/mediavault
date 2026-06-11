# MediaVault — Architecture & Design Document

> Phases 1–10. Phases 11–15 (full source) are generated after UI approval.

---

## PHASE 1 — Business Analysis

**Vision.** A production media-sharing platform blending Flickr (community + organization), Unsplash (clean discovery), SmugMug (pro presentation/albums), Vimeo (quality video streaming), and Google Photos (effortless management).

**Closed-registration model.** No public signup. Admins provision all accounts. Visitors browse public content without auth. This makes it a *curated* platform — closer to an agency/portfolio product than a social network.

### Actors & permissions matrix

| Capability | Visitor | User | Admin | Super Admin |
|---|:--:|:--:|:--:|:--:|
| Browse / search public media | ✅ | ✅ | ✅ | ✅ |
| View public albums | ✅ | ✅ | ✅ | ✅ |
| Login | ❌ | ✅ | ✅ | ✅ |
| Upload photos/videos | ❌ | ✅ | ✅ | ✅ |
| Manage own media/albums | ❌ | ✅ | ✅ | ✅ |
| Edit own profile | ❌ | ✅ | ✅ | ✅ |
| Create/edit users | ❌ | ❌ | ✅ | ✅ |
| Delete any media | ❌ | ❌ | ✅ | ✅ |
| Manage categories | ❌ | ❌ | ✅ | ✅ |
| Create admins | ❌ | ❌ | ❌ | ✅ |
| Delete users | ❌ | ❌ | ❌ | ✅ |
| System settings | ❌ | ❌ | ❌ | ✅ |
| Analytics dashboard | ❌ | ❌ | ✅ | ✅ |

### Core non-functional requirements
- **Performance:** LCP < 2.5s, masonry grid renders progressively, CDN-served derivatives, adaptive video.
- **Scale target:** 10M media files (Phase 15).
- **Availability:** stateless API horizontally scalable; storage + DB are the stateful tier.
- **Security:** JWT + refresh rotation, RBAC, upload validation, AV scanning, rate limiting.

### Key user journeys
1. Visitor → discover via homepage masonry → media detail → similar media → author profile.
2. User → Upload Studio → drag files → auto EXIF/transcode → tag/categorize → publish → organize into album.
3. Admin → dashboard → create user → moderate media → manage categories.

---

## PHASE 2 — System Architecture

```
                              ┌─────────────┐
                       HTTPS  │   Nginx /   │   TLS, gzip/brotli, rate-limit
                  ────────────▶  CDN edge   │   static + reverse proxy
                              └──────┬──────┘
                    ┌────────────────┼────────────────┐
                    ▼                ▼                 ▼
            ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
            │  Next.js 15  │  │  NestJS API  │  │  Media CDN    │
            │  (SSR/ISR)   │  │  (REST)      │  │  (S3/MinIO)   │
            └──────────────┘  └──────┬───────┘  └──────────────┘
                                     │
        ┌──────────────┬─────────────┼──────────────┬───────────────┐
        ▼              ▼             ▼              ▼               ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌──────────┐
  │PostgreSQL│  │  Redis   │  │ Elastic  │  │  BullMQ      │  │  MinIO   │
  │ primary  │  │ cache +  │  │ search   │  │  workers     │  │  / S3    │
  │ +replicas│  │ sessions │  │          │  │ (img/video) │  │  storage │
  └──────────┘  └──────────┘  └──────────┘  └──────┬───────┘  └──────────┘
                                                    │
                                          ┌─────────┴─────────┐
                                          ▼                   ▼
                                    ┌──────────┐       ┌──────────────┐
                                    │  Sharp   │       │   FFmpeg     │
                                    │ (images) │       │ (transcode/  │
                                    │          │       │   HLS/ABR)   │
                                    └──────────┘       └──────────────┘
                                          │  ClamAV (virus scan)
```

**Async pipeline (the heart of the platform).** Upload is a two-phase flow: (1) client requests a **presigned URL**, uploads bytes directly to S3/MinIO (API never proxies large files); (2) client notifies API, which enqueues a **BullMQ** job. Workers pull the original, run Sharp (5 image sizes) or FFmpeg (6 video renditions + HLS + thumbnails), ClamAV scan, EXIF extraction, then write `media_files`/`media_versions` rows and index into Elasticsearch. Status streams back via polling/SSE (visible in the Upload Studio queue mockup).

**Service responsibilities**
- **Next.js**: SSR for SEO pages (home, detail, profile, album), ISR for popular media, client components for grid/player/upload.
- **NestJS**: auth, RBAC guards, media CRUD, presign, album, search proxy, admin, analytics; emits jobs.
- **Workers**: separate process (`worker` container) consuming BullMQ — CPU-heavy, scaled independently.
- **Redis**: response cache, session/refresh-token store, rate-limit counters, BullMQ broker.
- **Elasticsearch**: full-text + faceted search.

---

## PHASE 6 / 7 — Database ERD & Schema (PostgreSQL)

```
roles ──< role_permissions >── permissions
  │
  └──< user_roles >── users ──< media ──< media_files
                       │  │       │   │
                       │  │       │   └──< media_versions  (video renditions / image sizes)
                       │  │       ├──── media_metadata (1:1 EXIF/tech)
                       │  │       ├──< media_tags >── tags
                       │  │       ├──< views / downloads / favorites / comments
                       │  │       └──> categories
                       │  └──< albums ──< album_media >── media
                       └──< activity_logs / notifications
system_settings (singleton kv)
```

```sql
-- enums
CREATE TYPE user_status   AS ENUM ('active','suspended','pending');
CREATE TYPE media_type    AS ENUM ('photo','video');
CREATE TYPE media_status  AS ENUM ('uploading','processing','ready','failed');
CREATE TYPE visibility    AS ENUM ('public','unlisted','private');
CREATE TYPE album_type    AS ENUM ('photo','video','mixed');

CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,             -- SUPER_ADMIN | ADMIN | USER
  description TEXT
);

CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL                -- e.g. media.delete.any, user.create
);

CREATE TABLE role_permissions (
  role_id INT REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT UNIQUE NOT NULL,
  username CITEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  social_links JSONB DEFAULT '{}',
  status user_status DEFAULT 'active',
  created_by UUID REFERENCES users(id),   -- which admin provisioned
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id INT  REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  parent_id INT REFERENCES categories(id),
  cover_media_id UUID
);

CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type media_type NOT NULL,
  status media_status DEFAULT 'uploading',
  visibility visibility DEFAULT 'public',
  title TEXT,
  description TEXT,
  category_id INT REFERENCES categories(id),
  width INT, height INT, duration_sec NUMERIC,
  storage_key TEXT NOT NULL,              -- original object key
  blurhash TEXT,
  view_count BIGINT DEFAULT 0,
  favorite_count BIGINT DEFAULT 0,
  download_count BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ
);
CREATE INDEX ON media (owner_id);
CREATE INDEX ON media (visibility, status, published_at DESC);
CREATE INDEX ON media (category_id);

CREATE TABLE media_files (          -- derivatives: thumbnail/small/medium/large/original
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  variant TEXT NOT NULL,            -- thumbnail|small|medium|large|original
  storage_key TEXT NOT NULL,
  width INT, height INT,
  bytes BIGINT, mime TEXT
);
CREATE INDEX ON media_files (media_id);

CREATE TABLE media_versions (       -- video renditions + HLS playlists
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  rendition TEXT NOT NULL,          -- 360p..2160p | hls_master
  storage_key TEXT NOT NULL,
  bitrate_kbps INT, codec TEXT, bytes BIGINT
);

CREATE TABLE media_metadata (       -- 1:1 EXIF / technical
  media_id UUID PRIMARY KEY REFERENCES media(id) ON DELETE CASCADE,
  camera TEXT, lens TEXT, iso INT, aperture TEXT, shutter TEXT,
  focal_length TEXT, gps_lat NUMERIC, gps_lng NUMERIC,
  taken_at TIMESTAMPTZ, frame_rate NUMERIC, audio_codec TEXT, raw JSONB
);

CREATE TABLE albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type album_type DEFAULT 'mixed',
  visibility visibility DEFAULT 'public',
  cover_media_id UUID REFERENCES media(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE album_media (
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
  media_id UUID REFERENCES media(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  PRIMARY KEY (album_id, media_id)
);

CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name CITEXT UNIQUE NOT NULL,
  usage_count BIGINT DEFAULT 0
);
CREATE TABLE media_tags (
  media_id UUID REFERENCES media(id) ON DELETE CASCADE,
  tag_id INT REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (media_id, tag_id)
);

CREATE TABLE views (
  id BIGSERIAL PRIMARY KEY,
  media_id UUID REFERENCES media(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  ip_hash TEXT, viewed_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE downloads (LIKE views INCLUDING ALL);

CREATE TABLE favorites (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  media_id UUID REFERENCES media(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, media_id)
);

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID REFERENCES media(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE activity_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID REFERENCES users(id),
  action TEXT NOT NULL, entity TEXT, entity_id TEXT,
  meta JSONB, created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT, payload JSONB, read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE system_settings (
  key TEXT PRIMARY KEY, value JSONB, updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## PHASE 8 — Backend Architecture (NestJS)

```
apps/api/src/
  main.ts
  app.module.ts
  common/        guards (JwtAuthGuard, RolesGuard, PermissionsGuard)
                 decorators (@Roles, @Permissions, @CurrentUser)
                 interceptors (logging, transform), filters (http-exception)
                 pipes (zod validation)
  config/        env schema (zod), typeorm, redis, s3, elastic
  modules/
    auth/        login, refresh-rotation, logout; bcrypt; JWT access(15m)+refresh(7d)
    users/       admin CRUD, profile; enforces "created_by admin" rule
    roles/       RBAC seed + assignment
    media/       CRUD, presign-upload, publish, similar
    upload/      presigned URLs, completion webhook → enqueue
    processing/  BullMQ producers + worker processors (image/video)
    albums/      CRUD, reorder, set-cover
    search/      Elastic query builder, faceting, indexer
    categories/  admin-managed taxonomy
    interactions/ views, downloads, favorites, comments
    admin/       dashboard aggregates, analytics
    notifications/
    settings/
  workers/       standalone bootstrap for processing (separate container)
```

**Auth flow:** `POST /auth/login` → access JWT (15 min, in memory) + refresh JWT (7 day, httpOnly secure cookie, stored hashed in Redis). `POST /auth/refresh` rotates the refresh token (detects reuse → revoke family). Guards: `JwtAuthGuard` → `RolesGuard`/`PermissionsGuard` via `@Permissions('media.delete.any')`.

**Security layers:** Helmet headers, CORS allowlist, CSRF double-submit for cookie auth, class-validator/zod DTO validation (SQLi-safe via TypeORM parameterization), per-route rate limiting (`@nestjs/throttler` backed by Redis), file magic-byte validation + ClamAV in worker, signed CDN URLs for private media.

---

## PHASE 9 — Frontend Architecture (Next.js 15 App Router)

```
apps/web/src/
  app/
    (public)/
      page.tsx                 # homepage (SSR + ISR)
      explore/page.tsx
      m/[id]/page.tsx          # media detail (SSR, SEO)
      v/[id]/page.tsx          # video player page
      u/[username]/page.tsx    # profile
      a/[id]/page.tsx          # album
      search/page.tsx          # facets via Elastic
    (auth)/login/page.tsx
    (app)/
      studio/page.tsx          # upload studio (protected)
      settings/page.tsx
    admin/
      layout.tsx               # role-gated
      page.tsx                 # dashboard
      users / media / categories / analytics / settings
  components/
    ui/                        # shadcn primitives
    media/ MasonryGrid, MediaCard, MediaLightbox, VideoPlayer(hls.js)
    upload/ Dropzone, UploadQueue, MetadataForm
    layout/ Navbar, Footer, ThemeToggle
  lib/  api client (typed), auth, hls, query (TanStack Query)
  hooks/ useInfiniteMedia, useUpload, useTheme
```

**Key decisions:** Server Components for data-heavy SEO pages, Client Components for grid/player/upload. TanStack Query for infinite scroll + optimistic favorites. `hls.js` for adaptive video (native HLS on Safari). next/image with blurhash placeholders. Theme via `class` strategy + system preference.

---

## PHASE 10 — REST API (summary)

```
Auth
  POST   /auth/login            {email,password} → {accessToken,user}; sets refresh cookie
  POST   /auth/refresh          → rotated tokens
  POST   /auth/logout

Users (admin)
  GET    /users                 ?page&role&status   [admin]
  POST   /users                 create (admin only; super-admin for ADMIN role)
  PATCH  /users/:id             [admin]
  DELETE /users/:id             [super-admin]
  GET    /users/me              profile
  PATCH  /users/me              edit own profile
  GET    /u/:username           public profile + media

Media
  GET    /media                 ?type&category&sort&cursor   public feed
  GET    /media/:id             detail (+metadata, files, versions, tags)
  GET    /media/:id/similar
  POST   /media/upload/presign  {filename,mime,size} → {url,key,mediaId}   [user]
  POST   /media/:id/complete    finalize → enqueue processing               [user]
  GET    /media/:id/status      processing status
  PATCH  /media/:id             edit (owner|admin)
  DELETE /media/:id             owner | admin (any)

Albums
  GET/POST/PATCH/DELETE /albums[/:id]
  PUT    /albums/:id/order      reorder positions
  PUT    /albums/:id/cover

Search
  GET    /search                ?q&type&date&resolution&sort&page   (Elastic, faceted)

Interactions
  POST/DELETE /media/:id/favorite
  POST   /media/:id/view
  GET    /media/:id/download    (signed URL, increments)
  GET/POST /media/:id/comments

Categories (admin)  GET/POST/PATCH/DELETE /categories[/:id]

Admin
  GET    /admin/stats           KPI widgets
  GET    /admin/analytics       ?range=daily|weekly|monthly|yearly
  GET    /admin/activity
  GET/PATCH /admin/settings
```

All list endpoints are cursor-paginated. Errors follow `{statusCode,message,error}` with a global exception filter.
