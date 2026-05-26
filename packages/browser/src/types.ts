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
  /** Flush batch every N milliseconds. Default: 5000 */
  flushIntervalMs?: number
  /** Flush batch when payload exceeds N bytes. Default: 500000 (500KB) */
  flushMaxBytes?: number
}

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
  events: RawEvent[]
}
