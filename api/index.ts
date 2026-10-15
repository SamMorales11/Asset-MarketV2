import { handle } from 'hono/vercel';
import { app } from '../backend/src/app.js';

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
};

const handler = handle(app);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const OPTIONS = handler;
export const HEAD = handler;

export default handler;
