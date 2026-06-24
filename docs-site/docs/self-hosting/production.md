---
sidebar_position: 2
title: Production
---

# Production

A checklist and guidance for running BatRewind safely with real users.

## Production checklist

- [ ] Set `ENVIRONMENT=production`.
- [ ] Set a strong, random `JWT_SECRET` (`openssl rand -hex 32`).
- [ ] Change `INITIAL_OWNER_PASSWORD` from any demo value.
- [ ] Lock `READER_CORS_ORIGINS` to your dashboard origin.
- [ ] Use PostgreSQL (not SQLite) — see [PostgreSQL](/self-hosting/postgresql).
- [ ] Put all services behind a reverse proxy with TLS.
- [ ] Decide on `RETENTION_DAYS` and set it.
- [ ] Review [privacy settings](/sdk/privacy) in the SDK (masking, console opt-in).
- [ ] Tune `WRITER_MAX_BODY_BYTES` and the rate limit for your traffic.

---

## The production safety guard

When `ENVIRONMENT=production`, the Writer and Reader **refuse to boot** if `JWT_SECRET` is still the default (`change-me-in-production`):

```
ERROR  JWT_SECRET is the insecure default in production — refusing to start. Set a strong JWT_SECRET.
```

Outside production, this is a warning so local development keeps working. This guard exists to prevent the single most common self-hosting mistake.

---

## CORS

- **Writer** (`WRITER_CORS_ORIGINS`): ingest is authenticated by API key and sends no cookies, so `*` is acceptable — it lets you record from any of your sites. Restrict it if you prefer.
- **Reader** (`READER_CORS_ORIGINS`): this serves the dashboard API. **Set it to your dashboard's exact origin** (e.g. `https://rewind.yourdomain.com`). The Reader logs a warning at startup if it's left as `*`.

---

## Reverse proxy

Expose the Writer, Reader, and Dashboard through a proxy with TLS. Example with Caddy:

```caddyfile
rewind.yourdomain.com {
    handle /v1/record* {
        reverse_proxy writer:8080
    }
    handle /v1/* {
        reverse_proxy reader:8081
    }
    handle /share/* {
        reverse_proxy dashboard:3000
    }
    handle {
        reverse_proxy dashboard:3000
    }
}
```

Point the SDK's `endpoint` and `shareBaseUrl` at this domain, and set `VITE_API_URL` for the dashboard build accordingly.

---

## Deploying with Coolify

BatRewind deploys cleanly on [Coolify](https://coolify.io/) (or any Docker host):

1. Create a new resource from the repository, using `docker-compose.yml`.
2. Set the environment variables from the [configuration reference](/self-hosting/configuration) — at minimum `ENVIRONMENT`, `JWT_SECRET`, the `INITIAL_OWNER_*` values, `READER_CORS_ORIGINS`, and your database settings.
3. Add a persistent volume for PostgreSQL.
4. Set `RETENTION_DAYS` if you want automatic purging.
5. Deploy, then open the dashboard and log in with your owner credentials.

---

## Scaling ingestion

The Worker autoscales between a min and max number of consumers based on Redis queue depth, so ingestion handles bursts without manual tuning. Permanently failed batches are preserved in `failed_ingest` and retryable from the dashboard — nothing is silently lost. See [Architecture](/concepts/architecture).
