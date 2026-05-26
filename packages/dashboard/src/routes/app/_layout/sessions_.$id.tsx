import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useSession, useSessionEvents } from '@/queries/sessions'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Clock, Globe, User } from 'lucide-react'
import React from 'react'
import RRWebPlayer from 'rrweb-player'
import 'rrweb-player/dist/style.css'

export const Route = createFileRoute('/app/_layout/sessions_/$id' as any)({
  component: PlayerPage,
})

const RRWEB_TYPE_LABELS: Record<number, string> = {
  1: 'DomContentLoaded',
  2: 'FullSnapshot',
  3: 'IncrementalSnapshot',
  4: 'Meta',
  5: 'Custom',
  6: 'Plugin',
}

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

function typeColor(type: number): string {
  if (type === 2) return 'text-[#818cf8]'
  if (type === 3) return 'text-[#94a3b8]'
  return 'text-[#60a5fa]'
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

  React.useEffect(() => {
    if (!playerRef.current || events.length === 0) return

    playerInstance.current?.destroy?.()

    playerInstance.current = new RRWebPlayer({
      target: playerRef.current,
      props: {
        events,
        width: playerRef.current.clientWidth || 800,
        height: 450,
        autoPlay: false,
        showController: true,
        speedOption: [1, 2, 4, 8],
      },
    })

    return () => {
      playerInstance.current?.destroy?.()
    }
  }, [events])

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-40 rounded bg-card animate-pulse" />
        <div className="h-[450px] rounded-lg bg-card animate-pulse" />
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
      {/* Back + title */}
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
      </div>

      {/* Session meta */}
      <div className="bg-card border border-border rounded-lg px-4 py-3 flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5 text-foreground font-medium">
          <User className="h-4 w-4 text-muted-foreground" />
          {session.identifier || session.id.slice(0, 8)}
        </div>

        <Badge variant="secondary">{session.service_name}</Badge>

        {session.environment && (
          <span className="text-xs text-muted-foreground">
            {session.environment}
          </span>
        )}

        {session.start_url && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
            <Globe className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate max-w-xs">{session.start_url}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
          <Clock className="h-3.5 w-3.5" />
          {formatDuration(session.duration_ms)} &middot;{' '}
          {formatTime(session.started_at)}
        </div>
      </div>

      {/* Player + timeline */}
      <div className="flex gap-4 items-start">
        {/* Player */}
        <div className="flex-1 min-w-0">
          {events.length === 0 ? (
            <div className="flex items-center justify-center h-[450px] bg-card border border-border rounded-lg text-sm text-muted-foreground">
              No events recorded for this session.
            </div>
          ) : (
            <div
              ref={playerRef}
              className="w-full rounded-lg overflow-hidden border border-border"
            />
          )}
        </div>

        {/* Timeline */}
        <div className="w-72 shrink-0 bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium text-foreground">
              Events
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                {events.length}
              </span>
            </p>
          </div>
          <div className="overflow-y-auto max-h-[410px]">
            {events.map(event => (
              <div
                key={event.id}
                className="flex items-start gap-3 px-4 py-2.5 border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors"
              >
                <div className="mt-0.5 shrink-0">
                  <span
                    className={`text-xs font-mono ${typeColor(event.type)}`}
                  >
                    T{event.type}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-foreground truncate">
                    {RRWEB_TYPE_LABELS[event.type] ?? `Type ${event.type}`}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {new Date(event.timestamp).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      fractionalSecondDigits: 3,
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
