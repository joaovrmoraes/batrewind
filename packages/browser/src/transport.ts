import type { BatchPayload } from './types'

export function sendBeaconOrFetch(endpoint: string, apiKey: string, payload: BatchPayload): void {
  const url = `${endpoint}/v1/record`
  const body = JSON.stringify(payload)

  // Prefer sendBeacon for unload scenarios — fire and forget, no response
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' })
    const sent = navigator.sendBeacon(url, blob)
    if (sent) return
  }

  // Fallback to fetch (keepalive for background sends)
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body,
    keepalive: true,
  }).catch(() => {
    // Silently ignore — replay data is best-effort
  })
}
