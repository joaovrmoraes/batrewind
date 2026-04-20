import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { useSessions } from '@/queries/sessions'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Clock,
  Globe,
  MonitorPlay,
  Search,
  SlidersHorizontal,
  User,
} from 'lucide-react'
import React from 'react'
import { z } from 'zod'

const LIMIT = 20

const searchSchema = z.object({
  identifier: z.string().optional(),
  service_name: z.string().optional(),
  environment: z.string().optional(),
  page: z.number().optional().default(1),
})

export const Route = createFileRoute('/app/_layout/')({
  validateSearch: searchSchema,
  component: SessionsPage,
})

const ENVIRONMENTS = [
  'production',
  'staging',
  'development',
  'testing',
  'local',
]

const ENV_COLORS: Record<string, string> = {
  production: 'text-[#34d399]',
  staging: 'text-[#60a5fa]',
  development: 'text-[#818cf8]',
  testing: 'text-[#fb923c]',
  local: 'text-muted-foreground',
}

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

function SessionsPage() {
  const navigate = useNavigate({ from: '/app/' })
  const search = Route.useSearch()

  const [identifier, setIdentifier] = React.useState(
    search.identifier ?? ''
  )
  const [serviceName, setServiceName] = React.useState(
    search.service_name ?? ''
  )
  const [environment, setEnvironment] = React.useState(
    search.environment ?? ''
  )
  const [showFilters, setShowFilters] = React.useState(false)

  const page = search.page ?? 1
  const offset = (page - 1) * LIMIT

  const { data, isLoading } = useSessions({
    identifier: search.identifier,
    service_name: search.service_name,
    environment: search.environment,
    limit: LIMIT,
    offset,
  })

  const sessions = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / LIMIT)

  function applyFilters(e: React.FormEvent) {
    e.preventDefault()
    navigate({
      search: {
        identifier: identifier || undefined,
        service_name: serviceName || undefined,
        environment: environment || undefined,
        page: 1,
      },
    })
  }

  function clearFilters() {
    setIdentifier('')
    setServiceName('')
    setEnvironment('')
    navigate({ search: { page: 1 } })
  }

  const hasActiveFilters =
    search.identifier || search.service_name || search.environment

  return (
    <div className="p-6 space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Sessions</h1>
          {total > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {total} session{total !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(v => !v)}
          className="gap-2"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary" />
          )}
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <form
          onSubmit={applyFilters}
          className="bg-card border border-border rounded-lg p-4 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Identifier
              </label>
              <Input
                placeholder="user@example.com or ID"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Service
              </label>
              <Input
                placeholder="web, app, ..."
                value={serviceName}
                onChange={e => setServiceName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Environment
              </label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-input/30"
                value={environment}
                onChange={e => setEnvironment(e.target.value)}
              >
                <option value="">All</option>
                {ENVIRONMENTS.map(env => (
                  <option key={env} value={env}>
                    {env}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="submit" size="sm" className="gap-2">
              <Search className="h-3.5 w-3.5" />
              Apply
            </Button>
            {hasActiveFilters && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={clearFilters}
              >
                Clear
              </Button>
            )}
          </div>
        </form>
      )}

      {/* Sessions list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-lg bg-card border border-border animate-pulse"
            />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <MonitorPlay className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No sessions found</p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-primary mt-1 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map(session => (
            <button
              key={session.id}
              type="button"
              onClick={() =>
                navigate({ to: '/app/sessions/$id', params: { id: session.id } })
              }
              className="w-full text-left bg-card border border-border rounded-lg px-4 py-3 hover:border-primary/50 hover:bg-card/80 transition-colors group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  {/* Identifier + service */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {session.identifier || session.id.slice(0, 8)}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {session.service_name}
                    </Badge>
                    {session.environment && (
                      <span
                        className={`text-xs ${ENV_COLORS[session.environment] ?? ''}`}
                      >
                        {session.environment}
                      </span>
                    )}
                  </div>

                  {/* URL */}
                  {session.start_url && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Globe className="h-3 w-3 shrink-0" />
                      <span className="truncate max-w-xs">
                        {session.start_url}
                      </span>
                    </div>
                  )}
                </div>

                {/* Meta */}
                <div className="shrink-0 text-right space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground justify-end">
                    <Clock className="h-3 w-3" />
                    {formatDuration(session.duration_ms)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(session.started_at)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {session.event_count} events
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() =>
                  navigate({
                    search: prev => ({ ...prev, page: Math.max(1, page - 1) }),
                  })
                }
                aria-disabled={page <= 1}
                className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="px-3 text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={() =>
                  navigate({
                    search: prev => ({
                      ...prev,
                      page: Math.min(totalPages, page + 1),
                    }),
                  })
                }
                aria-disabled={page >= totalPages}
                className={
                  page >= totalPages ? 'pointer-events-none opacity-50' : ''
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
