import type { ClientMeta } from './types'

/**
 * Collect non-sensitive client/device metadata for the session.
 *
 * This reads only ambient browser properties (screen size, viewport, language,
 * timezone, user-agent) — no cookies, storage, or anything user-typed. It's
 * sent once per session so the dashboard can group/filter replays by device.
 * The server clamps and re-derives browser/OS from these values, so nothing
 * here is trusted as-is. Disable entirely with `captureClientMetadata: false`.
 */
export function collectClientMeta(): ClientMeta {
  const nav = typeof navigator !== 'undefined' ? navigator : ({} as Navigator)
  const scr = typeof screen !== 'undefined' ? screen : ({} as Screen)

  let timezone = ''
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''
  } catch {
    timezone = ''
  }

  return {
    screen_width:       scr.width ?? 0,
    screen_height:      scr.height ?? 0,
    viewport_width:     typeof window !== 'undefined' ? window.innerWidth : 0,
    viewport_height:    typeof window !== 'undefined' ? window.innerHeight : 0,
    device_pixel_ratio: typeof window !== 'undefined' ? window.devicePixelRatio ?? 1 : 1,
    language:           nav.language ?? '',
    timezone,
    user_agent:         nav.userAgent ?? '',
  }
}
