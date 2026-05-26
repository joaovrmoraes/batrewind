import type { BatchPayload } from './types'

export function sendBeaconOrFetch(endpoint: string, apiKey: string, payload: BatchPayload): void {
  const url = `${endpoint}/v1/record`

  // fetch with keepalive works both in normal flow and on page unload.
  // sendBeacon cannot send custom headers (no X-API-Key) → always 401.
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Silently ignore — replay data is best-effort
  })
}
