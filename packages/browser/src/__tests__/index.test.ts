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

  // ── buffered mode (default) ──────────────────────────────────────────────

  it('buffered mode: nothing is uploaded until report() is called', () => {
    BatRewind.init(config)
    const emit = getEmitFn()!
    emit({ type: 2, data: { node: {} }, timestamp: 1000 }, true) // checkout snapshot
    emit({ type: 3, data: {}, timestamp: 2000 })
    // No streaming — the rolling buffer stays local
    vi.advanceTimersByTime(10_000)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('buffered mode: report() uploads the rolling buffer with trigger=manual', () => {
    BatRewind.init({ ...config, showWidget: false })
    const emit = getEmitFn()!
    emit({ type: 2, data: {}, timestamp: 1000 }, true) // checkout opens segment
    emit({ type: 3, data: {}, timestamp: 2000 })

    BatRewind.report()
    expect(fetchMock).toHaveBeenCalledOnce()
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.trigger).toBe('manual')
    expect(body.events[0].type).toBe(2) // buffer opens with a FullSnapshot
    expect(body.events).toHaveLength(2)
  })

  it('buffered mode: rrweb is configured with a checkout interval', () => {
    BatRewind.init({ ...config, checkoutEveryNms: 15_000 })
    expect(_recordMock.mock.calls[0][0].checkoutEveryNms).toBe(15_000)
  })

  it('buffered mode: report() with empty buffer does not upload', () => {
    BatRewind.init({ ...config, showWidget: false })
    BatRewind.report()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('report() returns a shareable link and sends the token in the payload', () => {
    BatRewind.init({ ...config, showWidget: false, shareBaseUrl: 'http://dash.local' })
    const emit = getEmitFn()!
    emit({ type: 2, data: {}, timestamp: 1000 }, true)

    const result = BatRewind.report()
    expect(result.shareToken).toBeTruthy()
    expect(result.shareUrl).toBe(`http://dash.local/share/${result.shareToken}`)

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.share_token).toBe(result.shareToken)
  })

  it('identify() updates the identifier on subsequent uploads', () => {
    BatRewind.init({ ...config, showWidget: false })
    const emit = getEmitFn()!
    emit({ type: 2, data: {}, timestamp: 1000 }, true)

    BatRewind.identify('jane@company.com')
    BatRewind.report()

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.identifier).toBe('jane@company.com')
  })

  it('sends client metadata on the first batch only', () => {
    BatRewind.init({ ...config, mode: 'always', showWidget: false })
    const emit = getEmitFn()!

    emit({ type: 2, data: { node: {} }, timestamp: 1000 }) // immediate upload (1st batch)
    emit({ type: 3, data: {}, timestamp: 2000 })
    BatRewind.report() // flushes a 2nd batch

    const first = JSON.parse(fetchMock.mock.calls[0][1].body)
    const second = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(first.client).toBeDefined()
    expect(first.client).toHaveProperty('user_agent')
    expect(first.client).toHaveProperty('screen_width')
    expect(second.client).toBeUndefined()
  })

  it('captureClientMetadata: false omits the client object', () => {
    BatRewind.init({ ...config, mode: 'always', showWidget: false, captureClientMetadata: false })
    const emit = getEmitFn()!
    emit({ type: 2, data: { node: {} }, timestamp: 1000 })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.client).toBeUndefined()
  })

  // ── always mode (opt-in) ─────────────────────────────────────────────────

  it('always mode: FullSnapshot (type 2) is sent immediately', () => {
    BatRewind.init({ ...config, mode: 'always' })
    const emit = getEmitFn()!
    emit({ type: 2, data: { node: {} }, timestamp: 1000 })
    expect(fetchMock).toHaveBeenCalledOnce()
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.events[0].type).toBe(2)
    expect(body.trigger).toBe('stream')
  })

  it('always mode: non-snapshot events are buffered and flushed on interval', () => {
    BatRewind.init({ ...config, mode: 'always' })
    const emit = getEmitFn()!
    emit({ type: 2, data: {}, timestamp: 1000 })
    fetchMock.mockClear()

    emit({ type: 3, data: {}, timestamp: 2000 })
    expect(fetchMock).not.toHaveBeenCalled()

    vi.advanceTimersByTime(5_000)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  // ── privacy: console opt-in + masking ────────────────────────────────────

  it('console capture is OFF by default (no plugins registered)', () => {
    BatRewind.init({ ...config, showWidget: false })
    expect(_recordMock.mock.calls[0][0].plugins).toHaveLength(0)
  })

  it('captureConsole: true registers the console plugin with all levels', async () => {
    const { getRecordConsolePlugin } = await import('@rrweb/rrweb-plugin-console-record')
    BatRewind.init({ ...config, showWidget: false, captureConsole: true })
    expect(_recordMock.mock.calls[0][0].plugins).toHaveLength(1)
    expect(getRecordConsolePlugin).toHaveBeenCalledWith({ level: ['log', 'info', 'warn', 'error'] })
  })

  it('captureConsole: { level } registers only the requested levels', async () => {
    const { getRecordConsolePlugin } = await import('@rrweb/rrweb-plugin-console-record')
    BatRewind.init({ ...config, showWidget: false, captureConsole: { level: ['error'] } })
    expect(getRecordConsolePlugin).toHaveBeenCalledWith({ level: ['error'] })
  })

  it('passes mask/block selectors through to rrweb', () => {
    BatRewind.init({
      ...config,
      showWidget: false,
      maskTextClass: 'bat-mask',
      maskTextSelector: '[data-pii]',
      blockClass: 'bat-block',
      blockSelector: '.secret',
      ignoreClass: 'bat-ignore',
    })
    const opts = _recordMock.mock.calls[0][0]
    expect(opts.maskTextClass).toBe('bat-mask')
    expect(opts.maskTextSelector).toBe('[data-pii]')
    expect(opts.blockClass).toBe('bat-block')
    expect(opts.blockSelector).toBe('.secret')
    expect(opts.ignoreClass).toBe('bat-ignore')
    expect(opts.maskAllInputs).toBe(true)
  })

  it('stop cleans up and allows re-init', () => {
    BatRewind.init(config)
    BatRewind.stop()
    _recordMock.mockClear()
    BatRewind.init(config)
    expect(_recordMock).toHaveBeenCalledOnce()
  })
})
