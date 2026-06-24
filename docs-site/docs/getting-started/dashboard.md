---
sidebar_position: 3
title: The Dashboard
---

# The Dashboard

The dashboard is where you browse, replay, share, and delete recorded sessions. It runs on port `3010` by default and is protected by login (JWT).

## Logging in

Use the owner account created on first boot via `INITIAL_OWNER_EMAIL` / `INITIAL_OWNER_PASSWORD`. In the demo stack the credentials are `admin@batrewind.local` / `admin123`.

---

## Overview

The landing page shows replay metrics at a glance:

- **Total sessions**, **today**, and **this week**
- **Failed ingests** — batches that couldn't be processed (retryable)
- **Active services** — the `serviceName` values seen across sessions
- **Recent sessions** — quick links to the latest replays

---

## Sessions list

Browse all sessions, filter by identifier, service, or environment, and open any one to replay it. Each row shows the identifier, service, environment, trigger badge (`reported` / `error` / `stream`), timestamp, and event count.

---

## The player

Opening a session shows:

- **Replay** — a pixel-perfect rrweb reconstruction with play/pause, speed controls (1×–8×), and *skip inactive*.
- **Timeline** — a human-readable breadcrumb of every action (navigation, input, click, error). Click any item to **seek** the player to that moment.
- **Console** — log/warn/error output captured during the session (only when [console capture](/sdk/privacy) was enabled in the SDK). Click an entry to seek.

---

## Sharing a session

Click **Share replay** to generate a public, login-free link. The shared view is **redacted**: console output and user identity are stripped server-side. Anyone with the link can watch the replay, but cannot see sensitive data or access the dashboard. See [Share links](/concepts/share-links).

---

## Copy for AI

Click **Copy for AI** to copy a compact, text incident report (timeline + console + context) to your clipboard. Paste it into an AI assistant with your project open and it can understand what the user did and where it broke. See [Copy for AI](/concepts/copy-for-ai).

---

## Deleting a session

Click **Delete** on a session to permanently remove it and all its events. This is irreversible and supports data-erasure requests (LGPD/GDPR). For automatic time-based cleanup, see [Retention](/concepts/retention).

---

## Failed ingests

If a batch fails to persist after all retries, it lands in the **failed ingest** list with the error. You can retry individual batches or **Retry all** from the banner. See [Architecture](/concepts/architecture) for how the retry pipeline works.
