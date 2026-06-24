---
sidebar_position: 1
title: Architecture
---

# Architecture

BatRewind is built from three small Go binaries plus a React dashboard, with Redis Streams between ingestion and persistence.

```
Browser SDK (rrweb events)
        │  POST /v1/record  (API key)
        ▼
    Writer :8090  ──→  Redis Stream  ──→  Worker  ──→  PostgreSQL / SQLite
                                              │                  ▲
                                       failed_ingest             │
                                                                 │
                                      Reader :8081  ─────────────┘
                                              │  (JWT + public share)
                                              ▼
                                      Dashboard :3010
```

---

## Writer

The Writer is the ingestion endpoint. It:

- Authenticates the SDK with an **API key** (`X-API-Key` header).
- Enforces a **body size limit** (`WRITER_MAX_BODY_BYTES`) and a per-API-key **rate limit** (`WRITER_RATE_LIMIT_RPS` / `_BURST`).
- Enqueues each batch to a **Redis Stream** for at-least-once delivery, then returns `204` immediately.

The Writer never touches the database directly — it stays fast and thin.

---

## Worker

The Worker consumes the Redis Stream and persists sessions and events. It:

- Upserts the session and inserts events in batches of 100.
- Retries failed batches with **exponential backoff** (0s → 2s → 8s → 32s).
- Moves permanently failed batches to the **`failed_ingest`** table, retryable from the dashboard.
- **Autoscales** between a min and max worker count based on queue depth.
- Runs the **retention purge** loop when `RETENTION_DAYS > 0` (see [Retention](/concepts/retention)).

---

## Reader

The Reader serves the dashboard's REST API (JWT-authenticated) and the public share endpoints (unauthenticated, redacted). It exposes:

- Session list, detail, events, stats
- Share-link creation and per-session delete
- Failed-ingest listing and retry
- Public, redacted session + events by share token

---

## Storage model

Replays are stored as rrweb events in the database — **not** as video and **not** on the filesystem.

| Table | Holds |
|---|---|
| `replay_sessions` | One row per session (id is a UUID, identifier, service, environment, timing, share token) |
| `replay_events` | Many rows per session (`seq`, `type`, `data` JSONB, `timestamp`) |
| `failed_ingest` | Batches that exhausted retries, with the raw payload for retry |

The player reconstructs the DOM from these events. One session = N event rows.

:::note
Object storage (S3/MinIO) is **not** used. It's on the roadmap for a future cloud tier, where event blobs would move to S3 with only metadata and a pointer kept in Postgres.
:::

---

## Why Redis Streams

Streams (not List/BLPOP) give at-least-once delivery and consumer groups, so a crashed worker's in-flight messages are reclaimed and reprocessed rather than lost. Combined with the `failed_ingest` table, no batch is silently dropped.
