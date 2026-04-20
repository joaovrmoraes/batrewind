import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './ui/button'
import { useFailedIngest, useRetryAllFailed } from '@/queries/sessions'

export function FailedIngestBanner() {
  const { data: failed = [] } = useFailedIngest()
  const retryAll = useRetryAllFailed()

  const unresolved = failed.filter(f => !f.resolved)
  if (unresolved.length === 0) return null

  return (
    <div className="bg-destructive/10 border-b border-destructive/30 px-6 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-destructive text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          <strong>{unresolved.length}</strong> batch
          {unresolved.length !== 1 ? 'es' : ''} failed to ingest and may be
          missing from sessions.
        </span>
      </div>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => retryAll.mutate()}
        disabled={retryAll.isPending}
        className="gap-2 shrink-0"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        {retryAll.isPending ? 'Retrying...' : 'Retry all'}
      </Button>
    </div>
  )
}
