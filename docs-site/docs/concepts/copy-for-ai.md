---
sidebar_position: 5
title: Copy for AI
---

# Copy for AI

Every session can be exported as a compact, plain-text **incident report** designed to be pasted into an AI assistant. With your project source open, the AI can read what the user did and where it broke — and help you find the cause.

## How to use it

1. Open a session in the dashboard.
2. Click **Copy for AI** (next to *Share replay*).
3. Paste into your AI assistant (e.g. Claude Code, Cursor, ChatGPT) with the project open.

The report is copied to your clipboard as Markdown.

---

## What's in the report

The export mirrors what an engineer would read from the replay: context, a breadcrumb timeline, and the console output.

```markdown
# BatRewind incident — checkout (production)

- Session: 78b43c84-8644-4a08-a49f-e87d881a46a5
- User: user@example.com
- Trigger: reported
- Started: 2026-06-24T12:49:37.000Z
- Duration: 1m 2s
- Events: 110 · Errors: 1 · Warnings: 0
- Start URL: https://app.example.com/dashboard

## Timeline (relative to session start)
+0.0s    nav     https://app.example.com/dashboard
+17.6s   input   User typed
+31.9s   click   Click
+47.8s   error   TypeError: Cannot read properties of undefined (reading "data")
+52.7s   click   Click

## Console
[error] +47.8s TypeError: Cannot read properties of undefined (reading "data")

---
This is a recorded user session (session replay). It describes what the user did
and where it broke. Use it with the project source open to locate the cause.
```

| Section | Contents |
|---|---|
| **Header** | Service, environment, session id, user, trigger, timing, error/warning counts, start and last URL |
| **Timeline** | Navigations, inputs, clicks, and errors, each with a timestamp relative to the session start |
| **Console** | Captured console output (only present if [console capture](/sdk/privacy) was enabled) |

---

## Why it works

It's the same information BatRewind shows in the player's timeline and console panel, flattened into text an LLM can reason over directly — no screenshots, no video, no need to open the replay. Combined with your source tree, the timeline of actions plus the exact error message and the URL where it happened is usually enough for an AI to pinpoint the bug.

:::tip
The report includes console output, which may contain sensitive data. It's generated from the **authenticated** dashboard view (not the redacted public share link), so share it with the same care you'd treat the session itself.
:::
