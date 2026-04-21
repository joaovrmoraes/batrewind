import { fetchWithAuth } from '@/lib/api'
import type { Stats } from './types'

export async function getStats(): Promise<Stats> {
  const res = await fetchWithAuth(
    `${import.meta.env.VITE_API_URL ?? ''}/v1/stats`
  )
  if (!res.ok) throw new Error('Failed to fetch stats')
  return res.json()
}
