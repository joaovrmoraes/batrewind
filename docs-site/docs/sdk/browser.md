---
sidebar_position: 1
title: Browser SDK
---

# Browser SDK

`@batrewind/browser` records sessions with rrweb and uploads them to your Writer. It works with any framework (React, Vue, Svelte, vanilla) — it operates on the DOM, not your component tree.

## Installation

```bash
npm install @batrewind/browser
```

ES module:

```typescript
import { BatRewind } from '@batrewind/browser'
```

UMD (global `window.BatRewind`):

```html
<script src="https://unpkg.com/@batrewind/browser/dist/index.umd.js"></script>
```

---

## API

### `init(config)`

Starts recording. Call once, as early as possible. Idempotent — a second call is ignored.

```typescript
BatRewind.init({
  endpoint:    'https://rewind.yourdomain.com',
  apiKey:      'rew_your_key_here',
  serviceName: 'my-app',
})
```

### `identify(identifier)`

Updates who is using the app. Affects all subsequent uploads — call it after login, or whenever the identity becomes known. Fixes the common case where the identifier isn't available at `init()` time.

```typescript
BatRewind.identify('user@example.com')
```

### `report()`

Uploads the current session and returns a shareable replay link. In buffered mode it uploads the rolling buffer (the last minutes — the "rewind"); in always mode it flushes whatever is pending. Safe to call programmatically (e.g. on an error page) — no UI required.

```typescript
const { sessionId, shareToken, shareUrl } = BatRewind.report()
```

Returns:

| Field | Description |
|---|---|
| `sessionId` | The session's unique ID |
| `shareToken` | The public share token (generated client-side) |
| `shareUrl` | Full public replay URL, e.g. `https://dashboard/share/<token>` |

### `stop()`

Stops recording and cleans up all listeners. After `stop()`, `init()` can be called again.

```typescript
BatRewind.stop()
```

---

## Configuration

All fields except `endpoint` and `apiKey` are optional.

### Connection

| Option | Type | Default | Description |
|---|---|---|---|
| `endpoint` | `string` | — | **Required.** Writer URL (e.g. `https://rewind.yourdomain.com`) |
| `apiKey` | `string` | — | **Required.** API key created in the dashboard (`rew_` prefix) |
| `serviceName` | `string` | `'web'` | Identifies this app in the dashboard |
| `environment` | `string` | `'production'` | `production` \| `staging` \| `development` |
| `identifier` | `string` | session ID | User identifier (email, ID, name) — searchable |
| `batSessionId` | `string` | — | Optional external session ID for correlation with BatAudit |
| `shareBaseUrl` | `string` | `endpoint` | Dashboard base URL used to build the link returned by `report()` |

### Capture mode

| Option | Type | Default | Description |
|---|---|---|---|
| `mode` | `'buffered' \| 'always'` | `'buffered'` | See [Capture modes](/concepts/capture-modes) |
| `bufferMs` | `number` | `120000` | [buffered] How many ms of history to keep in the rolling buffer |
| `checkoutEveryNms` | `number` | `30000` | [buffered] How often rrweb takes a fresh full snapshot |
| `captureOnError` | `boolean` | `true` | [buffered] Also upload automatically on uncaught errors / rejections |
| `flushIntervalMs` | `number` | `5000` | [always] Flush batch every N ms |
| `flushMaxBytes` | `number` | `500000` | [always] Flush batch when payload exceeds N bytes |

### Privacy

See [Privacy & masking](/sdk/privacy) for details and recommendations.

| Option | Type | Default | Description |
|---|---|---|---|
| `maskInputs` | `boolean` | `true` | Mask all input values |
| `captureConsole` | `boolean \| { level }` | `false` | **Opt-in.** Capture console output (PII risk) |
| `captureClientMetadata` | `boolean` | `true` | Capture device metadata (screen, viewport, language, timezone, user agent) once per session. Set `false` to opt out |
| `maskTextClass` | `string` | — | Mask text inside elements with this class |
| `maskTextSelector` | `string` | — | Mask text matching this CSS selector |
| `blockClass` | `string` | — | Don't record elements with this class |
| `blockSelector` | `string` | — | Don't record elements matching this CSS selector |
| `ignoreClass` | `string` | — | Ignore input/interactions on elements with this class |

### Widget

| Option | Type | Default | Description |
|---|---|---|---|
| `showWidget` | `boolean` | `true` | Show the floating report widget |
| `widgetPosition` | `'bottom-right' \| 'bottom-left' \| 'top-right' \| 'top-left'` | `'bottom-right'` | Widget position |
| `widgetColor` | `string` | `'#818cf8'` | Widget accent color |
| `widgetLabel` | `string` | `'Report issue'` | Widget button label |

---

## Example: full configuration

```typescript
import { BatRewind } from '@batrewind/browser'

BatRewind.init({
  endpoint:     'https://rewind.yourdomain.com',
  apiKey:       'rew_your_key_here',
  serviceName:  'checkout',
  environment:  'production',
  shareBaseUrl: 'https://rewind.yourdomain.com',

  // Capture
  mode:         'buffered',
  bufferMs:     120_000,
  captureOnError: true,

  // Privacy
  captureConsole: { level: ['warn', 'error'] },
  maskTextSelector: '[data-pii]',
  blockSelector:  '.credit-card',

  // Widget
  widgetLabel:  'Report a problem',
})
```
