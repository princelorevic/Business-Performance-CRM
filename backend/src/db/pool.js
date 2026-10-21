import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

export const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: false, // keep DECIMAL as strings for decimal-safe math
  dateStrings: true,     // return DATE/DATETIME as strings, avoid timezone shifts
  timezone: 'Z',
  multipleStatements: false,
});

// Run `fn(conn)` inside a transaction; commits on success, rolls back on any throw.
export async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
