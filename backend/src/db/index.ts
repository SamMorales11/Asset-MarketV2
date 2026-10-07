import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as dotenv from 'dotenv';
import * as schema from './schema.js';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('FATAL: DATABASE_URL is not set in environment variables. Please create a .env file with your Neon PostgreSQL connection string.');
}

const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });

// Health check - verify connection on startup
export async function verifyDatabaseConnection(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
