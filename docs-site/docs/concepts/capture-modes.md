---
sidebar_position: 2
title: Capture Modes
---

# Capture Modes

BatRewind supports two capture models. The default — **buffered** — is what makes it a "rewind" tool rather than a record-everything firehose.

## Buffered (default) — the rewind model

```typescript
BatRewind.init({ /* ... */, mode: 'buffered' })
```

In buffered mode the SDK keeps a **rolling buffer of the last `bufferMs`** (default 2 minutes) in memory. Nothing is uploaded until:

- you call `report()`, or
- an uncaught error fires (when `captureOnError` is true).

When triggered, the SDK uploads the whole rolling buffer — the last few minutes leading up to the moment. This is the "rewind": the user hits a bug, clicks report, and you get exactly what happened just before.

**Why it's the default:**

- Only **relevant** sessions reach the server — no storage spent on sessions where nothing went wrong.
- Privacy-friendly: most sessions never leave the browser.
- Cheap to run at scale.

### How the buffer works

rrweb takes a fresh full snapshot every `checkoutEveryNms` (default 30s). Each snapshot opens a new "segment"; older segments are pruned once they fall outside the `bufferMs` window, while always keeping one snapshot so the buffer can always replay from a valid starting frame.

| Option | Default | Description |
|---|---|---|
| `bufferMs` | `120000` | How much history to retain (ms) |
| `checkoutEveryNms` | `30000` | Full-snapshot cadence (ms) |
| `captureOnError` | `true` | Auto-upload on uncaught errors / unhandled rejections |

Each upload carries a `trigger`: `manual` (from `report()`) or `error`.

---

## Always — continuous streaming

```typescript
BatRewind.init({ /* ... */, mode: 'always' })
```

In always mode the SDK streams **every** event continuously: the first full snapshot is sent immediately, then events are batched and flushed on an interval or when the batch exceeds a size threshold. Every session becomes a stored session.

| Option | Default | Description |
|---|---|---|
| `flushIntervalMs` | `5000` | Flush the batch every N ms |
| `flushMaxBytes` | `500000` | Flush when the pending batch exceeds N bytes |

Uploads carry `trigger: stream`.

**When to use it:** when you genuinely need every session (e.g. low-traffic, high-value flows) and accept the storage cost. For most teams, buffered is the right choice.

---

## Comparison

| | Buffered (default) | Always |
|---|---|---|
| Sessions stored | Only reported / errored | Every session |
| Upload timing | On `report()` / error | Continuous |
| Storage cost | Low | High |
| Privacy | Most sessions never leave the browser | Everything is uploaded |
| Best for | Bug reports, support | Full coverage of key flows |
