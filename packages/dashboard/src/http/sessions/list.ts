import { fetchWithAuth } from '@/lib/api'
import type { SessionFilters, SessionListResponse } from './types'

export async function listSessions(
  filters: SessionFilters = {}
): Promise<SessionListResponse> {
  const params = new URLSearchParams()
  if (filters.identifier) params.set('identifier', filters.identifier)
  if (filters.service_name) params.set('service_name', filters.service_name)
  if (filters.environment) params.set('environment', filters.environment)
  if (filters.start_date) params.set('start_date', filters.start_date)
  if (filters.end_date) params.set('end_date', filters.end_date)
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.offset) params.set('offset', String(filters.offset))

  const res = await fetchWithAuth(
    `${import.meta.env.VITE_API_URL ?? ''}/v1/sessions?${params}`
  )
  if (!res.ok) throw new Error('Failed to fetch sessions')
  return res.json()
}
