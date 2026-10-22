import pg from 'pg';
export interface Database { query(sql: string, params?: unknown[]): Promise<{rows: any[]}>; }
export interface Connection extends Database { release(): void; }
export interface Store extends Database { connect(): Promise<Connection>; }
export function createPool(url: string) { return new pg.Pool({connectionString: url, connectionTimeoutMillis: 5000}); }
export async function transaction<T>(db: Store, fn: (client: Database) => Promise<T>): Promise<T> {
  const client = await db.connect();
  try { await client.query('BEGIN'); const result = await fn(client); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
