import { Hono } from 'hono';
import { cors } from 'hono/cors';
import * as path from 'path';
import { apiRoutes } from './routes/index.js';
import { authRoutes } from './routes/auth.js';
import { adminRoutes } from './routes/admin.js';
import { assetRoutes } from './routes/assets.js';
import { categoryRoutes } from './routes/categories.js';
import { cartRoutes } from './routes/cart.js';
import { transactionRoutes } from './routes/transactions.js';
import { userRoutes } from './routes/users.js';

export const app = new Hono();

import * as fsSync from 'fs';
import { Readable } from 'stream';
import { getUploadsRootDir, ensureUploadDirs } from './utils/paths.js';

// Ensure standard uploads directories exist at server start
ensureUploadDirs();

// Global CORS Middleware supporting cookies and Bearer tokens
app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        return origin || 'http://localhost:5173';
      }
      return 'http://localhost:5173';
    },
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Set-Cookie', 'Content-Disposition', 'Content-Length'],
  })
);

// Robust Static File Serving for /uploads/*
// Supports /uploads/<folder>/<filename> as well as direct /uploads/<filename>
app.all('/uploads/*', async (c) => {
  // CORS & Security Headers
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization');
  c.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type');
  c.header('Cross-Origin-Resource-Policy', 'cross-origin');
  c.header('Cross-Origin-Embedder-Policy', 'unsafe-none');

  if (c.req.method === 'OPTIONS') {
    return c.body(null, 204);
  }

  const rawPath = c.req.path.replace(/^\/uploads\/?/, '');
  let decodedPath = '';
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    decodedPath = rawPath;
  }

  // Guard against path traversal
  const safeRelativePath = path.normalize(decodedPath).replace(/^(\.\.(\/|\\|$))+/, '');

  // Security Check: Protected binary deliverables must not be served statically
  const normalizedLower = safeRelativePath.toLowerCase().replace(/\\/g, '/');
  if (
    normalizedLower.startsWith('files/') ||
    normalizedLower.startsWith('deliverables/') ||
    normalizedLower === 'files' ||
    normalizedLower === 'deliverables'
  ) {
    return c.json(
      {
        success: false,
        message:
          'Direct access to digital asset deliverable is forbidden. Please authenticate and download through the secure download endpoint (/api/purchases/download/:fileId or /api/assets/:id/download).',
      },
      403
    );
  }

  const uploadsBase = getUploadsRootDir();

  // 1. Direct path search: e.g. uploads/thumbnails/foo.png or uploads/foo.png
  let targetFilePath = path.join(uploadsBase, safeRelativePath);

  // 2. Fallback search: if requested as /uploads/foo.png but stored in /uploads/thumbnails/foo.png
  if (!fsSync.existsSync(targetFilePath) || fsSync.statSync(targetFilePath).isDirectory()) {
    const thumbCandidate = path.join(uploadsBase, 'thumbnails', safeRelativePath);
    if (fsSync.existsSync(thumbCandidate) && !fsSync.statSync(thumbCandidate).isDirectory()) {
      targetFilePath = thumbCandidate;
    }
  }

  // 3. Fallback search: if requested as /uploads/foo.png but stored in /uploads/payments/foo.png
  if (!fsSync.existsSync(targetFilePath) || fsSync.statSync(targetFilePath).isDirectory()) {
    const paymentCandidate = path.join(uploadsBase, 'payments', safeRelativePath);
    if (fsSync.existsSync(paymentCandidate) && !fsSync.statSync(paymentCandidate).isDirectory()) {
      targetFilePath = paymentCandidate;
    }
  }

  if (!fsSync.existsSync(targetFilePath) || fsSync.statSync(targetFilePath).isDirectory()) {
    return c.json({ success: false, message: 'Static asset not found' }, 404);
  }

  const stats = fsSync.statSync(targetFilePath);
  const ext = path.extname(targetFilePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.gif': 'image/gif',
    '.avif': 'image/avif',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf',
  };
  const mimeType = mimeTypes[ext] || 'application/octet-stream';

  c.header('Content-Type', mimeType);
  c.header('Content-Length', stats.size.toString());
  c.header('Last-Modified', stats.mtime.toUTCString());
  c.header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

  if (c.req.method === 'HEAD') {
    return c.body(null, 200);
  }

  const stream = fsSync.createReadStream(targetFilePath);
  return c.body(Readable.toWeb(stream) as any, 200);
});

// Alias for /thumbnails/* -> redirect to /uploads/thumbnails/*
app.all('/thumbnails/*', async (c) => {
  return c.redirect(`/uploads${c.req.path}`);
});

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'asset-market-backend',
  });
});

// Primary API route group (/api/*)
app.route('/api', apiRoutes);

// Direct root aliases for convenience
app.route('/auth', authRoutes);
app.route('/assets', assetRoutes);
app.route('/admin', adminRoutes);
app.route('/categories', categoryRoutes);
app.route('/cart', cartRoutes);
app.route('/users', userRoutes);
app.route('/', transactionRoutes);

app.notFound((c) => {
  return c.json({ success: false, message: 'Endpoint Not Found' }, 404);
});

app.onError((err, c) => {
  console.error('Unhandled Application Error:', err);
  return c.json(
    {
      success: false,
      message: err.message || 'Internal Server Error',
    },
    500
  );
});
