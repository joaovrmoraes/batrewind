import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// vi.hoisted runs before module hoisting — safe to reference in vi.mock factories
const { _recordMock, getEmitFn } = vi.hoisted(() => {
  let _emitFn: ((e: any) => void) | null = null
  const _recordMock = vi.fn((opts: any) => {
    _emitFn = opts.emit
    return vi.fn()
  })
  return { _recordMock, getEmitFn: () => _emitFn }
})

vi.mock('rrweb', () => ({ record: _recordMock }))
vi.mock('@rrweb/rrweb-plugin-console-record', () => ({
  getRecordConsolePlugin: vi.fn(() => ({ name: 'console' })),
}))

import { BatRewind } from '../index'

const config = {
  endpoint:    'http://localhost:8080',
  apiKey:      'rew_test',
  service:     'web',
  environment: 'test',
}

describe('BatRewind', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    fetchMock = vi.fn().mockResolvedValue({})
    vi.stubGlobal('navigator', { sendBeacon: vi.fn().mockReturnValue(false) })
    vi.stubGlobal('fetch', fetchMock)
    document.body.innerHTML = ''
    _recordMock.mockClear()
  })

  afterEach(() => {
    BatRewind.stop()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('init starts recording and mounts widget by default', () => {
    BatRewind.init(config)
    expect(_recordMock).toHaveBeenCalledOnce()
    expect(document.getElementById('__batrewind_widget__')).not.toBeNull()
  })

  it('init with showWidget: false skips widget', () => {
    BatRewind.init({ ...config, showWidget: false })
    expect(document.getElementById('__batrewind_widget__')).toBeNull()
  })

  it('init is idempotent — second call is ignored', () => {
    BatRewind.init(config)
    BatRewind.init(config)
    expect(_recordMock).toHaveBeenCalledOnce()
  })

  it('FullSnapshot (type 2) is sent immediately without buffering', () => {
    BatRewind.init(config)
    const emit = getEmitFn()!
    emit({ type: 2, data: { node: {} }, timestamp: 1000 })
    expect(fetchMock).toHaveBeenCalledOnce()
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.events[0].type).toBe(2)
  })

  it('non-snapshot events are buffered and flushed on interval', () => {
    BatRewind.init(config)
    const emit = getEmitFn()!
    // First emit a FullSnapshot to initialize (sent immediately)
    emit({ type: 2, data: {}, timestamp: 1000 })
    fetchMock.mockClear()

    emit({ type: 3, data: {}, timestamp: 2000 })
    expect(fetchMock).not.toHaveBeenCalled()

    vi.advanceTimersByTime(5_000)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('report() flushes immediately without widget interaction', () => {
    BatRewind.init({ ...config, showWidget: false })
    const emit = getEmitFn()!
    emit({ type: 2, data: {}, timestamp: 1000 }) // FullSnapshot
    fetchMock.mockClear()

    emit({ type: 3, data: {}, timestamp: 2000 })
    BatRewind.report()
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('stop cleans up and allows re-init', () => {
    BatRewind.init(config)
    BatRewind.stop()
    _recordMock.mockClear()
    BatRewind.init(config)
    expect(_recordMock).toHaveBeenCalledOnce()
  })
})
