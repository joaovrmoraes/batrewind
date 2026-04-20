import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSession } from '@/http/sessions/get'
import { getSessionEvents } from '@/http/sessions/events'
import { listSessions } from '@/http/sessions/list'
import {
  listFailedIngest,
  retryAllFailed,
} from '@/http/sessions/failed-ingest'
import type { SessionFilters } from '@/http/sessions/types'

export function useSessions(filters: SessionFilters = {}) {
  return useQuery({
    queryKey: ['sessions', filters],
    queryFn: () => listSessions(filters),
  })
}

export function useSession(id: string) {
  return useQuery({
    queryKey: ['session', id],
    queryFn: () => getSession(id),
    enabled: !!id,
  })
}

export function useSessionEvents(id: string) {
  return useQuery({
    queryKey: ['session-events', id],
    queryFn: () => getSessionEvents(id),
    enabled: !!id,
  })
}

export function useFailedIngest() {
  return useQuery({
    queryKey: ['failed-ingest'],
    queryFn: listFailedIngest,
    refetchInterval: 30_000,
  })
}

export function useRetryAllFailed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: retryAllFailed,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['failed-ingest'] })
      qc.invalidateQueries({ queryKey: ['sessions'] })
    },
  })
}
