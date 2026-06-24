const SESSION_KEY = '__batrewind_session__'
const SESSION_TTL_MS = 30 * 60 * 1000 // 30 minutes

interface StoredSession {
  id: string
  /** Public share token, stable for the lifetime of the session. */
  shareToken: string
  expiresAt: number
}

export interface SessionHandle {
  id: string
  shareToken: string
}

function generateId(): string {
  return crypto.randomUUID()
}

export function getOrCreateSession(): SessionHandle {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (raw) {
      const stored: StoredSession = JSON.parse(raw)
      // Tolerate sessions stored before share tokens existed.
      if (Date.now() < stored.expiresAt && stored.id) {
        const shareToken = stored.shareToken || generateId()
        sessionStorage.setItem(
          SESSION_KEY,
          JSON.stringify({ id: stored.id, shareToken, expiresAt: Date.now() + SESSION_TTL_MS }),
        )
        return { id: stored.id, shareToken }
      }
    }
  } catch {
    // sessionStorage unavailable — fall through to generate
  }

  const handle: SessionHandle = { id: generateId(), shareToken: generateId() }
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ ...handle, expiresAt: Date.now() + SESSION_TTL_MS }),
    )
  } catch {
    // ignore
  }
  return handle
}

/** @deprecated use getOrCreateSession — kept for callers that only need the id. */
export function getOrCreateSessionId(): string {
  return getOrCreateSession().id
}
