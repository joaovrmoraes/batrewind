---
sidebar_position: 1
title: Installation
---

# Installation

BatRewind runs via Docker Compose. No other dependencies required.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with Compose v2+
- A terminal

---

## One-command demo

The fastest way to see BatRewind in action — backend, dashboard, and an interactive playground that generates real sessions:

```bash
git clone https://github.com/joaovrmoraes/batrewind.git
cd batrewind
docker compose -f docker-compose.demo.yml up --build
```

Once all services are healthy (about 30–60 seconds):

| URL | What |
|---|---|
| http://localhost:3012 | **Playground** — interact, trigger an error, click *Report* |
| http://localhost:3010 | **Dashboard** — log in to watch sessions |
| http://localhost:8090 | Writer API (ingest) |
| http://localhost:8081 | Reader API |

**Login:** `admin@batrewind.local` / `admin123`

Open the playground, click around, hit **Report bug**, then find your session in the dashboard and press play.

:::tip
The demo has no seed data — every session you see is one you generated in the playground. This is the quickest way to understand the [buffered "rewind" capture model](/concepts/capture-modes).
:::

---

## Production setup

For a real deployment, use the standard `docker-compose.yml`.

### 1. Clone and configure

```bash
git clone https://github.com/joaovrmoraes/batrewind.git
cd batrewind
cp .env.example .env
```

### 2. Edit `.env`

```bash
# Tell the services they are in production — this enables safety checks
ENVIRONMENT=production

# Required — generate a strong, random secret.
# With ENVIRONMENT=production the services refuse to boot while this is the default.
JWT_SECRET=$(openssl rand -hex 32)

# First admin account (created on first boot)
INITIAL_OWNER_EMAIL=you@yourdomain.com
INITIAL_OWNER_PASSWORD=a-strong-password
INITIAL_OWNER_NAME=Your Name

# Lock the dashboard API to your dashboard's origin
READER_CORS_ORIGINS=https://rewind.yourdomain.com
```

### 3. Start services

```bash
docker compose up -d
```

### 4. Open the dashboard

Navigate to the dashboard (port `3010` by default) and log in with the credentials from your `.env`.

:::warning
Never run in production with the default `JWT_SECRET` (`change-me-in-production`) or the demo password `admin123`. When `ENVIRONMENT=production`, BatRewind **refuses to start** with the default JWT secret. See [Production](/self-hosting/production).
:::

---

## Services and ports

| Service | Host port | Container port | Notes |
|---|---|---|---|
| Writer | `8090` | `8080` | Event ingestion endpoint |
| Reader | `8081` | `8081` | REST API + share links |
| Dashboard | `3010` | `3000` | Replay UI |
| PostgreSQL | — | `5432` | Internal only |
| Redis | — | `6379` | Internal only |

:::tip
In production, put the Writer, Reader, and Dashboard behind a reverse proxy (Nginx, Caddy, Traefik) with TLS, and expose only those.
:::

---

## Next steps

- [Record your first session →](/getting-started/first-session)
- [Configuration reference →](/self-hosting/configuration)
