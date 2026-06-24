---
sidebar_position: 1
title: Configuration
---

# Configuration

All configuration is via environment variables. Copy `.env.example` to `.env` and edit.

## Environment variables reference

### Database

| Variable | Default | Description |
|---|---|---|
| `DB_DRIVER` | `sqlite` | `postgres` or `sqlite` |
| `SQLITE_PATH` | `batrewind.db` | SQLite file path (when `DB_DRIVER=sqlite`) |
| `DB_HOST` | — | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | — | PostgreSQL user |
| `DB_PASSWORD` | — | PostgreSQL password |
| `DB_NAME` | — | PostgreSQL database name |
| `REDIS_ADDR` | `localhost:6379` | Redis address |

### Server

| Variable | Default | Description |
|---|---|---|
| `WRITER_PORT` | `8080` | Writer container port |
| `READER_PORT` | `8081` | Reader container port |
| `LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` |
| `ENVIRONMENT` | `development` | Set to `production` to enable safety checks |

### Auth & bootstrap

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | `change-me-in-production` | JWT signing secret. **Must change for production** |
| `INITIAL_OWNER_EMAIL` | — | First admin email (created on first boot) |
| `INITIAL_OWNER_PASSWORD` | — | First admin password |
| `INITIAL_OWNER_NAME` | `Admin` | First admin display name |
| `INITIAL_API_KEY` | — | Ensure an SDK API key exists on boot (`rew_` prefix) |

### CORS

| Variable | Default | Description |
|---|---|---|
| `WRITER_CORS_ORIGINS` | `*` | Comma-separated allowed origins for ingest. `*` is acceptable (API-key auth, no cookies) |
| `READER_CORS_ORIGINS` | `*` | Comma-separated allowed origins for the dashboard API. **Lock to your dashboard URL in production** |

### Ingest hardening (Writer)

| Variable | Default | Description |
|---|---|---|
| `WRITER_MAX_BODY_BYTES` | `5000000` | Reject `/record` bodies larger than this (bytes) → `413` |
| `WRITER_RATE_LIMIT_RPS` | `20` | Per-API-key request rate. `0` disables limiting |
| `WRITER_RATE_LIMIT_BURST` | `40` | Per-API-key burst ceiling |

### Retention (Worker)

| Variable | Default | Description |
|---|---|---|
| `RETENTION_DAYS` | `0` | Delete sessions older than N days. `0` disables purging |

### Dashboard (build-time)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8081` | Reader URL the dashboard calls |

---

## Example `.env` (production)

```bash
ENVIRONMENT=production

DB_DRIVER=postgres
DB_HOST=postgres
DB_PORT=5432
DB_USER=batrewind
DB_PASSWORD=a-strong-db-password
DB_NAME=batrewind
REDIS_ADDR=redis:6379

JWT_SECRET=replace-with-openssl-rand-hex-32
INITIAL_OWNER_EMAIL=you@yourdomain.com
INITIAL_OWNER_PASSWORD=a-strong-password
INITIAL_OWNER_NAME=Your Name
INITIAL_API_KEY=rew_your_production_key

READER_CORS_ORIGINS=https://rewind.yourdomain.com
WRITER_CORS_ORIGINS=*

WRITER_MAX_BODY_BYTES=5000000
WRITER_RATE_LIMIT_RPS=20
WRITER_RATE_LIMIT_BURST=40

RETENTION_DAYS=30
```

See [Production](/self-hosting/production) for the full hardening checklist.
