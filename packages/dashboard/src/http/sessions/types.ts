export interface ReplaySession {
  id: string
  bat_session_id: string
  identifier: string
  user_email: string
  user_name: string
  start_url: string
  environment: string
  service_name: string
  started_at: string
  ended_at: string | null
  duration_ms: number | null
  event_count: number
  created_at: string
}

export interface ReplayEvent {
  id: string
  session_id: string
  seq: number
  type: number
  data: unknown
  timestamp: number
  created_at: string
}

export interface FailedIngest {
  id: string
  session_id: string
  payload: string
  error: string
  retry_count: number
  resolved: boolean
  created_at: string
  resolved_at: string | null
}

export interface SessionListResponse {
  data: ReplaySession[]
  total: number
  limit: number
  offset: number
}

export interface SessionFilters {
  identifier?: string
  service_name?: string
  environment?: string
  start_date?: string
  end_date?: string
  limit?: number
  offset?: number
}
