---
sidebar_position: 2
title: Your First Session
---

# Your First Session

This guide adds the BatRewind SDK to a web app and records a real session.

## 1. Create an API key

API keys authenticate the browser SDK against the Writer. A demo key (`rew_playground_demo`) ships with the demo stack; for your own app, create one with the `INITIAL_API_KEY` environment variable or from the dashboard.

```bash
# In your .env
INITIAL_API_KEY=rew_your_key_here
```

API keys are prefixed with `rew_`.

---

## 2. Install the SDK

```bash
npm install @batrewind/browser
```

Or load the UMD build directly from a `<script>` tag — `window.BatRewind` becomes available globally.

```html
<script src="https://unpkg.com/@batrewind/browser/dist/index.umd.js"></script>
```

---

## 3. Initialize it

Call `init()` once, as early as possible in your app:

```typescript
import { BatRewind } from '@batrewind/browser'

BatRewind.init({
  endpoint:     'https://rewind.yourdomain.com', // your Writer URL
  apiKey:       'rew_your_key_here',
  serviceName:  'my-app',
  environment:  'production',
  shareBaseUrl: 'https://rewind.yourdomain.com', // dashboard URL for share links
})
```

That's it — BatRewind is now recording. By default it runs in [**buffered** mode](/concepts/capture-modes): it keeps a rolling buffer of the last 2 minutes in memory and only uploads when you call `report()` or an uncaught error fires.

---

## 4. Identify the user

Once you know who the user is (e.g. after login), call `identify()` so the session is searchable:

```typescript
BatRewind.identify('user@example.com')
```

---

## 5. Report a session

When the user hits a bug — or from your own "Report a problem" button — call `report()`:

```typescript
const { shareUrl } = BatRewind.report()
console.log('Replay link:', shareUrl)
```

`report()` uploads the rolling buffer (the "rewind" of the last minutes) and returns a **shareable link immediately** — the share token is generated client-side, so there's no server round-trip. Drop `shareUrl` straight into a bug-report form.

A floating **Report** widget is also mounted by default; set `showWidget: false` to disable it.

---

## 6. Watch the replay

1. Open the dashboard and log in.
2. Find your session (search by the identifier you set).
3. Press play.

You'll see the session replayed pixel-perfect, with a timeline of clicks, navigations, and errors on the right, and the console panel below (if [console capture](/sdk/privacy) is enabled).

---

## Full example

```typescript
import { BatRewind } from '@batrewind/browser'

// 1. Start recording as early as possible
BatRewind.init({
  endpoint:     'https://rewind.yourdomain.com',
  apiKey:       'rew_your_key_here',
  serviceName:  'my-app',
  environment:  'production',
})

// 2. Identify the user after login
function onLogin(user) {
  BatRewind.identify(user.email)
}

// 3. Report on demand
document.querySelector('#report-bug').addEventListener('click', () => {
  const { shareUrl } = BatRewind.report()
  window.open(shareUrl, '_blank')
})
```

---

## Next steps

- [Browser SDK reference →](/sdk/browser)
- [Privacy & masking →](/sdk/privacy)
- [Capture modes →](/concepts/capture-modes)
