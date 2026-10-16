import { getRequestListener } from '@hono/node-server';
import { app } from '../backend/src/app.js';

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
};

const listener = getRequestListener(app.fetch);

/**
 * Universal Vercel Handler:
 * - If invoked by @vercel/node (req: IncomingMessage, res: ServerResponse): streams response and calls res.end()
 * - If invoked by Web Standards / Edge (req: Request): returns Response directly
 */
export default function handler(req: any, res: any) {
  if (res && typeof res.writeHead === 'function') {
    return listener(req, res);
  }
  return app.fetch(req);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const OPTIONS = handler;
export const HEAD = handler;

