import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useSession, useSessionEvents, useCreateShareLink, useDeleteSession } from '@/queries/sessions'
import { buildTimeline, countConsole, KIND_META } from '@/lib/timeline'
import { buildIncidentReport } from '@/lib/incident'
import type { ReplayEvent, ReplaySession } from '@/http/sessions/types'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AlertTriangle, ArrowLeft, Check, Clock, Globe, Languages, Link2, Monitor, MousePointerClick, Smartphone, Sparkles, Tablet, Terminal, Trash2, User } from 'lucide-react'
import React from 'react'
import RRWebPlayer from 'rrweb-player'
import 'rrweb-player/dist/style.css'

export const Route = createFileRoute('/app/_layout/sessions_/$id')({
  component: PlayerPage,
})

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatDuration(ms: number | null): string {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const m = Math.floor(ms / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  return `${m}m ${s}s`
}

function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function PlayerPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const playerRef = React.useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerInstance = React.useRef<any>(null)

  const { data: session, isLoading: sessionLoading } = useSession(id)
  const { data: events = [], isLoading: eventsLoading } = useSessionEvents(id)

  const isLoading = sessionLoading || eventsLoading

  const timeline = React.useMemo(() => buildTimeline(events), [events])
  const { errors, warnings } = React.useMemo(() => countConsole(timeline), [timeline])
  const firstTs = events[0]?.timestamp ?? 0

  React.useEffect(() => {
    if (!playerRef.current || events.length === 0) return

    playerInstance.current?.destroy?.()
    playerRef.current.innerHTML = ''

    playerInstance.current = new RRWebPlayer({
      target: playerRef.current,
      props: {
        events,
        width: playerRef.current.clientWidth || 800,
        height: 440,
        autoPlay: false,
        showController: true,
        speedOption: [1, 2, 4, 8],
      },
    })

    return () => {
      playerInstance.current?.destroy?.()
    }
  }, [events])

  // Move the player to the moment an event happened (Sentry-style click-to-seek)
  const seekTo = React.useCallback(
    (ts: number) => {
      const offset = Math.max(0, ts - firstTs)
      playerInstance.current?.goto?.(offset)
    },
    [firstTs],
  )

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-40 rounded bg-card animate-pulse" />
        <div className="h-[440px] rounded-lg bg-card animate-pulse" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Session not found.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      {/* Back + share */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: '/app/sessions' })}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Sessions
        </Button>

        <CopyForAIButton session={session} events={events} />
        <ShareButton id={session.id} />
        <DeleteButton id={session.id} onDeleted={() => navigate({ to: '/app/sessions' })} />
      </div>

      {/* Session meta */}
      <div className="bg-card border border-border rounded-lg px-4 py-3 flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5 text-foreground font-medium">
          <User className="h-4 w-4 text-muted-foreground" />
          {session.identifier || session.id.slice(0, 8)}
        </div>

        <Badge variant="secondary">{session.service_name}</Badge>

        {session.trigger && (
          <Badge
            variant="outline"
            className={
              session.trigger === 'error'
                ? 'border-[#f87171]/40 text-[#f87171]'
                : session.trigger === 'manual'
                  ? 'border-[#f59e0b]/40 text-[#f59e0b]'
                  : 'border-border text-muted-foreground'
            }
          >
            {session.trigger === 'manual' ? 'reported' : session.trigger}
          </Badge>
        )}

        {errors > 0 && (
          <span className="flex items-center gap-1 text-xs text-[#f87171]">
            <AlertTriangle className="h-3.5 w-3.5" />
            {errors} error{errors !== 1 ? 's' : ''}
          </span>
        )}

        {session.environment && (
          <span className="text-xs text-muted-foreground">{session.environment}</span>
        )}

        {session.start_url && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
            <Globe className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate max-w-xs">{session.start_url}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
          <Clock className="h-3.5 w-3.5" />
          {formatDuration(session.duration_ms)} &middot; {formatTime(session.started_at)}
        </div>
      </div>

      {/* Device & browser metadata */}
      <DeviceMeta session={session} />

      {/* Player + breadcrumb timeline */}
      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0 space-y-4">
          {events.length === 0 ? (
            <div className="flex items-center justify-center h-[440px] bg-card border border-border rounded-lg text-sm text-muted-foreground">
              No events recorded for this session.
            </div>
          ) : (
            <div ref={playerRef} className="w-full rounded-lg overflow-hidden border border-border" />
          )}

          {/* Console panel — Sentry style */}
          <ConsolePanel
            items={timeline.filter((t) => ['error', 'warn', 'log', 'info'].includes(t.kind))}
            errors={errors}
            warnings={warnings}
            onSeek={seekTo}
          />
        </div>

        {/* Breadcrumb timeline (all actions) */}
        <div className="w-80 shrink-0 bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              Timeline
              <span className="ml-2 text-xs text-muted-foreground font-normal">{timeline.length}</span>
            </p>
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            {timeline.length === 0 ? (
              <p className="px-4 py-6 text-xs text-muted-foreground text-center">
                No user actions captured.
              </p>
            ) : (
              timeline.map((item, i) => {
                const meta = KIND_META[item.kind]
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => seekTo(item.timestamp)}
                    className="w-full text-left flex items-start gap-3 px-4 py-2.5 border-b border-border/50 last:border-0 hover:bg-secondary/40 transition-colors"
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-medium ${meta.color}`}>{meta.label}</p>
                      <p className="text-xs text-foreground/90 truncate">{item.message}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0 mt-0.5">
                      +{formatDuration(item.timestamp - firstTs)}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function DeviceMeta({ session }: { session: ReplaySession }) {
  const hasMeta =
    session.browser || session.os || session.screen_width || session.language || session.timezone
  if (!hasMeta) return null

  const DeviceIcon =
    session.device_type === 'mobile' ? Smartphone : session.device_type === 'tablet' ? Tablet : Monitor

  const items: { icon: React.ReactNode; label: string }[] = []
  if (session.browser) {
    items.push({
      icon: <Globe className="h-3.5 w-3.5" />,
      label: session.browser_version ? `${session.browser} ${session.browser_version.split('.')[0]}` : session.browser,
    })
  }
  if (session.os) items.push({ icon: <DeviceIcon className="h-3.5 w-3.5" />, label: session.os })
  if (session.screen_width && session.screen_height) {
    const dpr = session.device_pixel_ratio && session.device_pixel_ratio !== 1 ? ` @${session.device_pixel_ratio}x` : ''
    items.push({ icon: <Monitor className="h-3.5 w-3.5" />, label: `${session.screen_width}×${session.screen_height}${dpr}` })
  }
  if (session.viewport_width && session.viewport_height) {
    items.push({ icon: <Tablet className="h-3.5 w-3.5" />, label: `${session.viewport_width}×${session.viewport_height} viewport` })
  }
  if (session.language) items.push({ icon: <Languages className="h-3.5 w-3.5" />, label: session.language })
  if (session.timezone) items.push({ icon: <Clock className="h-3.5 w-3.5" />, label: session.timezone })

  return (
    <div className="bg-card border border-border rounded-lg px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5 text-foreground font-medium">
        <DeviceIcon className="h-3.5 w-3.5 text-muted-foreground" />
        Device
      </span>
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {it.icon}
          {it.label}
        </span>
      ))}
    </div>
  )
}

function CopyForAIButton({ session, events }: { session: ReplaySession; events: ReplayEvent[] }) {
  const [copied, setCopied] = React.useState(false)

  async function handleCopy() {
    const report = buildIncidentReport(session, events)
    try {
      await navigator.clipboard.writeText(report)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      // clipboard blocked — keep the UI quiet
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="gap-2 ml-auto border-[#f59e0b]/40 text-[#f59e0b] hover:bg-[#f59e0b]/10 hover:text-[#f59e0b]"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-[#34d399]" />
          Copied
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          Copy for AI
        </>
      )}
    </Button>
  )
}

function ShareButton({ id }: { id: string }) {
  const { mutateAsync, isPending } = useCreateShareLink()
  const [copied, setCopied] = React.useState(false)

  async function handleShare() {
    try {
      const token = await mutateAsync(id)
      const url = `${window.location.origin}/share/${token}`
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      // surfaced by the mutation; keep the UI quiet
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleShare}
      disabled={isPending}
      className="gap-2"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-[#34d399]" />
          Link copied
        </>
      ) : (
        <>
          <Link2 className="h-4 w-4" />
          {isPending ? 'Generating…' : 'Share replay'}
        </>
      )}
    </Button>
  )
}

function DeleteButton({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const { mutateAsync, isPending } = useDeleteSession()

  async function handleDelete() {
    if (!window.confirm('Permanently delete this session and all its events? This cannot be undone.')) {
      return
    }
    try {
      await mutateAsync(id)
      onDeleted()
    } catch {
      // surfaced by the mutation; keep the UI quiet
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDelete}
      disabled={isPending}
      className="gap-2 border-[#f87171]/40 text-[#f87171] hover:bg-[#f87171]/10 hover:text-[#f87171]"
    >
      <Trash2 className="h-4 w-4" />
      {isPending ? 'Deleting…' : 'Delete'}
    </Button>
  )
}

function ConsolePanel({
  items,
  errors,
  warnings,
  onSeek,
}: {
  items: ReturnType<typeof buildTimeline>
  errors: number
  warnings: number
  onSeek: (ts: number) => void
}) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
        <Terminal className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Console</p>
        <div className="ml-auto flex items-center gap-3 text-xs">
          {errors > 0 && <span className="text-[#f87171]">{errors} error{errors !== 1 ? 's' : ''}</span>}
          {warnings > 0 && <span className="text-[#fbbf24]">{warnings} warn{warnings !== 1 ? 's' : ''}</span>}
          <span className="text-muted-foreground">{items.length} log{items.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto font-mono text-xs">
        {items.length === 0 ? (
          <p className="px-4 py-6 text-muted-foreground text-center">No console output.</p>
        ) : (
          items.map((item, i) => {
            const meta = KIND_META[item.kind]
            return (
              <button
                key={i}
                type="button"
                onClick={() => onSeek(item.timestamp)}
                className="w-full text-left flex items-start gap-3 px-4 py-1.5 border-b border-border/30 last:border-0 hover:bg-secondary/40 transition-colors"
              >
                <span className={`shrink-0 uppercase ${meta.color} w-10`}>{meta.label}</span>
                <span className="flex-1 min-w-0 text-foreground/90 whitespace-pre-wrap break-words">
                  {item.message}
                </span>
                <span className="shrink-0 text-muted-foreground">{formatClock(item.timestamp)}</span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
