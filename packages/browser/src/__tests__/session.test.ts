import { describe, it, expect, beforeEach } from 'vitest'
import { getOrCreateSessionId } from '../session'

describe('getOrCreateSessionId', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('generates a valid UUID on first call', () => {
    const id = getOrCreateSessionId()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  it('returns the same ID on subsequent calls', () => {
    const a = getOrCreateSessionId()
    const b = getOrCreateSessionId()
    expect(a).toBe(b)
  })

  it('generates a new ID after session expires', () => {
    const id = getOrCreateSessionId()
    // Manually expire the session
    const stored = JSON.parse(sessionStorage.getItem('__batrewind_session__')!)
    stored.expiresAt = Date.now() - 1
    sessionStorage.setItem('__batrewind_session__', JSON.stringify(stored))
    const newId = getOrCreateSessionId()
    expect(newId).not.toBe(id)
  })

  it('generates a new ID when sessionStorage is corrupted', () => {
    sessionStorage.setItem('__batrewind_session__', 'invalid-json')
    const id = getOrCreateSessionId()
    expect(id).toMatch(/^[0-9a-f]{8}-/)
  })
})
