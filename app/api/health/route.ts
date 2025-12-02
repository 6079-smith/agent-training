import { NextResponse } from 'next/server'
import { healthCheck, getPoolStats, queryMany } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Debug: Check if DATABASE_URL is loaded
    const hasDbUrl = !!process.env.DATABASE_URL
    const dbUrlStart = process.env.DATABASE_URL?.substring(0, 30)
    
    // Check database connection
    const dbHealth = await healthCheck()

    if (!dbHealth.healthy) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          database: dbHealth,
          debug: {
            hasDbUrl,
            dbUrlStart,
          },
        },
        { status: 503 }
      )
    }

    // Get table information
    const tables = await queryMany<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    )

    // Get pool statistics
    const poolStats = getPoolStats()

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        latency: dbHealth.latency,
        tables: tables.map((t) => t.tablename),
        tableCount: tables.length,
      },
      pool: poolStats,
    })
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
