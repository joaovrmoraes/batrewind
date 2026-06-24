---
sidebar_position: 3
title: Share Links
---

# Share Links

A share link is a public, login-free URL to watch a single session's replay — safe to paste into a bug tracker or send to a teammate. The shared view is **redacted** so sensitive data never leaks.

## How a link is created

There are two ways:

### From the SDK (`report()`)

The share token is generated **client-side**, so `report()` can return the full link without a server round-trip:

```typescript
const { shareUrl } = BatRewind.report()
// e.g. https://rewind.yourdomain.com/share/0c7f...e7
```

The token is sent with the upload and persisted with the session.

### From the dashboard

Click **Share replay** on a session. This calls `POST /v1/sessions/:id/share`, which returns a stable token (idempotent — repeated calls return the same token).

---

## What the public view shows

The route `/share/:token` renders **only the player** — no dashboard chrome, no login. Behind it, the Reader serves a redacted payload:

| Data | In the public view? |
|---|---|
| Replay DOM (clicks, navigation, mutations) | ✅ Yes |
| Action timeline | ✅ Yes |
| Console output | ❌ Stripped server-side |
| User identity (identifier, email, name) | ❌ Omitted from metadata |

The redaction happens on the server (`GET /v1/public/sessions/:token` and `/events`), not in the client — so the sensitive data is never sent over the wire to an anonymous viewer.

:::warning
Redaction covers console events and session metadata. It does **not** retroactively mask PII that was rendered as visible text in the page during recording — that text is part of the replay DOM. Use [mask/block selectors](/sdk/privacy) at capture time to keep visible PII out of the replay entirely.
:::

---

## Logged-in vs anonymous

The same session looks different depending on who's viewing:

- **Anonymous** (`/share/:token`) — player only, redacted, with a notice that sensitive data is hidden.
- **Logged in** — full session detail: identity, console panel, delete, and an "Open debug view" shortcut.
