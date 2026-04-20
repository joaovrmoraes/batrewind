import { fetchWithAuth } from '@/lib/api'
import type { FailedIngest } from './types'

export async function listFailedIngest(): Promise<FailedIngest[]> {
  const res = await fetchWithAuth(
    `${import.meta.env.VITE_API_URL ?? ''}/v1/failed-ingest`
  )
  if (!res.ok) throw new Error('Failed to fetch failed ingests')
  return res.json()
}

export async function retryAllFailed(): Promise<{ retried: number }> {
  const res = await fetchWithAuth(
    `${import.meta.env.VITE_API_URL ?? ''}/v1/failed-ingest/retry-all`,
    { method: 'POST' }
  )
  if (!res.ok) throw new Error('Failed to retry')
  return res.json()
}
