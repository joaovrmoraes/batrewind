---
sidebar_position: 3
title: Sessions API (Reader)
---

# Sessions API (Reader)

The Reader exposes the session data the dashboard uses. All routes below require a JWT (`Authorization: Bearer <token>`).

Base URL: the Reader (host port `8081` by default).

## `GET /v1/stats`

Returns dashboard metrics: total / today / this-week session counts, failed-ingest count, active services, and recent sessions.

---

## `GET /v1/sessions`

Lists sessions with filtering and pagination.

| Query param | Description |
|---|---|
| `identifier` | Filter by exact identifier |
| `service_name` | Filter by service |
| `environment` | Filter by environment |
| `start_date` / `end_date` | RFC3339 range on `started_at` |
| `limit` | Page size (default 50, max 100) |
| `offset` | Pagination offset |

Response:

```json
{
  "data": [ { "id": "...", "identifier": "...", "service_name": "...", "event_count": 111, "...": "..." } ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

---

## `GET /v1/sessions/:id`

Returns a single session's metadata. `404` if not found.

---

## `GET /v1/sessions/:id/events`

Returns the full ordered list of rrweb events for a session — what the player consumes.

---

## `DELETE /v1/sessions/:id`

Permanently deletes a session and all its events in one transaction. Returns `204`. Irreversible — supports data-erasure requests. See [Retention](/concepts/retention).

---

## `POST /v1/sessions/:id/share`

Creates (or returns the existing) public share token for a session. Idempotent.

```json
{ "token": "0c7f...e7" }
```

The public replay link is then `https://<dashboard>/share/<token>`. See [Share links](/concepts/share-links).

---

## Failed ingest

Batches that exhausted retries are stored and can be re-driven.

| Route | Description |
|---|---|
| `GET /v1/failed-ingest` | List failed batches (`?resolved=true` to include resolved) |
| `POST /v1/failed-ingest/:id/retry` | Retry a single batch |
| `POST /v1/failed-ingest/retry-all` | Retry all unresolved batches; returns `{ "retried": N }` |
