import { NextResponse } from 'next/server'
import { checkDatabaseHealth } from '@/lib/health-check'

/**
 * Health check endpoint
 * GET /api/health
 *
 * Returns the status of the database connection
 */
export async function GET() {
  try {
    const health = await checkDatabaseHealth()

    return NextResponse.json(health, {
      status: health.status === 'healthy' ? 200 : 503,
    })
  } catch (error) {
    console.error('[api/health] Unexpected error:', error)
    return NextResponse.json(
      {
        status: 'unhealthy' as const,
        message: 'Health check failed unexpectedly',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
