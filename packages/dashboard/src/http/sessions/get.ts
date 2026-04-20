import { fetchWithAuth } from '@/lib/api'
import type { ReplaySession } from './types'

export async function getSession(id: string): Promise<ReplaySession> {
  const res = await fetchWithAuth(
    `${import.meta.env.VITE_API_URL ?? ''}/v1/sessions/${id}`
  )
  if (!res.ok) throw new Error('Session not found')
  return res.json()
}
