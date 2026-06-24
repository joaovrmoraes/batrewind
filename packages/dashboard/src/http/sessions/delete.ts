import { fetchWithAuth } from '@/lib/api'

/** Permanently delete a session and all its events (LGPD/GDPR erasure). */
export async function deleteSession(id: string): Promise<void> {
  const res = await fetchWithAuth(
    `${import.meta.env.VITE_API_URL ?? ''}/v1/sessions/${id}`,
    { method: 'DELETE' }
  )
  if (!res.ok) throw new Error('Failed to delete session')
}
