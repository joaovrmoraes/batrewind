---
sidebar_position: 4
title: SQLite
---

# SQLite

SQLite is the default driver — zero setup, a single file, perfect for local development, demos, and small single-node deployments.

## Configuration

```bash
DB_DRIVER=sqlite
SQLITE_PATH=batrewind.db
```

That's all. The database file is created automatically and migrations run on boot.

---

## When to use SQLite

| Good fit | Prefer PostgreSQL instead |
|---|---|
| Local development | Production with real traffic |
| Demos and trials | Autoscaling workers / high write concurrency |
| Small, single-node setups | Large event volumes |

Session replay generates many event rows per session. Under concurrent writes from multiple workers, SQLite's single-writer model becomes a bottleneck — switch to [PostgreSQL](/self-hosting/postgresql) for production.

---

## Persistence

Mount `SQLITE_PATH` on a persistent volume so the database survives container restarts. If the file lives inside the container's ephemeral filesystem, your sessions are lost on redeploy.

```yaml
volumes:
  - ./data:/app/data
environment:
  SQLITE_PATH: /app/data/batrewind.db
```

---

## Backups

Because it's a single file, backing up SQLite is a copy:

```bash
cp batrewind.db batrewind.backup.db
```

Do this while the services are stopped, or use SQLite's online backup to avoid copying mid-write.

---

## Switching to PostgreSQL later

The two drivers use separate migration sets and do not share data. To move from SQLite to PostgreSQL you start fresh on Postgres — there is no built-in data migration between engines. Plan the switch before you accumulate sessions you need to keep.
