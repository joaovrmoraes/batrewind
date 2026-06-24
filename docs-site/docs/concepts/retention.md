---
sidebar_position: 4
title: Retention & Deletion
---

# Retention & Deletion

BatRewind lets you control how long replays live, both manually and automatically — important for storage costs and data-protection compliance (LGPD/GDPR).

## Per-session deletion

Delete a single session and all its events permanently:

- **Dashboard:** click **Delete** on the session (with a confirmation).
- **API:** `DELETE /v1/sessions/:id` (JWT-authenticated).

The session row and every associated event row are removed in a single transaction — there is no soft-delete or recovery. This supports right-to-erasure requests.

---

## Automatic retention purge

Set `RETENTION_DAYS` to have the Worker delete sessions older than N days automatically:

```bash
# Delete sessions older than 30 days
RETENTION_DAYS=30
```

| Value | Behavior |
|---|---|
| `0` (default) | **Disabled** — nothing is ever auto-deleted |
| `> 0` | Sessions started before `now − N days` are purged, along with their events |

### How it runs

The purge runs in the Worker:

- Once **at startup**, then on an interval (hourly by default).
- It runs **independently of ingestion**, so a backlog of pending messages never delays or starves it.
- Each run deletes matching sessions and their events in a transaction and logs the count removed.

:::tip
Retention is **off by default** to avoid surprise data loss. Turn it on deliberately, with a value that matches your retention policy. Combine it with [mask/block selectors](/sdk/privacy) and locked-down [CORS](/self-hosting/production) for a privacy-complete setup.
:::

---

## Choosing a retention window

| Use case | Suggested `RETENTION_DAYS` |
|---|---|
| Bug triage / support | `7`–`30` |
| Compliance-sensitive data | as short as your policy allows |
| Long-term analysis | `90`+ (watch storage) |

Remember: in buffered mode only reported/errored sessions are stored in the first place, so retention windows can usually be short.
