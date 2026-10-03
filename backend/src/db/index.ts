import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as dotenv from 'dotenv';
import * as schema from './schema.js';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn('Warning: DATABASE_URL is not set in environment variables.');
}

const fallbackUrl = 'postgresql://user:password@ep-example-123456.us-east-2.aws.neon.tech/neondb?sslmode=require';
const sql = neon(databaseUrl || fallbackUrl);
export const db = drizzle(sql, { schema });
