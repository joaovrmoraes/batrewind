---
slug: /intro
sidebar_position: 1
title: Introduction
---

# BatRewind

**Self-hosted session replay for the web. Record what your users actually did — replay it frame by frame.**

BatRewind captures real user sessions in the browser using [rrweb](https://www.rrweb.io/) and lets you replay them pixel-perfect in a dashboard, complete with a human-readable timeline and console output. It ships as a single `docker compose up` and runs entirely on your own infrastructure.

Built with Go + rrweb. No cloud dependency, no vendor lock-in.

---

## Why BatRewind

When a user hits a bug, a screenshot and a vague description rarely tell you what happened. Session replay shows you the exact sequence of clicks, inputs, navigations, and errors that led to the problem.

Most session replay tools are SaaS-only, priced per session, and send your users' data to a third party. BatRewind is the opposite:

| Feature | BatRewind | LogRocket | FullStory |
|---|---|---|---|
| Session replay | ✅ | ✅ | ✅ |
| Self-hosted | ✅ | ❌ | ❌ |
| Your data stays on your servers | ✅ | ❌ | ❌ |
| Open source | ✅ (MIT) | ❌ | ❌ |
| Price | Free | $99+/mo | Custom |

---

## What it does

- **Records** every click, scroll, input, navigation, and DOM mutation with rrweb
- **Rewinds** the last minutes of a session on demand — only sessions that matter reach the server (see [Capture modes](/concepts/capture-modes))
- **Replays** sessions pixel-perfect with a synchronized, human-readable timeline (clicks, navigations, errors)
- **Captures** console output (opt-in) and surfaces errors alongside the replay
- **Shares** a session through a redacted, login-free public link — safe to paste into a bug report
- **Exports** an incident as plain text — "Copy for AI" — to paste into an AI assistant that understands what broke
- **Protects** privacy with input masking, block/mask selectors, and server-side redaction of shared links
- **Retains** only what you want: per-session delete and automatic time-based purging
- **Scales** ingestion with Redis Streams and autoscaling workers; failed batches are retryable from the dashboard

---

## Architecture

```
Browser SDK (rrweb events)
        │
        ▼
    Writer :8090  ──→  Redis Stream  ──→  Worker
                                              │
                                              ▼
                                     PostgreSQL / SQLite
                                              │
                                              ▼
                                      Reader :8081  ──→  Dashboard :3010
```

| Service | Port | Role |
|---|---|---|
| **Writer** | 8090 | Receives rrweb event batches from the SDK (API-key auth), enqueues to Redis |
| **Worker** | — | Consumes the stream, persists sessions/events, purges old data |
| **Reader** | 8081 | REST API for the dashboard and public share links (JWT auth) |
| **Dashboard** | 3010 | The replay UI |

See [Architecture](/concepts/architecture) for the full picture.

---

## Next steps

- [Install BatRewind →](/getting-started/installation)
- [Record your first session →](/getting-started/first-session)
- [Browser SDK reference →](/sdk/browser)
