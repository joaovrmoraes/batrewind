import type { BatchPayload } from './types'

// keepalive has a 64 KB body limit in Chrome — only use it for unload batches.
// The initial FullSnapshot can exceed that easily (full DOM serialized).
export function sendBatch(endpoint: string, apiKey: string, payload: BatchPayload, keepalive = false): void {
  const url = `${endpoint}/v1/record`

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify(payload),
    keepalive,
  }).catch(() => {
    // Silently ignore — replay data is best-effort
  })
}
