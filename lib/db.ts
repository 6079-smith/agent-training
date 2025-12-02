import { Pool, QueryResult, QueryResultRow } from 'pg'

// Singleton Postgres pool using DATABASE_URL from environment
let _pool: Pool | null = null

export function getPool(): Pool {
  if (_pool) return _pool
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('POSTGRES_URL or DATABASE_URL is not set in environment')
  }
  _pool = new Pool({ connectionString, max: 5 })
  return _pool
}

/**
 * Execute a query and return all rows
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const pool = getPool()
  const start = Date.now()
  try {
    const result = await pool.query<T>(text, params)
    const duration = Date.now() - start
    if (process.env.NODE_ENV === 'development') {
      console.log('[DB Query]', { text, duration: `${duration}ms`, rows: result.rowCount })
    }
    return result
  } catch (error) {
    console.error('[DB Error]', { text, params, error })
    throw error
  }
}

/**
 * Execute a query and return a single row (or null)
 */
export async function queryOne<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const result = await query<T>(text, params)
  return result.rows[0] || null
}

/**
 * Execute a query and return all rows as an array
 */
export async function queryMany<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const result = await query<T>(text, params)
  return result.rows
}

/**
 * Execute a statement without returning rows (INSERT, UPDATE, DELETE)
 * Returns the number of affected rows
 */
export async function execute(
  text: string,
  params?: any[]
): Promise<number> {
  const result = await query(text, params)
  return result.rowCount || 0
}

/**
 * Check if database connection is healthy
 */
export async function healthCheck(): Promise<{
  healthy: boolean
  message: string
  latency?: number
}> {
  try {
    const start = Date.now()
    await query('SELECT 1')
    const latency = Date.now() - start
    return { healthy: true, message: 'Database connection OK', latency }
  } catch (error) {
    return {
      healthy: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Execute a function within a database transaction
 */
export async function withTransaction<T>(
  fn: (client: import('pg').PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch {}
    throw err
  } finally {
    client.release()
  }
}

/**
 * Get connection pool statistics
 */
export function getPoolStats() {
  const pool = _pool
  if (!pool) return null
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  }
}
