# Changelog

All notable changes to BatRewind are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-24

First production-ready release. Self-hosted session replay — record what your
users did and replay it frame by frame, fully on your own infrastructure.

### Added

- **Session replay** — Writer/Reader/Worker backend with Redis Streams
  (at-least-once delivery), autoscaling workers, and a `failed_ingest` table
  with one-click retry from the dashboard.
- **Browser SDK** (`@batrewind/browser`) — `init` / `identify` / `report` /
  `stop`, with a floating report widget.
- **Buffered capture (the "rewind")** — default mode keeps a rolling in-memory
  buffer of the last minutes and only uploads on `report()` or an uncaught
  error, so only relevant sessions reach the server. `always` mode streams
  every session.
- **Share links** — public, login-free replay URLs. The share token is
  generated client-side, so `report()` returns the link with no round-trip.
  The public view is redacted server-side (no console, no identity).
- **Dashboard** — pixel-perfect rrweb player, human-readable timeline with
  click-to-seek, and a console panel.
- **Copy for AI** — export a session as a compact, plain-text incident report
  (timeline + console + context) to paste into an AI assistant. Clicks and
  inputs are resolved to their target element (e.g. `Click on button "Profile"`).
- **Privacy controls** — input masking on by default; opt-in console capture;
  `maskTextClass` / `maskTextSelector` / `blockClass` / `blockSelector` /
  `ignoreClass` for masking or blocking visible PII.
- **Retention & deletion** — per-session delete (dashboard + `DELETE
  /v1/sessions/:id`) and automatic time-based purge via `RETENTION_DAYS`.
- **Ingest hardening** — request body size limit (`WRITER_MAX_BODY_BYTES`) and
  per-API-key rate limiting (`WRITER_RATE_LIMIT_RPS` / `_BURST`).
- **Production safety** — configurable CORS (`WRITER_CORS_ORIGINS` /
  `READER_CORS_ORIGINS`); services refuse to boot with the default `JWT_SECRET`
  when `ENVIRONMENT=production`.
- **Documentation** — full Docusaurus documentation site under `docs-site/`.
- **PostgreSQL and SQLite** support, with separate migration sets.

[1.0.0]: https://github.com/joaovrmoraes/batrewind/releases/tag/v1.0.0
