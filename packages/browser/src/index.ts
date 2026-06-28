import { record } from 'rrweb'
import type { eventWithTime } from '@rrweb/types'
import { getRecordConsolePlugin } from '@rrweb/rrweb-plugin-console-record'
import type { BatRewindConfig, ClientMeta, ConsoleLevel, RawEvent, ReportResult } from './types'
import { getOrCreateSession } from './session'
import { sendBatch } from './transport'
import { mountWidget } from './widget'
import { collectClientMeta } from './metadata'

const FLUSH_INTERVAL_MS  = 5_000
const FLUSH_MAX_BYTES    = 500_000 // 500KB
const BUFFER_MS          = 120_000 // 2 min rolling window
const CHECKOUT_EVERY_NMS = 30_000  // fresh FullSnapshot every 30s

let _config: BatRewindConfig | null = null
let _sessionId: string | null = null
let _shareToken: string | null = null
let _stopRecording: (() => void) | undefined | null = null
let _unmountWidget: (() => void) | null = null
let _initialized = false

// Device metadata, collected once at init and attached to the first upload only.
let _clientMeta: ClientMeta | null = null
let _clientMetaSent = false

// 'always' mode — linear buffer flushed on interval/size
let _buffer: RawEvent[] = []
let _flushTimer: ReturnType<typeof setInterval> | null = null

// 'buffered' mode — rolling segments, each starting with a FullSnapshot checkout
let _segments: RawEvent[][] = []

function bufferSize(buf: RawEvent[]): number {
  return new TextEncoder().encode(JSON.stringify(buf)).length
}

// ── always mode ───────────────────────────────────────────────────────────

function flush(force = false, keepalive = false): void {
  if (!_config || !_sessionId || _buffer.length === 0) return
  if (!force && bufferSize(_buffer) < (_config.flushMaxBytes ?? FLUSH_MAX_BYTES)) return

  const events = _buffer.splice(0)
  upload(events, 'stream', keepalive)
}

// ── buffered mode ─────────────────────────────────────────────────────────

/** Prune segments older than the retention window, but always keep one segment
 *  starting at/before the cutoff so the buffer opens with a valid FullSnapshot. */
function pruneSegments(): void {
  const bufferMs = _config?.bufferMs ?? BUFFER_MS
  const cutoff = Date.now() - bufferMs
  while (_segments.length > 1) {
    const next = _segments[1]
    if (next[0] && next[0].timestamp <= cutoff) {
      _segments.shift()
    } else {
      break
    }
  }
}

/** Upload the whole rolling buffer — the "rewind" of the last minutes. */
function uploadBuffer(trigger: 'manual' | 'error', keepalive = false): void {
  if (!_config || !_sessionId) return
  const events = _segments.flat()
  if (events.length === 0) return
  upload(events, trigger, keepalive)
}

// ── shared ────────────────────────────────────────────────────────────────

function upload(events: RawEvent[], trigger: 'manual' | 'error' | 'stream', keepalive: boolean): void {
  if (!_config || !_sessionId) return
  // Attach device metadata to the first upload only; the server stores it once.
  const client = _clientMeta && !_clientMetaSent ? _clientMeta : undefined
  sendBatch(_config.endpoint, _config.apiKey, {
    session_id:     _sessionId,
    identifier:     _config.identifier ?? _sessionId,
    service_name:   _config.serviceName ?? _config.service ?? 'web',
    environment:    _config.environment ?? 'production',
    bat_session_id: _config.batSessionId,
    trigger,
    share_token:    _shareToken ?? undefined,
    client,
    events,
  }, keepalive)
  if (client) _clientMetaSent = true
}

/** Build the public replay link from the dashboard base URL (or the endpoint). */
function shareUrl(): string {
  const base = (_config?.shareBaseUrl ?? _config?.endpoint ?? '').replace(/\/$/, '')
  return `${base}/share/${_shareToken ?? ''}`
}

function isBuffered(): boolean {
  return (_config?.mode ?? 'buffered') === 'buffered'
}

/** Build the rrweb plugin list. Console capture is opt-in (PII risk). */
function buildPlugins(config: BatRewindConfig): ReturnType<typeof getRecordConsolePlugin>[] {
  const cc = config.captureConsole
  if (!cc) return []
  const level: ConsoleLevel[] =
    cc === true ? ['log', 'info', 'warn', 'error'] : cc.level
  return [getRecordConsolePlugin({ level })]
}

/** Masking/blocking options shared by both capture modes. */
function privacyOptions(config: BatRewindConfig) {
  return {
    maskAllInputs:    config.maskInputs ?? true,
    maskTextClass:    config.maskTextClass,
    maskTextSelector: config.maskTextSelector,
    blockClass:       config.blockClass,
    blockSelector:    config.blockSelector,
    ignoreClass:      config.ignoreClass,
  }
}

function onVisibilityChange(): void {
  if (document.visibilityState === 'hidden' && !isBuffered()) flush(true, true)
}

function onBeforeUnload(): void {
  if (!isBuffered()) flush(true, true)
}

function onError(): void {
  if (_config?.captureOnError !== false) uploadBuffer('error', true)
}

/**
 * Initialize BatRewind and start recording.
 * Call once, as early as possible in your app.
 */
export function init(config: BatRewindConfig): void {
  if (_initialized) return
  _initialized = true
  _config = config
  const session = getOrCreateSession()
  _sessionId = session.id
  _shareToken = session.shareToken

  // Opt-out (default on): collect ambient device metadata once.
  _clientMeta = config.captureClientMetadata === false ? null : collectClientMeta()
  _clientMetaSent = false

  const plugins = buildPlugins(config)
  const privacy = privacyOptions(config)

  const buffered = isBuffered()

  if (buffered) {
    _stopRecording = record({
      emit(event: eventWithTime, isCheckout?: boolean) {
        const raw: RawEvent = { type: event.type, data: event.data, timestamp: event.timestamp }
        // A checkout (or the very first event) opens a new segment.
        if (isCheckout || _segments.length === 0) {
          _segments.push([raw])
          pruneSegments()
        } else {
          _segments[_segments.length - 1].push(raw)
        }
      },
      ...privacy,
      checkoutEveryNms: config.checkoutEveryNms ?? CHECKOUT_EVERY_NMS,
      plugins,
    })

    if (config.captureOnError !== false) {
      window.addEventListener('error', onError)
      window.addEventListener('unhandledrejection', onError)
    }
  } else {
    // 'always' mode — stream everything (legacy behaviour)
    let firstSnapshot = true
    _stopRecording = record({
      emit(event: eventWithTime) {
        const raw: RawEvent = { type: event.type, data: event.data, timestamp: event.timestamp }
        // Send FullSnapshot immediately without buffering (no keepalive — may be large).
        if (event.type === 2 && firstSnapshot) {
          firstSnapshot = false
          upload([raw], 'stream', false)
          return
        }
        _buffer.push(raw)
        if (bufferSize(_buffer) >= (config.flushMaxBytes ?? FLUSH_MAX_BYTES)) flush(true)
      },
      ...privacy,
      plugins,
    })

    _flushTimer = setInterval(() => flush(true), config.flushIntervalMs ?? FLUSH_INTERVAL_MS)
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('beforeunload', onBeforeUnload)
  }

  // Mount widget unless disabled
  if (config.showWidget !== false) {
    _unmountWidget = mountWidget({
      position: config.widgetPosition ?? 'bottom-right',
      color:    config.widgetColor ?? '#818cf8',
      label:    config.widgetLabel,
      onReport: () => report(),
    })
  }
}

/**
 * Update who is using the app after init() — e.g. once the user logs in, or in a
 * playground where the identifier is typed in. Affects all subsequent uploads.
 */
export function identify(identifier: string): void {
  if (!_config) return
  _config.identifier = identifier
}

/**
 * Upload the current session and return a shareable replay link.
 * - buffered mode: uploads the rolling buffer (the last minutes) — the "rewind".
 * - always mode: flushes whatever is pending.
 * The returned link is known up-front (the share token is generated client-side),
 * so you can drop `shareUrl` straight into a bug-report form.
 * Safe to call programmatically (e.g. on an error page) — no UI required.
 */
export function report(): ReportResult {
  if (isBuffered()) uploadBuffer('manual')
  else flush(true)
  return {
    sessionId:  _sessionId ?? '',
    shareToken: _shareToken ?? '',
    shareUrl:   shareUrl(),
  }
}

/**
 * Stop recording and clean up all listeners.
 */
export function stop(): void {
  if (_flushTimer) clearInterval(_flushTimer)
  if (_stopRecording) _stopRecording()
  if (_unmountWidget) _unmountWidget()
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('beforeunload', onBeforeUnload)
  window.removeEventListener('error', onError)
  window.removeEventListener('unhandledrejection', onError)
  if (!isBuffered()) flush(true)
  _initialized = false
  _config = null
  _sessionId = null
  _shareToken = null
  _buffer = []
  _segments = []
  _clientMeta = null
  _clientMetaSent = false
}

/**
 * Namespace object — for ES module consumers: import { BatRewind } from '@batrewind/browser'
 * In UMD: window.BatRewind.init() works directly (top-level exports)
 */
export const BatRewind = { init, report, identify, stop }
