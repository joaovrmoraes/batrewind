import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountWidget } from '../widget'

describe('mountWidget', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('appends a host element to the body', () => {
    const unmount = mountWidget({ position: 'bottom-right', color: '#818cf8', onReport: vi.fn() })
    expect(document.getElementById('__batrewind_widget__')).not.toBeNull()
    unmount()
  })

  it('calls onReport when button is clicked', () => {
    const onReport = vi.fn()
    mountWidget({ position: 'bottom-right', color: '#818cf8', onReport })
    const host = document.getElementById('__batrewind_widget__')!
    const shadow = host.shadowRoot as ShadowRoot
    const button = shadow.querySelector('button')!
    button.click()
    expect(onReport).toHaveBeenCalledOnce()
  })

  it('removes the host element when unmount is called', () => {
    const unmount = mountWidget({ position: 'bottom-right', color: '#818cf8', onReport: vi.fn() })
    unmount()
    expect(document.getElementById('__batrewind_widget__')).toBeNull()
  })
})
