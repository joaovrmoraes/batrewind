import type { ReplayEvent } from '@/http/sessions/types'

// Redacted session returned by the public share endpoint — no identity, no URL.
export interface PublicSession {
  id: string
  service_name: string
  environment: string
  started_at: string
  duration_ms: number | null
  event_count: number
}

const base = import.meta.env.VITE_API_URL ?? ''

// Plain fetch — public endpoints take no auth header.
export async function getPublicSession(token: string): Promise<PublicSession> {
  const res = await fetch(`${base}/v1/public/sessions/${token}`)
  if (!res.ok) throw new Error('Replay not found')
  return res.json()
}

export async function getPublicSessionEvents(token: string): Promise<ReplayEvent[]> {
  const res = await fetch(`${base}/v1/public/sessions/${token}/events`)
  if (!res.ok) throw new Error('Failed to fetch replay')
  return res.json()
}
