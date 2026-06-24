import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendBatch } from '../transport'
import type { BatchPayload } from '../types'

const payload: BatchPayload = {
  session_id:   'sess-001',
  identifier:   'sess-001',
  service_name: 'web',
  environment:  'test',
  events:       [{ type: 3, data: {}, timestamp: 1000 }],
}

describe('sendBatch', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('POSTs to /v1/record with the API key header', () => {
    const fetchMock = vi.fn().mockResolvedValue({})
    vi.stubGlobal('fetch', fetchMock)
    sendBatch('http://localhost:8080', 'rew_test', payload)
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/v1/record')
    expect(opts.method).toBe('POST')
    expect(opts.headers['X-API-Key']).toBe('rew_test')
    expect(opts.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(opts.body).session_id).toBe('sess-001')
  })

  it('passes keepalive through when requested', () => {
    const fetchMock = vi.fn().mockResolvedValue({})
    vi.stubGlobal('fetch', fetchMock)
    sendBatch('http://localhost:8080', 'rew_test', payload, true)
    expect(fetchMock.mock.calls[0][1].keepalive).toBe(true)
  })

  it('defaults keepalive to false', () => {
    const fetchMock = vi.fn().mockResolvedValue({})
    vi.stubGlobal('fetch', fetchMock)
    sendBatch('http://localhost:8080', 'rew_test', payload)
    expect(fetchMock.mock.calls[0][1].keepalive).toBe(false)
  })

  it('silently ignores fetch errors', () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))
    expect(() => sendBatch('http://localhost:8080', 'rew_test', payload)).not.toThrow()
  })
})
