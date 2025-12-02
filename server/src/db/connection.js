import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.NEON_DATABASE_URL);

export const pool = {
  query: async (text, params) => {
    const rows = await sql(text, params || []);
    return { rows, rowCount: rows.length };
  },
  end: async () => {}
};

export async function testConnection() {
  try {
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection error:', error.message);
    return false;
  }
}

export async function query(text, params) {
  const start = Date.now();
  try {
    const rows = await sql(text, params || []);
    const duration = Date.now() - start;
    console.log('Executed query', { text: text.substring(0, 50), duration, rows: rows.length });
    return { rows, rowCount: rows.length };
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  }
}
