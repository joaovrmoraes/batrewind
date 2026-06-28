---
sidebar_position: 2
title: Privacy & Masking
---

# Privacy & Masking

Session replay records the DOM, so it can capture sensitive data. BatRewind gives you layered controls and sensible, privacy-first defaults. This page is essential reading before recording real users (LGPD/GDPR).

## Defaults at a glance

| Control | Default | Effect |
|---|---|---|
| `maskInputs` | **on** | All `<input>` values are masked |
| `captureConsole` | **off** | Console output is **not** captured unless you opt in |
| `captureClientMetadata` | **on** | Ambient device metadata is captured (no cookies/storage/typed data); opt out with `false` |
| Share-link redaction | **always on** | Console events, identity **and device metadata** are stripped from public links server-side |

---

## Input masking

By default, all input values are masked (replaced with asterisks) so passwords, emails, and form data never leave the browser in plain text.

```typescript
BatRewind.init({ /* ... */, maskInputs: true }) // default
```

:::warning
`maskInputs` only covers `<input>` values. Text rendered directly into the DOM (e.g. a user's email shown in a header) is **not** an input and will be captured unless you mask it with a selector — see below.
:::

---

## Masking and blocking visible text

To protect PII that is rendered as visible text, use mask/block selectors. These map directly to rrweb's masking options.

```typescript
BatRewind.init({
  // ...
  maskTextSelector: '[data-pii]',  // replace matching text with asterisks
  maskTextClass:    'pii',         // same, by class
  blockSelector:    '.credit-card', // don't record the element at all
  blockClass:       'secret',       // same, by class
  ignoreClass:      'no-track',     // ignore interactions/value changes
})
```

| Option | What it does |
|---|---|
| `maskTextSelector` / `maskTextClass` | Text content is replaced with asterisks but the element is still rendered |
| `blockSelector` / `blockClass` | The element is replaced with a placeholder block — nothing inside is recorded |
| `ignoreClass` | Interactions and value changes on the element are not recorded |

**Recommendation:** annotate sensitive elements in your markup (`data-pii`, `.secret`) and configure the selectors once.

```html
<span data-pii>{{ user.email }}</span>
<div class="credit-card">{{ card.number }}</div>
```

---

## Console capture (opt-in)

Console logs frequently contain PII and secrets, so console capture is **off by default**. Enable it deliberately:

```typescript
// All levels
BatRewind.init({ /* ... */, captureConsole: true })

// Only specific levels
BatRewind.init({ /* ... */, captureConsole: { level: ['warn', 'error'] } })
```

Available levels: `log`, `info`, `warn`, `error`, `debug`.

:::tip
Even when enabled, console output is **always stripped from public share links** — it's only visible to logged-in dashboard users. See [Share links](/concepts/share-links).
:::

---

## Device metadata (on by default)

Each session also records ambient device context — screen resolution, viewport, device pixel ratio, language, timezone, and user agent — so you can tell *what* a user was on when a bug happened. Browser, OS and device type are derived **server-side** from the user agent (never trusted from the client), and every value is clamped/truncated before storage to keep a hostile client from injecting oversized data.

This reads only ambient browser properties — **no cookies, no storage, nothing the user typed**. It's standard first-party debugging data, but it is mildly fingerprint-adjacent, so:

- It's **stripped from public share links** along with identity and console.
- You can turn it off entirely:

```typescript
BatRewind.init({ /* ... */, captureClientMetadata: false })
```

---

## What public share links expose

When you share a session, the public endpoint returns a **redacted** view:

- ❌ Console events (any rrweb plugin data) — stripped server-side
- ❌ User identity (identifier, email, name) — omitted from metadata
- ❌ Device metadata (browser, OS, screen, language, timezone, user agent) — omitted
- ✅ The replay DOM and timeline of actions

Note that text rendered in the page is part of the replay DOM. If a user's email is visible on screen and not masked, it will appear in the replay. Use mask/block selectors to prevent this.

---

## Retention & erasure

Privacy isn't only about capture — it's also about not keeping data forever.

- **Per-session delete** — the dashboard Delete button (and `DELETE /v1/sessions/:id`) permanently removes a session and its events.
- **Automatic purging** — set `RETENTION_DAYS` to delete sessions older than N days. See [Retention](/concepts/retention).

---

## Production checklist

- [ ] Keep `maskInputs` on.
- [ ] Add `maskTextSelector` / `blockSelector` for any visible PII.
- [ ] Leave `captureConsole` off unless you need it; scope it to `['warn', 'error']` if you do.
- [ ] Set `RETENTION_DAYS` to a value that matches your data-retention policy.
- [ ] Lock `READER_CORS_ORIGINS` to your dashboard origin.
