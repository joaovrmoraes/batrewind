---
sidebar_position: 2
title: Ingest API (Writer)
---

# Ingest API (Writer)

The Writer accepts batches of rrweb events from the SDK. You normally never call this directly — the SDK does — but it's documented here for custom integrations.

Base URL: the Writer (host port `8090` by default).

## `POST /v1/record`

Enqueues a batch of rrweb events for a session. Authenticated with an API key.

### Headers

| Header | Value |
|---|---|
| `X-API-Key` | `rew_...` |
| `Content-Type` | `application/json` |

### Body

```json
{
  "session_id": "0c7f8e2a-...-uuid",
  "identifier": "user@example.com",
  "service_name": "my-app",
  "environment": "production",
  "trigger": "manual",
  "share_token": "0c7f...e7",
  "bat_session_id": "optional-correlation-id",
  "client": {
    "screen_width": 2560,
    "screen_height": 1440,
    "viewport_width": 1280,
    "viewport_height": 720,
    "device_pixel_ratio": 2,
    "language": "en-US",
    "timezone": "America/New_York",
    "user_agent": "Mozilla/5.0 ..."
  },
  "events": [
    { "type": 2, "data": { /* full snapshot */ }, "timestamp": 1719230000000 },
    { "type": 3, "data": { /* incremental */ }, "timestamp": 1719230001000 }
  ]
}
```

| Field | Required | Description |
|---|---|---|
| `session_id` | ✅ | Unique session ID. **Must be a valid UUID** (the SDK uses `crypto.randomUUID`) — a non-UUID value is rejected with `400` |
| `identifier` | ✅ | User identifier (email, ID, name) |
| `service_name` | ✅ | App/service name |
| `events` | ✅ | Non-empty array of rrweb events (`type`, `data`, `timestamp`) |
| `environment` | — | Defaults to `production` |
| `trigger` | — | `manual` \| `error` \| `stream` (defaults to `manual`) |
| `share_token` | — | Client-generated public token, stable per session |
| `bat_session_id` | — | Optional correlation ID for BatAudit |
| `client` | — | Device metadata, sent once on the first batch (see below) |

#### `client` — device metadata

Sent once per session (on the first batch only) when `captureClientMetadata` is enabled in the SDK (the default). All fields are optional and **untrusted**: the server clamps numbers and truncates strings before storage, and derives `browser` / `os` / `device_type` from `user_agent` server-side. Device metadata is **never** exposed on public share links. See [Privacy & Masking](/sdk/privacy).

| Field | Type | Description |
|---|---|---|
| `screen_width` / `screen_height` | number | Physical screen resolution in px |
| `viewport_width` / `viewport_height` | number | Browser viewport in px |
| `device_pixel_ratio` | number | `window.devicePixelRatio` |
| `language` | string | `navigator.language` |
| `timezone` | string | IANA timezone (e.g. `America/Sao_Paulo`) |
| `user_agent` | string | `navigator.userAgent` (browser/OS/device derived server-side) |

### Responses

| Status | Meaning |
|---|---|
| `204 No Content` | Batch accepted and enqueued |
| `400 Bad Request` | Invalid/missing fields |
| `401 Unauthorized` | Missing or invalid API key |
| `413 Payload Too Large` | Body exceeded `WRITER_MAX_BODY_BYTES` |
| `429 Too Many Requests` | Rate limit exceeded for this API key |
| `500` | Failed to enqueue |

### Limits

The Writer protects itself with two configurable guards:

| Guard | Env | Default |
|---|---|---|
| Max body size | `WRITER_MAX_BODY_BYTES` | `5000000` (5 MB) → `413` |
| Rate limit | `WRITER_RATE_LIMIT_RPS` / `WRITER_RATE_LIMIT_BURST` | `20` / `40` → `429` |

The rate limit is a per-API-key token bucket. Set `WRITER_RATE_LIMIT_RPS=0` to disable it.

### Example

```bash
curl -X POST https://rewind.yourdomain.com:8090/v1/record \
  -H "X-API-Key: rew_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "'"$(uuidgen)"'",
    "identifier": "user@example.com",
    "service_name": "my-app",
    "events": [{ "type": 2, "data": {}, "timestamp": 1719230000000 }]
  }'
```
