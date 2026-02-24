import pg from 'pg';
import dotenv from 'dotenv';
import { buildQueryErrorLog, buildQueryLog } from './logging.js';

dotenv.config();

const { Pool } = pg;

// Create PostgreSQL connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('Database connection established');
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

// Query helper function
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', buildQueryLog(text, duration, result.rowCount || 0, process.env.NODE_ENV));
    return result;
  } catch (error) {
    console.error('Database query error:', buildQueryErrorLog(text, error, process.env.NODE_ENV));
    throw error;
  }
};

// Test connection immediately
(async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Database connection test successful:', result.rows[0]);
  } catch (error) {
    console.error('Database connection test failed:', error);
  }
})();
