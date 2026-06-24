import type { ReplayEvent } from '@/http/sessions/types'

// rrweb event types
const FULL_SNAPSHOT = 2
const META = 4
const INCREMENTAL = 3
const PLUGIN = 6

// rrweb serialized node types
const NODE_ELEMENT = 2
const NODE_TEXT = 3

// IncrementalSnapshot sources
const SOURCE_MUTATION = 0
const SOURCE_MOUSE_INTERACTION = 2
const SOURCE_INPUT = 5

// MouseInteraction types we care about
const MOUSE_CLICK = 2
const MOUSE_DBL_CLICK = 4

interface NodeInfo {
  tag?: string
  text?: string
  domId?: string
  className?: string
  aria?: string
  name?: string
  placeholder?: string
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Collect a short, human label from an element's descendant text nodes. */
function collectText(node: any): string {
  let out = ''
  const walk = (n: any) => {
    if (!n || out.length > 60) return
    if (n.type === NODE_TEXT && typeof n.textContent === 'string') out += n.textContent
    ;(n.childNodes ?? []).forEach(walk)
  }
  walk(node)
  return out.replace(/\s+/g, ' ').trim()
}

/** Index every serialized node by its mirror id, from the full snapshot and any
 *  nodes added by later mutations, so a clicked node id can be named. */
function indexNodes(events: ReplayEvent[]): Map<number, NodeInfo> {
  const map = new Map<number, NodeInfo>()

  const visit = (n: any) => {
    if (!n || typeof n.id !== 'number') {
      ;(n?.childNodes ?? []).forEach(visit)
      return
    }
    if (n.type === NODE_ELEMENT) {
      const a = (n.attributes ?? {}) as Record<string, string>
      map.set(n.id, {
        tag: n.tagName,
        domId: a.id,
        className: typeof a.class === 'string' ? a.class : undefined,
        aria: a['aria-label'],
        name: a.name,
        placeholder: a.placeholder,
        text: collectText(n),
      })
    } else if (n.type === NODE_TEXT) {
      map.set(n.id, { text: (n.textContent ?? '').replace(/\s+/g, ' ').trim() })
    }
    ;(n.childNodes ?? []).forEach(visit)
  }

  for (const e of events) {
    const d = e.data as any
    if (e.type === FULL_SNAPSHOT && d?.node) visit(d.node)
    if (e.type === INCREMENTAL && d?.source === SOURCE_MUTATION && Array.isArray(d.adds)) {
      for (const add of d.adds) visit(add.node)
    }
  }
  return map
}

/** Turn a clicked/typed node id into a readable target, e.g. `button "Profile"`. */
function describeNode(map: Map<number, NodeInfo>, id: number | undefined): string {
  if (typeof id !== 'number') return ''
  const n = map.get(id)
  if (!n) return ''
  const tag = (n.tag ?? 'element').toLowerCase()
  const text = n.text?.slice(0, 40)
  if (text) return `${tag} "${text}"`
  const label = n.aria ?? n.placeholder ?? n.name
  if (label) return `${tag} "${label}"`
  if (n.domId) return `${tag}#${n.domId}`
  if (n.className) return `${tag}.${n.className.split(' ')[0]}`
  return tag
}

/* eslint-enable @typescript-eslint/no-explicit-any */

export type TimelineKind = 'error' | 'warn' | 'log' | 'info' | 'click' | 'navigate' | 'input'

export interface TimelineItem {
  /** Original event index, so the player can seek to it */
  eventIndex: number
  kind: TimelineKind
  /** Human label, e.g. "Cannot read property 'x' of undefined" */
  message: string
  timestamp: number
}

/** Console levels are themed; clicks/nav are neutral. */
export const KIND_META: Record<TimelineKind, { label: string; color: string; dot: string }> = {
  error:    { label: 'error',    color: 'text-[#f87171]', dot: 'bg-[#f87171]' },
  warn:     { label: 'warn',     color: 'text-[#fbbf24]', dot: 'bg-[#fbbf24]' },
  log:      { label: 'log',      color: 'text-[#94a3b8]', dot: 'bg-[#94a3b8]' },
  info:     { label: 'info',     color: 'text-[#60a5fa]', dot: 'bg-[#60a5fa]' },
  click:    { label: 'click',    color: 'text-[#a78bfa]', dot: 'bg-[#a78bfa]' },
  navigate: { label: 'nav',      color: 'text-[#34d399]', dot: 'bg-[#34d399]' },
  input:    { label: 'input',    color: 'text-[#64748b]', dot: 'bg-[#64748b]' },
}

function consoleLevelToKind(level: string): TimelineKind {
  if (level === 'error' || level === 'assert') return 'error'
  if (level === 'warn') return 'warn'
  if (level === 'info') return 'info'
  return 'log'
}

/** Turn rrweb's serialized console args into a readable single line. */
function formatConsolePayload(payload: unknown): string {
  if (!Array.isArray(payload)) return String(payload ?? '')
  return payload
    .map((p) => {
      if (typeof p !== 'string') return String(p)
      // rrweb wraps strings in extra quotes — strip one layer when present
      if (p.length >= 2 && p.startsWith('"') && p.endsWith('"')) return p.slice(1, -1)
      return p
    })
    .join(' ')
    .trim()
}

/**
 * Extract a Sentry-style breadcrumb timeline from raw rrweb events.
 * Filters out the noise (mutations, mouse moves, snapshots) and keeps
 * console logs/errors, clicks, navigation and inputs.
 */
export function buildTimeline(events: ReplayEvent[]): TimelineItem[] {
  const items: TimelineItem[] = []
  const nodes = indexNodes(events)

  events.forEach((event, eventIndex) => {
    const data = event.data as Record<string, unknown> | undefined

    // Console logs/errors (console plugin)
    if (event.type === PLUGIN && data && typeof data.plugin === 'string' && data.plugin.includes('console')) {
      const payload = data.payload as { level?: string; payload?: unknown } | undefined
      const level = payload?.level ?? 'log'
      const msg = formatConsolePayload(payload?.payload)
      if (msg) {
        items.push({ eventIndex, kind: consoleLevelToKind(level), message: msg, timestamp: event.timestamp })
      }
      return
    }

    // Navigation (Meta event with href)
    if (event.type === META && data && typeof data.href === 'string') {
      items.push({ eventIndex, kind: 'navigate', message: data.href, timestamp: event.timestamp })
      return
    }

    // Clicks and inputs
    if (event.type === INCREMENTAL && data) {
      const source = data.source as number
      if (source === SOURCE_MOUSE_INTERACTION) {
        const t = data.type as number
        if (t === MOUSE_CLICK || t === MOUSE_DBL_CLICK) {
          const verb = t === MOUSE_DBL_CLICK ? 'Double click' : 'Click'
          const target = describeNode(nodes, data.id as number | undefined)
          const message = target ? `${verb} on ${target}` : verb
          items.push({ eventIndex, kind: 'click', message, timestamp: event.timestamp })
        }
      } else if (source === SOURCE_INPUT) {
        const target = describeNode(nodes, data.id as number | undefined)
        const message = target ? `Typed in ${target}` : 'User typed'
        items.push({ eventIndex, kind: 'input', message, timestamp: event.timestamp })
      }
      // mutations / scroll / mouse moves are intentionally dropped as noise
      void SOURCE_MUTATION
    }
  })

  return items
}

/** Count console events by severity — used for the session list badges. */
export function countConsole(items: TimelineItem[]): { errors: number; warnings: number } {
  let errors = 0
  let warnings = 0
  for (const item of items) {
    if (item.kind === 'error') errors++
    else if (item.kind === 'warn') warnings++
  }
  return { errors, warnings }
}
