import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useStats } from '@/queries/sessions'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Activity,
  AlertTriangle,
  Clock,
  Globe,
  MonitorPlay,
  Server,
  User,
} from 'lucide-react'

export const Route = createFileRoute('/app/_layout/')({
  component: DashboardPage,
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

function StatCard({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  highlight?: boolean
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {label}
          </CardTitle>
          <Icon
            className={`h-4 w-4 ${highlight ? 'text-destructive' : 'text-muted-foreground'}`}
          />
        </div>
      </CardHeader>
      <CardContent>
        <p
          className={`text-3xl font-bold ${highlight ? 'text-destructive' : 'text-foreground'}`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

function DashboardPage() {
  const navigate = useNavigate()
  const { data: stats, isLoading } = useStats()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Session replay metrics
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-xl bg-card border border-border animate-pulse"
            />
          ))
        ) : (
          <>
            <StatCard
              label="Total sessions"
              value={stats?.total_sessions ?? 0}
              icon={MonitorPlay}
            />
            <StatCard
              label="Today"
              value={stats?.sessions_today ?? 0}
              icon={Activity}
            />
            <StatCard
              label="This week"
              value={stats?.sessions_this_week ?? 0}
              icon={Clock}
            />
            <StatCard
              label="Failed ingests"
              value={stats?.failed_ingest_count ?? 0}
              icon={AlertTriangle}
              highlight={(stats?.failed_ingest_count ?? 0) > 0}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent sessions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-sm font-medium">
                Recent sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-12 rounded bg-secondary animate-pulse"
                    />
                  ))}
                </div>
              ) : !stats?.recent_sessions?.length ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <MonitorPlay className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No sessions yet
                  </p>
                </div>
              ) : (
                stats.recent_sessions.map(session => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() =>
                      navigate({
                        to: '/app/sessions/$id',
                        params: { id: session.id },
                      })
                    }
                    className="w-full flex items-center justify-between px-6 py-3 border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">
                          {session.identifier || session.id.slice(0, 8)}
                        </p>
                        {session.start_url && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Globe className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[200px]">
                              {session.start_url}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right ml-4">
                      <p className="text-xs text-muted-foreground">
                        {formatTime(session.started_at)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDuration(session.duration_ms)}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Active services */}
        <div>
          <Card>
            <CardHeader className="border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">
                  Active services
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-6 rounded bg-secondary animate-pulse"
                    />
                  ))}
                </div>
              ) : !stats?.active_services?.length ? (
                <p className="text-sm text-muted-foreground">No services yet</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {stats.active_services.map(svc => (
                    <Badge key={svc} variant="secondary">
                      {svc}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
