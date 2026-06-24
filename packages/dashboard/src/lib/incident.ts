import type { ReplayEvent, ReplaySession } from '@/http/sessions/types'
import { buildTimeline, countConsole, type TimelineItem } from './timeline'

const MAX_MSG = 300

function clip(s: string): string {
  const oneLine = s.replace(/\s+/g, ' ').trim()
  return oneLine.length > MAX_MSG ? oneLine.slice(0, MAX_MSG) + '…' : oneLine
}

function fmtDuration(ms: number | null): string {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const m = Math.floor(ms / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  return `${m}m ${s}s`
}

function rel(ts: number, start: number): string {
  return `+${((ts - start) / 1000).toFixed(1)}s`
}

const LABEL: Record<TimelineItem['kind'], string> = {
  error: 'error',
  warn: 'warn',
  log: 'log',
  info: 'info',
  click: 'click',
  navigate: 'nav',
  input: 'input',
}

/**
 * Build a plain-text, LLM-friendly incident report for a session — paste it into
 * an AI assistant (with the project open) so it can understand what the user did
 * and where it broke. Mirrors the timeline + console + context an engineer would
 * read from the replay.
 */
export function buildIncidentReport(session: ReplaySession, events: ReplayEvent[]): string {
  const timeline = buildTimeline(events)
  const { errors, warnings } = countConsole(timeline)
  const start = events[0]?.timestamp ?? 0

  const trigger =
    session.trigger === 'manual' ? 'reported' : session.trigger || 'unknown'

  // Last navigation URL seen, falling back to the recorded start URL.
  const lastNav = [...timeline].reverse().find((t) => t.kind === 'navigate')?.message
  const startUrl = session.start_url || timeline.find((t) => t.kind === 'navigate')?.message || '—'

  const lines: string[] = []
  lines.push(`# BatRewind incident — ${session.service_name} (${session.environment})`)
  lines.push('')
  lines.push(`- Session: ${session.id}`)
  lines.push(`- User: ${session.identifier || '—'}`)
  lines.push(`- Trigger: ${trigger}`)
  lines.push(`- Started: ${new Date(session.started_at).toISOString()}`)
  lines.push(`- Duration: ${fmtDuration(session.duration_ms)}`)
  lines.push(`- Events: ${session.event_count} · Errors: ${errors} · Warnings: ${warnings}`)
  lines.push(`- Start URL: ${startUrl}`)
  if (lastNav && lastNav !== startUrl) lines.push(`- Last URL: ${lastNav}`)

  lines.push('')
  lines.push('## Timeline (relative to session start)')
  if (timeline.length === 0) {
    lines.push('(no user actions captured)')
  } else {
    for (const item of timeline) {
      lines.push(`${rel(item.timestamp, start)}\t${LABEL[item.kind]}\t${clip(item.message)}`)
    }
  }

  const consoleItems = timeline.filter((t) =>
    ['error', 'warn', 'log', 'info'].includes(t.kind),
  )
  if (consoleItems.length > 0) {
    lines.push('')
    lines.push('## Console')
    for (const item of consoleItems) {
      lines.push(`[${LABEL[item.kind]}] ${rel(item.timestamp, start)} ${clip(item.message)}`)
    }
  }

  lines.push('')
  lines.push('---')
  lines.push(
    'This is a recorded user session (session replay). It describes what the user did and where it broke. Use it with the project source open to locate the cause.',
  )

  return lines.join('\n')
}
