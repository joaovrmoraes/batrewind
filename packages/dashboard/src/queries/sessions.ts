import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSession } from '@/http/sessions/get'
import { getSessionEvents } from '@/http/sessions/events'
import { createShareLink } from '@/http/sessions/share'
import { deleteSession } from '@/http/sessions/delete'
import {
  getPublicSession,
  getPublicSessionEvents,
} from '@/http/public/session'
import { listSessions } from '@/http/sessions/list'
import { getStats } from '@/http/sessions/stats'
import {
  listFailedIngest,
  retryAllFailed,
} from '@/http/sessions/failed-ingest'
import type { SessionFilters } from '@/http/sessions/types'

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
    refetchInterval: 30_000,
  })
}

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

export function useCreateShareLink() {
  return useMutation({
    mutationFn: (id: string) => createShareLink(id),
  })
}

export function useDeleteSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSession(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

export function usePublicSession(token: string) {
  return useQuery({
    queryKey: ['public-session', token],
    queryFn: () => getPublicSession(token),
    enabled: !!token,
  })
}

export function usePublicSessionEvents(token: string) {
  return useQuery({
    queryKey: ['public-session-events', token],
    queryFn: () => getPublicSessionEvents(token),
    enabled: !!token,
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
