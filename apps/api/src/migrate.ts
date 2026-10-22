import { readFile, readdir } from 'node:fs/promises';
import { createPool, transaction } from './db.js';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const pool = createPool(process.env.DATABASE_URL);
try {
  await transaction(pool, async db => {
    await db.query('SELECT pg_advisory_xact_lock(726431)');
    await db.query('CREATE TABLE IF NOT EXISTS schema_migrations(version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const directory = new URL('../migrations/', import.meta.url);
    for (const file of (await readdir(directory)).filter(name => /^\d+_[a-z_]+\.sql$/.test(name)).sort()) {
      const version = file.slice(0, -4);
      if (!(await db.query('SELECT version FROM schema_migrations WHERE version=$1', [version])).rows.length) {
        await db.query(await readFile(new URL(file, directory), 'utf8'));
        await db.query('INSERT INTO schema_migrations(version) VALUES($1)', [version]);
      }
    }
  });
  console.log('Database migrations complete.');
} finally { await pool.end(); }
