import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * Database connection health check
 * Tests the database connection pool availability
 */
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy'
  message: string
  timestamp: string
  details?: {
    poolSize?: number
    error?: string
  }
}> {
  const timestamp = new Date().toISOString()

  try {
    // Get Payload instance to access database
    const payload = await getPayload({ config })

    // Test database connection by executing a simple query
    // This will use the connection pool
    await payload.find({
      collection: 'users',
      limit: 1,
      // Use a query that won't fail even if no users exist
      where: {
        id: {
          not_equals: '000000000000000000000000', // Non-existent ID
        },
      },
    })

    return {
      status: 'healthy',
      message: 'Database connection pool is available and responsive',
      timestamp,
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown database error'

    // Don't expose internal database details to clients
    const safeMessage =
      errorMessage.includes('timeout') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ENOTFOUND')
        ? 'Database connection unavailable. Please check your connection string and ensure the database server is running.'
        : 'Database operation failed. Please contact support if the issue persists.'

    return {
      status: 'unhealthy',
      message: safeMessage,
      timestamp,
      details: {
        error: errorMessage, // Only for server-side logging
      },
    }
  }
}
