import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { isAuthenticated } from '@/lib/auth'
import { usePublicSession, usePublicSessionEvents } from '@/queries/sessions'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Clock, Lock, MonitorPlay, ShieldCheck } from 'lucide-react'
import React from 'react'
import RRWebPlayer from 'rrweb-player'
import 'rrweb-player/dist/style.css'

export const Route = createFileRoute('/share/$token')({
  component: PublicReplayPage,
})

function formatDuration(ms: number | null): string {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const m = Math.floor(ms / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  return `${m}m ${s}s`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function PublicReplayPage() {
  const { token } = Route.useParams()
  const navigate = useNavigate()
  const playerRef = React.useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerInstance = React.useRef<any>(null)

  const { data: session, isLoading: sessionLoading, isError } = usePublicSession(token)
  const { data: events = [], isLoading: eventsLoading } = usePublicSessionEvents(token)

  const isLoading = sessionLoading || eventsLoading
  const authed = isAuthenticated()

  React.useEffect(() => {
    if (!playerRef.current || events.length === 0) return

    playerInstance.current?.destroy?.()
    playerRef.current.innerHTML = ''

    playerInstance.current = new RRWebPlayer({
      target: playerRef.current,
      props: {
        events,
        width: playerRef.current.clientWidth || 900,
        height: 480,
        autoPlay: false,
        showController: true,
        speedOption: [1, 2, 4, 8],
      },
    })

    return () => {
      playerInstance.current?.destroy?.()
    }
  }, [events])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Branded top bar */}
      <header className="border-b border-border px-6 py-3 flex items-center gap-2">
        <MonitorPlay className="h-5 w-5 text-primary" />
        <span className="font-semibold text-foreground">BatRewind</span>
        <span className="text-xs text-muted-foreground ml-1">shared replay</span>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-6 space-y-4">
        {isError ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Lock className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              This replay link is invalid or has been revoked.
            </p>
          </div>
        ) : isLoading ? (
          <div className="h-[480px] rounded-lg bg-card animate-pulse" />
        ) : (
          <>
            {/* Logged-in users get a door to the full debug view */}
            {authed && session && (
              <div className="flex items-center justify-between gap-4 rounded-lg border border-primary/30 bg-accent px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-accent-foreground">
                  <ShieldCheck className="h-4 w-4" />
                  You&apos;re signed in — open the full debug view with console &amp; identity.
                </div>
                <Button
                  size="sm"
                  onClick={() =>
                    navigate({ to: '/app/sessions/$id', params: { id: session.id } })
                  }
                >
                  Open debug view
                </Button>
              </div>
            )}

            {/* Minimal, redacted metadata */}
            {session && (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <Badge variant="secondary">{session.service_name}</Badge>
                {session.environment && (
                  <span className="text-xs text-muted-foreground">{session.environment}</span>
                )}
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDuration(session.duration_ms)} &middot; {formatTime(session.started_at)}
                </span>
              </div>
            )}

            {/* Player */}
            {events.length === 0 ? (
              <div className="flex items-center justify-center h-[480px] bg-card border border-border rounded-lg text-sm text-muted-foreground">
                No replay events available.
              </div>
            ) : (
              <div ref={playerRef} className="w-full rounded-lg overflow-hidden border border-border" />
            )}

            <p className="text-center text-xs text-muted-foreground pt-2">
              Sensitive data (console logs, user identity) is hidden on shared links.
            </p>
          </>
        )}
      </main>
    </div>
  )
}
