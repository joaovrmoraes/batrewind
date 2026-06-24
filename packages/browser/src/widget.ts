import type { ReportResult } from './types'

export interface WidgetOptions {
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  color: string
  label?: string
  /** Returns the report result so the widget can surface a shareable link. */
  onReport: () => ReportResult | void
}

const POSITIONS: Record<string, string> = {
  'bottom-right': 'bottom:24px;right:24px;',
  'bottom-left':  'bottom:24px;left:24px;',
  'top-right':    'top:24px;right:24px;',
  'top-left':     'top:24px;left:24px;',
}

export function mountWidget(options: WidgetOptions): () => void {
  const host = document.createElement('div')
  host.setAttribute('id', '__batrewind_widget__')
  const shadow = host.attachShadow({ mode: 'open' })

  const anchor = POSITIONS[options.position] ?? POSITIONS['bottom-right']

  const style = document.createElement('style')
  style.textContent = `
    :host { all: initial; }
    button {
      position: fixed;
      ${anchor}
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 16px;
      background: ${options.color};
      color: #fff;
      border: none;
      border-radius: 999px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(0,0,0,0.25);
      transition: opacity 0.2s, transform 0.2s;
      letter-spacing: 0.2px;
    }
    button:hover  { opacity: 0.9; transform: scale(1.04); }
    button:active { opacity: 0.8; transform: scale(0.97); }
    svg { flex-shrink: 0; }

    .toast {
      position: fixed;
      ${anchor}
      z-index: 2147483647;
      width: 300px;
      padding: 14px;
      background: #1e2130;
      color: #e2e8f0;
      border: 1px solid #2d3350;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      box-shadow: 0 8px 28px rgba(0,0,0,0.4);
    }
    .toast__title { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
    .toast__row { display: flex; gap: 6px; }
    .toast__link {
      flex: 1; min-width: 0;
      padding: 7px 9px;
      background: #0f1117;
      border: 1px solid #2d3350;
      border-radius: 7px;
      font-size: 11px; color: #94a3b8;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .toast__copy {
      position: static;
      padding: 7px 12px;
      background: ${options.color};
      border-radius: 7px;
      font-size: 12px; font-weight: 600;
      box-shadow: none;
    }
    .toast__hint { margin-top: 8px; font-size: 11px; color: #64748b; }
  `

  const button = document.createElement('button')
  button.setAttribute('aria-label', 'Report an issue')
  button.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
    ${options.label ?? 'Report issue'}
  `

  let toast: HTMLDivElement | null = null

  function showToast(url: string) {
    toast?.remove()
    toast = document.createElement('div')
    toast.className = 'toast'
    toast.innerHTML = `
      <div class="toast__title">Replay saved ✓</div>
      <div class="toast__row">
        <div class="toast__link" title="${url}">${url}</div>
        <button class="toast__copy" type="button">Copy</button>
      </div>
      <div class="toast__hint">Send this link so anyone can watch the replay.</div>
    `
    button.style.display = 'none'
    const copyBtn = toast.querySelector('.toast__copy') as HTMLButtonElement
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(url)
        copyBtn.textContent = 'Copied'
      } catch {
        copyBtn.textContent = 'Copy failed'
      }
    })
    shadow.appendChild(toast)
    setTimeout(() => {
      toast?.remove()
      toast = null
      button.style.display = ''
    }, 8000)
  }

  button.addEventListener('click', () => {
    const result = options.onReport()
    if (result && result.shareUrl) showToast(result.shareUrl)
  })

  shadow.appendChild(style)
  shadow.appendChild(button)
  document.body.appendChild(host)

  return () => {
    toast?.remove()
    host.remove()
  }
}
