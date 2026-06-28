# BatRewind

Self-hosted session replay for the web. Record what your users actually did — replay it frame by frame.

Built with Go + rrweb. No cloud dependency, no vendor lock-in.

<p align="center">
  <img src="./batrewind-demo-en.gif" alt="BatRewind demo — report a bug, then replay the session frame by frame with full device context" width="100%">
</p>

---

## How it works

```
Browser SDK (rrweb events)
        │
        ▼
    Writer :8080  ──→  Redis Stream  ──→  Worker
                                              │
                                              ▼
                                         PostgreSQL / SQLite
                                              │
                                              ▼
                                      Reader :8081  ──→  Dashboard
```

- **Writer** — receives rrweb event batches from the browser SDK (API key auth). Enqueues to Redis Streams (at-least-once delivery).
- **Worker** — consumes from the stream with exponential backoff retry. Autoscales based on queue depth. Permanently failed batches go to `failed_ingest` table for manual retry from the dashboard.
- **Reader** — serves the dashboard and player (JWT auth). Exposes sessions, events, and failed ingest management.

---

## Quick start

```bash
cp .env.example .env
# Edit .env with your JWT_SECRET, INITIAL_OWNER_EMAIL, INITIAL_OWNER_PASSWORD

docker compose up
```

Writer: http://localhost:8080  
Reader: http://localhost:8081

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `DB_DRIVER` | `sqlite` | `postgres` or `sqlite` |
| `SQLITE_PATH` | `batrewind.db` | SQLite file path |
| `DB_HOST` | — | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | — | PostgreSQL user |
| `DB_PASSWORD` | — | PostgreSQL password |
| `DB_NAME` | — | PostgreSQL database name |
| `REDIS_ADDR` | `localhost:6379` | Redis address |
| `JWT_SECRET` | `change-me-in-production` | JWT signing secret |
| `WRITER_PORT` | `8080` | Writer API port |
| `READER_PORT` | `8081` | Reader API port |
| `INITIAL_OWNER_EMAIL` | — | Bootstrap first admin user |
| `INITIAL_OWNER_PASSWORD` | — | Bootstrap first admin password |
| `INITIAL_OWNER_NAME` | `Admin` | Bootstrap first admin name |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |

---

## API

### Writer (port 8080) — requires `X-API-Key`

| Method | Path | Description |
|---|---|---|
| `POST` | `/v1/record` | Ingest a batch of rrweb events |

### Reader (port 8081) — requires `Authorization: Bearer <token>`

| Method | Path | Description |
|---|---|---|
| `POST` | `/v1/auth/login` | Login, returns JWT |
| `POST` | `/v1/auth/api-keys` | Create API key |
| `GET` | `/v1/auth/api-keys` | List API keys |
| `DELETE` | `/v1/auth/api-keys/:id` | Revoke API key |
| `GET` | `/v1/auth/projects` | List projects |
| `GET` | `/v1/sessions` | List sessions |
| `GET` | `/v1/sessions/:id` | Get session metadata |
| `GET` | `/v1/sessions/:id/events` | Get all rrweb events (for player) |
| `POST` | `/v1/sessions/:id/finalize` | Mark session as ended |
| `GET` | `/v1/failed-ingest` | List failed batches |
| `POST` | `/v1/failed-ingest/:id/retry` | Retry a single failed batch |
| `POST` | `/v1/failed-ingest/retry-all` | Retry all unresolved failed batches |
| `GET` | `/health` | Health check |

---

## Browser SDK usage

```ts
import { record } from 'rrweb'

const WRITER_URL = 'http://localhost:8080'
const API_KEY = 'rew_your_key_here'
const SESSION_ID = crypto.randomUUID()

let buffer: unknown[] = []
let seq = 0

function flush() {
  if (!buffer.length) return
  const events = buffer.splice(0)
  navigator.sendBeacon(
    `${WRITER_URL}/v1/record`,
    JSON.stringify({
      session_id: SESSION_ID,
      identifier: 'user@example.com',
      service_name: 'my-app',
      environment: 'production',
      start_url: location.href,
      events: events.map(e => ({ ...e, seq: seq++ })),
    })
  )
}

record({ emit: (event) => buffer.push(event) })

setInterval(flush, 5000)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush()
})
window.addEventListener('beforeunload', flush)
```

---

## Development

```bash
# Run Writer
make writer

# Run Reader
make reader

# Run Worker
make worker

# Build all binaries
make build
```

---

## Tech stack

- Go 1.24, Gin, GORM
- PostgreSQL (production) / SQLite (development)
- Redis Streams (at-least-once delivery, autoscaling workers)
- rrweb (browser recording)

---

## License

MIT
