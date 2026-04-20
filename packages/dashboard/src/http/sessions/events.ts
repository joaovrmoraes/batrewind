import { fetchWithAuth } from '@/lib/api'
import type { ReplayEvent } from './types'

export async function getSessionEvents(id: string): Promise<ReplayEvent[]> {
  const res = await fetchWithAuth(
    `${import.meta.env.VITE_API_URL ?? ''}/v1/sessions/${id}/events`
  )
  if (!res.ok) throw new Error('Failed to fetch events')
  return res.json()
}
