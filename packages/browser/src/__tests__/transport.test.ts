import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendBeaconOrFetch } from '../transport'
import type { BatchPayload } from '../types'

const payload: BatchPayload = {
  session_id:  'sess-001',
  identifier:  'sess-001',
  service:     'web',
  environment: 'test',
  events:      [{ type: 3, data: {}, timestamp: 1000 }],
}

describe('sendBeaconOrFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('uses sendBeacon when available and returns', () => {
    const beacon = vi.fn().mockReturnValue(true)
    vi.stubGlobal('navigator', { sendBeacon: beacon })
    sendBeaconOrFetch('http://localhost:8080', 'rew_test', payload)
    expect(beacon).toHaveBeenCalledOnce()
    expect(beacon.mock.calls[0][0]).toBe('http://localhost:8080/v1/record')
  })

  it('falls back to fetch when sendBeacon returns false', () => {
    const beacon = vi.fn().mockReturnValue(false)
    const fetchMock = vi.fn().mockResolvedValue({})
    vi.stubGlobal('navigator', { sendBeacon: beacon })
    vi.stubGlobal('fetch', fetchMock)
    sendBeaconOrFetch('http://localhost:8080', 'rew_test', payload)
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/v1/record')
    expect(opts.method).toBe('POST')
    expect(opts.headers['X-API-Key']).toBe('rew_test')
  })

  it('falls back to fetch when sendBeacon is unavailable', () => {
    const fetchMock = vi.fn().mockResolvedValue({})
    vi.stubGlobal('navigator', {})
    vi.stubGlobal('fetch', fetchMock)
    sendBeaconOrFetch('http://localhost:8080', 'rew_test', payload)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('silently ignores fetch errors', async () => {
    vi.stubGlobal('navigator', {})
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))
    await expect(
      async () => sendBeaconOrFetch('http://localhost:8080', 'rew_test', payload)
    ).not.toThrow()
  })
})
