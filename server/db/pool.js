import pg from 'pg';

// BIGINT ids come back as numbers (safe: ids stay far below 2^53).
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number.parseInt(v, 10));

function sslConfig() {
  if (process.env.DATABASE_SSL === 'disable') return false; // local Postgres only
  if (process.env.DATABASE_CA_CERT) {
    // Strongest option: paste Supabase's CA certificate into this env var.
    return { ca: process.env.DATABASE_CA_CERT.replace(/\\n/g, '\n') };
  }
  // Encrypted, but the certificate chain is not verified.
  return { rejectUnauthorized: false };
}

export function createPool(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  const pool = new pg.Pool({
    connectionString,
    ssl: sslConfig(),
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  // An idle client losing its connection must not crash the server.
  pool.on('error', (err) => console.error('[db] idle client error:', err.message));
  return pool;
}
