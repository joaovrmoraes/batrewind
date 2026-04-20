export interface WidgetOptions {
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  color: string
  onReport: () => void
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

  const style = document.createElement('style')
  style.textContent = `
    :host { all: initial; }
    button {
      position: fixed;
      ${POSITIONS[options.position] ?? POSITIONS['bottom-right']}
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
  `

  const button = document.createElement('button')
  button.setAttribute('aria-label', 'Report an issue')
  button.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
    Report issue
  `
  button.addEventListener('click', options.onReport)

  shadow.appendChild(style)
  shadow.appendChild(button)
  document.body.appendChild(host)

  return () => host.remove()
}
