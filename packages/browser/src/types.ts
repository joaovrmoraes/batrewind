export interface BatRewindConfig {
  /** BatRewind Writer endpoint (e.g. https://your-domain.com) */
  endpoint: string
  /** API key created in the BatRewind dashboard (rew_ prefix) */
  apiKey: string
  /** Service name to identify this app in the dashboard */
  serviceName?: string
  /** @deprecated Use serviceName instead */
  service?: string
  /** Environment: production | staging | development */
  environment?: string
  /** User identifier (email, ID, name) — searchable in the dashboard */
  identifier?: string
  /** Optional external session ID for correlation with BatAudit — never required */
  batSessionId?: string
  /**
   * Base URL of the BatRewind dashboard, used to build the shareable replay link
   * returned by report(). Defaults to `endpoint` if omitted (fine when the dashboard
   * and ingest endpoint share an origin).
   */
  shareBaseUrl?: string
  /** Show the floating feedback widget. Default: true */
  showWidget?: boolean
  /** Widget position. Default: bottom-right */
  widgetPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  /** Widget accent color. Default: #818cf8 */
  widgetColor?: string
  /** Widget button label. Default: 'Report issue' */
  widgetLabel?: string
  /** Mask all password inputs. Default: true */
  maskInputs?: boolean
  /**
   * Capture console output (log/info/warn/error) into the replay. OFF by default —
   * console logs frequently contain PII, so this is opt-in for LGPD/GDPR compliance.
   * - `true`: capture all levels.
   * - `{ level: [...] }`: capture only the given levels.
   * Console events are always stripped from public share links regardless of this setting.
   */
  captureConsole?: boolean | { level: ConsoleLevel[] }
  /**
   * Don't record text inside elements matching this class — the text is replaced with
   * asterisks. Use for visible PII rendered on the page (maskInputs only covers <input>).
   */
  maskTextClass?: string
  /** Like maskTextClass but a CSS selector (e.g. '[data-pii]', '.email'). */
  maskTextSelector?: string
  /** Don't record elements matching this class at all — replaced with a placeholder block. */
  blockClass?: string
  /** Like blockClass but a CSS selector (e.g. '.secret', '#card-number'). */
  blockSelector?: string
  /** Ignore (don't record interactions/value changes on) inputs matching this class. */
  ignoreClass?: string
  /**
   * Capture mode. Default: 'buffered'.
   * - 'buffered': keep a rolling buffer of the last `bufferMs` in memory and only
   *   upload when report() is called (or an error fires, if captureOnError). This is
   *   the "rewind" model — the user hits a bug, clicks report, and the last minutes
   *   are uploaded. Only relevant sessions reach the dashboard.
   * - 'always': stream every event continuously (every session becomes a session).
   */
  mode?: 'buffered' | 'always'
  /** [buffered] How many ms of history to retain in the rolling buffer. Default: 120000 (2 min) */
  bufferMs?: number
  /** [buffered] How often rrweb takes a fresh FullSnapshot checkpoint. Default: 30000 (30s) */
  checkoutEveryNms?: number
  /** [buffered] Also upload automatically on uncaught errors / unhandled rejections. Default: true */
  captureOnError?: boolean
  /** [always] Flush batch every N milliseconds. Default: 5000 */
  flushIntervalMs?: number
  /** [always] Flush batch when payload exceeds N bytes. Default: 500000 (500KB) */
  flushMaxBytes?: number
}

/** Console levels rrweb's console plugin can capture. */
export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error' | 'debug'

export interface RawEvent {
  type: number
  data: unknown
  timestamp: number
}

export interface BatchPayload {
  session_id: string
  identifier: string
  service_name: string
  environment: string
  bat_session_id?: string
  /** Why this batch was uploaded: 'manual' (report), 'error' (auto), 'stream' (always mode) */
  trigger?: 'manual' | 'error' | 'stream'
  /** Public share token, stable per session — lets report() return a link. */
  share_token?: string
  events: RawEvent[]
}

/** Returned by report() so the host app can drop the link into a bug form. */
export interface ReportResult {
  sessionId: string
  shareToken: string
  /** Full public replay URL, e.g. https://dashboard/share/<token> */
  shareUrl: string
}
