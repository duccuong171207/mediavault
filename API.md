# MediaVault REST API (Phase 10)

Base URL: `/api` (Nginx) or `http://localhost:4000` (direct).
Auth: `Authorization: Bearer <accessToken>`. Refresh token is an httpOnly cookie (`mv_refresh`, path `/auth`).
Errors: `{ statusCode, message, error, path, timestamp }`. Lists are cursor- or page-paginated.

## Auth
| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/auth/login` | public | `{email,password}` | Returns `{accessToken,user}`, sets refresh cookie |
| POST | `/auth/refresh` | cookie | — | Rotating refresh; returns `{accessToken}` |
| POST | `/auth/logout` | cookie | — | Revokes refresh family |

## Users
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/users?page&limit&role&status` | ADMIN | Paginated user list |
| POST | `/users` | perm `user.create` | Create USER (ADMIN role requires SUPER_ADMIN) |
| PATCH | `/users/:id` | perm `user.edit` | Edit user / status |
| DELETE | `/users/:id` | perm `user.delete` | SUPER_ADMIN only; cannot delete self/super |
| GET | `/users/me` | user | Own profile |
| PATCH | `/users/me` | user | Edit own profile |
| GET | `/u/:username` | public | Public profile |

## Media
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/media?type&categoryId&sort&cursor&limit` | public | Cursor feed (`sort`=trending\|latest\|popular) |
| GET | `/media/:id` | public | Full detail (files, versions, metadata, tags) |
| GET | `/media/:id/similar` | public | Same-category suggestions |
| POST | `/media/upload/presign` | perm `media.upload` | `{filename,mime,size}` → `{mediaId,uploadUrl}` |
| POST | `/media/:id/complete` | perm `media.upload` | Finalize + enqueue processing |
| GET | `/media/:id/status` | user | `{status}` (uploading\|processing\|ready\|failed) |
| PATCH | `/media/:id` | owner/admin | Edit title/desc/tags/visibility |
| DELETE | `/media/:id` | owner/admin | Deletes row + storage objects |

## Albums
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/albums?owner` | public | Public albums |
| GET | `/albums/:id` | public | Album + ordered items |
| POST | `/albums` | user | Create |
| PATCH | `/albums/:id` | owner/admin | Rename/visibility |
| DELETE | `/albums/:id` | owner/admin | Delete |
| POST | `/albums/:id/media` | owner/admin | `{mediaIds[]}` append |
| PUT | `/albums/:id/order` | owner/admin | `{order:[mediaId...]}` reorder |
| PUT | `/albums/:id/cover` | owner/admin | `{mediaId}` set cover |

## Search
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/search?q&type&date&resolution&sort&page` | public | Elasticsearch faceted; Postgres fallback |

## Interactions
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/media/:id/view` | optional | Increment view |
| GET | `/media/:id/download` | optional | Returns presigned `{url}` |
| POST | `/media/:id/favorite` | user | Toggle favorite |
| GET | `/media/:id/comments` | public | List comments |
| POST | `/media/:id/comments` | user | `{body,parentId?}` |

## Categories
| Method | Path | Auth |
|---|---|---|
| GET | `/categories` | public |
| POST/PATCH/DELETE | `/categories[/:id]` | perm `category.manage` |

## Admin
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/admin/stats` | perm `analytics.view` | KPI widgets |
| GET | `/admin/analytics?range=daily\|weekly\|monthly\|yearly` | perm `analytics.view` | Time-bucketed series |
| GET | `/admin/activity?limit` | perm `analytics.view` | Activity log |
