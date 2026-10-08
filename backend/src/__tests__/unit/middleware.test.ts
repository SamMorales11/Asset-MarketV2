import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../../middleware/index.js';
import { generateAccessToken } from '../../lib/index.js';

describe('Middleware & Role-Based Access Control (RBAC)', () => {
  const createTestApp = () => {
    const app = new Hono();

    // Protected generic route
    app.get('/protected', authMiddleware, (c) => {
      const user = c.get('user');
      return c.json({ success: true, user });
    });

    // Admin-only route
    app.get('/admin-only', authMiddleware, requireRole('admin', 'superadmin'), (c) => {
      return c.json({ success: true, message: 'Welcome Admin' });
    });

    // SuperAdmin-only route
    app.get('/superadmin-only', authMiddleware, requireRole('superadmin'), (c) => {
      return c.json({ success: true, message: 'Welcome SuperAdmin' });
    });

    // Seller-only route
    app.get('/seller-only', authMiddleware, requireRole('user'), (c) => {
      return c.json({ success: true, message: 'Welcome Seller' });
    });

    return app;
  };

  describe('authMiddleware', () => {
    it('returns 401 when Authorization header is missing', async () => {
      const app = createTestApp();
      const res = await app.request('/protected');

      expect(res.status).toBe(401);
      const data = await res.json() as any;
      expect(data.success).toBe(false);
      expect(data.message).toContain('Missing or malformed Authorization token');
    });

    it('returns 401 when Authorization header does not use Bearer scheme', async () => {
      const app = createTestApp();
      const res = await app.request('/protected', {
        headers: { Authorization: 'Basic some-credentials' },
      });

      expect(res.status).toBe(401);
      const data = await res.json() as any;
      expect(data.success).toBe(false);
    });

    it('returns 401 when token is invalid or corrupted', async () => {
      const app = createTestApp();
      const res = await app.request('/protected', {
        headers: { Authorization: 'Bearer totally.invalid.token' },
      });

      expect(res.status).toBe(401);
      const data = await res.json() as any;
      expect(data.success).toBe(false);
      expect(data.message).toContain('Invalid or expired access token');
    });

    it('allows access and attaches user payload when valid Bearer token is provided', async () => {
      const app = createTestApp();
      const token = await generateAccessToken({
        userId: 'usr_valid_user',
        email: 'user@example.com',
        name: 'Jane Doe',
        role: 'user',
      });

      const res = await app.request('/protected', {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.success).toBe(true);
      expect(data.user.userId).toBe('usr_valid_user');
      expect(data.user.role).toBe('user');
    });

    it('allows access via query parameter token', async () => {
      const app = createTestApp();
      const token = await generateAccessToken({
        userId: 'usr_query_user',
        email: 'query@example.com',
        name: 'Query User',
        role: 'user',
      });

      const res = await app.request(`/protected?token=${token}`);

      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.success).toBe(true);
      expect(data.user.userId).toBe('usr_query_user');
    });
  });

  describe('requireRole (RBAC)', () => {
    it('blocks regular user (role: user) from admin route with 403', async () => {
      const app = createTestApp();
      const token = await generateAccessToken({
        userId: 'usr_regular',
        email: 'regular@example.com',
        name: 'Regular User',
        role: 'user',
      });

      const res = await app.request('/admin-only', {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(403);
      const data = await res.json() as any;
      expect(data.success).toBe(false);
      expect(data.message).toContain('Forbidden');
      expect(data.message).toContain('admin, superadmin');
    });

    it('allows standard admin to access admin-only route with 200', async () => {
      const app = createTestApp();
      const token = await generateAccessToken({
        userId: 'usr_admin',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
      });

      const res = await app.request('/admin-only', {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.success).toBe(true);
      expect(data.message).toBe('Welcome Admin');
    });

    it('allows superadmin to access admin-only route with 200', async () => {
      const app = createTestApp();
      const token = await generateAccessToken({
        userId: 'usr_super',
        email: 'super@example.com',
        name: 'Super Admin User',
        role: 'superadmin',
      });

      const res = await app.request('/admin-only', {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.success).toBe(true);
    });

    it('blocks standard admin from superadmin-only route with 403', async () => {
      const app = createTestApp();
      const token = await generateAccessToken({
        userId: 'usr_admin',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
      });

      const res = await app.request('/superadmin-only', {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(403);
      const data = await res.json() as any;
      expect(data.success).toBe(false);
      expect(data.message).toContain('superadmin');
    });

    it('allows seller to access seller-only route with 200', async () => {
      const app = createTestApp();
      const token = await generateAccessToken({
        userId: 'usr_seller',
        email: 'seller@example.com',
        name: 'Seller User',
        role: 'user',
      });

      const res = await app.request('/seller-only', {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.success).toBe(true);
      expect(data.message).toBe('Welcome Seller');
    });
  });
});
