---
sidebar_position: 4
title: Public Share API
---

# Public Share API

These endpoints power anonymous, login-free replay viewing. They require **no authentication** and return a **redacted** payload. They're mounted under `/v1/public` on the Reader.

See [Share links](/concepts/share-links) for the concept and [Privacy](/sdk/privacy) for what redaction covers.

## `GET /v1/public/sessions/:token`

Resolves a share token to a redacted session view. The response intentionally omits identity (identifier, email, name, start URL) and the trigger — only enough to render the player.

```json
{
  "id": "78b43c84-...-uuid",
  "service_name": "playground",
  "environment": "demo",
  "started_at": "2026-06-24T12:49:37Z",
  "duration_ms": 52000,
  "event_count": 110
}
```

`404` if the token is unknown.

:::note
`id` is included but harmless — the authenticated route `/app/sessions/:id` is JWT-gated, so knowing the id grants no access.
:::

---

## `GET /v1/public/sessions/:token/events`

Returns the player events for a shared session, with **console (and any plugin) events stripped** server-side. The anonymous viewer never receives console logs or stack traces.

`404` if the token is unknown.

---

## What's redacted

| Data | Public endpoint |
|---|---|
| Replay DOM events | ✅ Included |
| Console / plugin events (rrweb type 6) | ❌ Stripped |
| Identifier / email / name / start URL | ❌ Omitted |
| Trigger | ❌ Omitted |

The redaction is enforced on the server, so sensitive data is never transmitted to an unauthenticated client.
