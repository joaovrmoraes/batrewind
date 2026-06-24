---
sidebar_position: 3
title: PostgreSQL
---

# PostgreSQL

PostgreSQL is the recommended database for production. It handles concurrent writes from autoscaling workers and large event volumes far better than SQLite.

## Configuration

```bash
DB_DRIVER=postgres
DB_HOST=postgres
DB_PORT=5432
DB_USER=batrewind
DB_PASSWORD=a-strong-db-password
DB_NAME=batrewind
```

In the bundled `docker-compose.yml`, a `postgres:16-alpine` service is included and wired up for you. For an external/managed database, point `DB_HOST` at it and remove the bundled service.

---

## Migrations

Schema migrations are applied automatically on boot. PostgreSQL and SQLite have separate migration sets, so switching drivers starts from a clean schema for that engine.

---

## Schema overview

| Table | Purpose |
|---|---|
| `replay_sessions` | One row per session. `id` is a **UUID** |
| `replay_events` | rrweb events (`seq`, `type`, `data` JSONB, `timestamp`) |
| `failed_ingest` | Batches that exhausted retries, with raw payload |

:::note
Because `replay_sessions.id` is a UUID column, session IDs sent by the SDK must be valid UUIDs. The browser SDK uses `crypto.randomUUID()`, so this is automatic — but custom integrations posting to `/v1/record` must send a UUID for `session_id`.
:::

---

## Backups

Back up the PostgreSQL volume like any other database:

```bash
docker compose exec postgres pg_dump -U batrewind batrewind > backup.sql
```

Restore:

```bash
cat backup.sql | docker compose exec -T postgres psql -U batrewind batrewind
```

---

## Persistence

Ensure the PostgreSQL data directory is on a persistent volume (the bundled compose file already defines one). On platforms like Coolify, add a persistent volume for `/var/lib/postgresql/data`.
