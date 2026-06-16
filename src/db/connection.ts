import { Pool } from 'pg';

// Create a connection pool using the DATABASE_URL env var.
// The pool is created once and reused across all requests.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Railway's managed Postgres requires SSL in production.
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // Keep a minimum of 2 connections warm; scale up to 10 under load.
  min: 2,
  max: 10,
  // Drop idle connections after 30 s so we don't hold open DB resources.
  idleTimeoutMillis: 30_000,
  // Fail fast if we can't get a connection from the pool within 5 s.
  connectionTimeoutMillis: 5_000,
  // Send TCP keepalives so the OS detects and closes dead connections
  // before pg-pool tries to reuse them (prevents "terminating connection"
  // errors from silently stalling queries on Railway).
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
});

// Propagate unexpected pool errors to stderr rather than crashing the process.
pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

/**
 * Verify the database is reachable by running a trivial query.
 * Called once during server startup.
 */
export async function testConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log('[DB] PostgreSQL connected successfully.');
  } finally {
    client.release();
  }
}

export default pool;
