import { record } from 'rrweb'
import type { eventWithTime } from '@rrweb/types'
import { getRecordConsolePlugin } from '@rrweb/rrweb-plugin-console-record'
import type { BatRewindConfig, RawEvent } from './types'
import { getOrCreateSessionId } from './session'
import { sendBatch } from './transport'
import { mountWidget } from './widget'

const FLUSH_INTERVAL_MS = 5_000
const FLUSH_MAX_BYTES   = 500_000 // 500KB
const FULL_SNAPSHOT_TYPE = 2

let _config: BatRewindConfig | null = null
let _sessionId: string | null = null
let _buffer: RawEvent[] = []
let _flushTimer: ReturnType<typeof setInterval> | null = null
let _stopRecording: (() => void) | undefined | null = null
let _unmountWidget: (() => void) | null = null
let _initialized = false

function bufferSize(): number {
  return new TextEncoder().encode(JSON.stringify(_buffer)).length
}

function flush(force = false, keepalive = false): void {
  if (!_config || !_sessionId || _buffer.length === 0) return
  if (!force && bufferSize() < (_config.flushMaxBytes ?? FLUSH_MAX_BYTES)) return

  const events = _buffer.splice(0)
  sendBatch(_config.endpoint, _config.apiKey, {
    session_id:     _sessionId,
    identifier:     _config.identifier ?? _sessionId,
    service_name:   _config.serviceName ?? _config.service ?? 'web',
    environment:    _config.environment ?? 'production',
    bat_session_id: _config.batSessionId,
    events,
  }, keepalive)
}

function onVisibilityChange(): void {
  if (document.visibilityState === 'hidden') flush(true, true)
}

function onBeforeUnload(): void {
  flush(true, true)
}

/**
 * Initialize BatRewind and start recording.
 * Call once, as early as possible in your app.
 */
export function init(config: BatRewindConfig): void {
  if (_initialized) return
  _initialized = true
  _config = config
  _sessionId = getOrCreateSessionId()

  const plugins = [
    getRecordConsolePlugin({ level: ['log', 'info', 'warn', 'error'] }),
  ]

  let firstSnapshot = true

  _stopRecording = record({
    emit(event: eventWithTime) {
      const raw: RawEvent = {
        type:      event.type,
        data:      event.data,
        timestamp: event.timestamp,
      }

      // Send FullSnapshot immediately without buffering.
      // No keepalive — FullSnapshot is sent on load (not unload) and
      // can exceed the 64 KB keepalive body limit in Chrome.
      if (event.type === FULL_SNAPSHOT_TYPE && firstSnapshot) {
        firstSnapshot = false
        sendBatch(config.endpoint, config.apiKey, {
          session_id:     _sessionId!,
          identifier:     config.identifier ?? _sessionId!,
          service_name:   config.serviceName ?? config.service ?? 'web',
          environment:    config.environment ?? 'production',
          bat_session_id: config.batSessionId,
          events:         [raw],
        }, false) // keepalive: false — may be large
        return
      }

      _buffer.push(raw)

      // Flush if buffer exceeds size limit
      if (bufferSize() >= (config.flushMaxBytes ?? FLUSH_MAX_BYTES)) {
        flush(true)
      }
    },
    maskAllInputs: config.maskInputs ?? true,
    plugins,
  })

  // Flush on interval
  _flushTimer = setInterval(() => flush(true), config.flushIntervalMs ?? FLUSH_INTERVAL_MS)

  // Flush on page hide/unload — use keepalive so the request survives tab close
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('beforeunload', onBeforeUnload)

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
 * Manually flush and mark the current session as reported.
 * Safe to call programmatically (e.g. on an error page) — no UI required.
 */
export function report(): void {
  flush(true)
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
  flush(true)
  _initialized = false
  _config = null
  _sessionId = null
  _buffer = []
}

/**
 * Namespace object — for ES module consumers: import { BatRewind } from '@batrewind/browser'
 * In UMD: window.BatRewind.init() works directly (top-level exports)
 */
export const BatRewind = { init, report, stop }
