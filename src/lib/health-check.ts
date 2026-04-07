import { createServerClient } from '@/lib/supabase/server'

export type HealthCheckPayload = {
  status: 'healthy' | 'unhealthy'
  message: string
  timestamp: string
}

/**
 * Database connection health check via Supabase (Postgres).
 * Client-visible payloads are generic only; log failures server-side.
 */
export async function checkDatabaseHealth(): Promise<HealthCheckPayload> {
  const timestamp = new Date().toISOString()

  try {
    const supabase = await createServerClient()
    const { error } = await supabase.from('bookings').select('id').limit(1)

    if (error) {
      console.error('[health-check] Supabase query failed:', error)
      return {
        status: 'unhealthy',
        message: 'Unable to verify database connectivity.',
        timestamp,
      }
    }

    return {
      status: 'healthy',
      message: 'Database connection is available and responsive',
      timestamp,
    }
  } catch (error) {
    console.error('[health-check] Database health check failed:', error)
    return {
      status: 'unhealthy',
      message: 'Unable to verify database connectivity.',
      timestamp,
    }
  }
}
