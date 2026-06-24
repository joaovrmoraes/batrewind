import { fetchWithAuth } from '@/lib/api'

/** Create (or fetch the existing) public share token for a session. */
export async function createShareLink(id: string): Promise<string> {
  const res = await fetchWithAuth(
    `${import.meta.env.VITE_API_URL ?? ''}/v1/sessions/${id}/share`,
    { method: 'POST' }
  )
  if (!res.ok) throw new Error('Failed to create share link')
  const { token } = (await res.json()) as { token: string }
  return token
}
