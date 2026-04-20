const SESSION_KEY = '__batrewind_session__'
const SESSION_TTL_MS = 30 * 60 * 1000 // 30 minutes

interface StoredSession {
  id: string
  expiresAt: number
}

function generateId(): string {
  return crypto.randomUUID()
}

export function getOrCreateSessionId(): string {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (raw) {
      const stored: StoredSession = JSON.parse(raw)
      if (Date.now() < stored.expiresAt) {
        // Extend TTL on activity
        sessionStorage.setItem(
          SESSION_KEY,
          JSON.stringify({ id: stored.id, expiresAt: Date.now() + SESSION_TTL_MS }),
        )
        return stored.id
      }
    }
  } catch {
    // sessionStorage unavailable — fall through to generate
  }

  const id = generateId()
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ id, expiresAt: Date.now() + SESSION_TTL_MS }),
    )
  } catch {
    // ignore
  }
  return id
}
