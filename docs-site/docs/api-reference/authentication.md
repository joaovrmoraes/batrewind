---
sidebar_position: 1
title: Authentication
---

# Authentication

BatRewind uses two separate auth mechanisms, one per service.

## API keys (Writer)

The browser SDK authenticates against the **Writer** with an API key, sent in the `X-API-Key` header. Keys are prefixed with `rew_`.

```http
POST /v1/record HTTP/1.1
Host: rewind.yourdomain.com:8090
X-API-Key: rew_your_key_here
Content-Type: application/json
```

A request without a valid key is rejected with `401`.

### Creating keys

- **Bootstrap:** set `INITIAL_API_KEY` in the environment to ensure a key exists on first boot.
- The demo stack ships with `rew_playground_demo`.

---

## JWT (Reader / Dashboard)

The **Reader** API (everything the dashboard uses) is protected by JWT. Tokens are obtained by logging in and sent in the `Authorization: Bearer` header.

### Log in

```http
POST /v1/auth/login HTTP/1.1
Host: rewind.yourdomain.com:8081
Content-Type: application/json

{ "email": "you@yourdomain.com", "password": "your-password" }
```

Response:

```json
{ "token": "<jwt>" }
```

### Authenticated requests

```http
GET /v1/sessions HTTP/1.1
Host: rewind.yourdomain.com:8081
Authorization: Bearer <jwt>
```

The first user is created on boot via `INITIAL_OWNER_EMAIL` / `INITIAL_OWNER_PASSWORD`.

:::warning
JWTs are signed with `JWT_SECRET`. Use a strong, random value. When `ENVIRONMENT=production`, the services refuse to start with the default secret. See [Production](/self-hosting/production).
:::

---

## Public share endpoints (no auth)

The public share routes under `/v1/public/*` require **no** authentication — they're how anonymous viewers watch a shared replay. They return a redacted payload only. See [Public Share API](/api-reference/public-share).
