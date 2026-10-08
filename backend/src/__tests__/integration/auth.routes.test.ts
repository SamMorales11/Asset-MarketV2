import { describe, it, expect } from 'vitest';
import { app } from '../../app.js';
import { generateRefreshToken } from '../../lib/index.js';

describe('Auth API Routes Integration Tests (/api/auth)', () => {
  const timestamp = Date.now();
  const testUser = {
    name: 'Integration Test User',
    email: `integration_${timestamp}@test.com`,
    password: 'Password123!',
  };

  let registeredAccessToken: string;

  describe('POST /api/auth/register', () => {
    it('registers a new user successfully with 201 Created', async () => {
      const res = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(body.data.user.name).toBe(testUser.name);
      expect(body.data.user.role).toBe('user');
      expect(body.data.user.passwordHash).toBeUndefined(); // Sensitive data omitted
      registeredAccessToken = body.data.accessToken;
    });

    it('rejects duplicate email registration with 409 Conflict', async () => {
      const res = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser),
      });

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toContain('Email is already registered');
    });

    it('rejects registration with invalid inputs (short password, bad email) with 400', async () => {
      const res = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'A',
          email: 'invalid-email',
          password: 'short',
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('successfully logs in with valid credentials and returns accessToken', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.user.email).toBe(testUser.email.toLowerCase());
    });

    it('rejects login with incorrect password with 401 Unauthorized', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: 'WrongPassword!',
        }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
    });

    it('rejects login with non-existent user with 401 Unauthorized', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent_ghost_99999@test.com',
          password: 'Password123!',
        }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns current profile when authorized with Bearer token', async () => {
      const res = await app.request('/api/auth/me', {
        headers: { Authorization: `Bearer ${registeredAccessToken}` },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe(testUser.email.toLowerCase());
    });

    it('returns 401 when Authorization header is absent', async () => {
      const res = await app.request('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('issues a new access token when valid refresh token is passed in cookie', async () => {
      const loginRes = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      });

      const cookies = loginRes.headers.get('set-cookie') || '';

      const refreshRes = await app.request('/api/auth/refresh', {
        method: 'POST',
        headers: {
          Cookie: cookies,
        },
      });

      expect(refreshRes.status).toBe(200);
      const refreshBody = await refreshRes.json();
      expect(refreshBody.success).toBe(true);
      expect(refreshBody.data.accessToken).toBeDefined();
    });

    it('returns 401 when refresh token is missing or invalid', async () => {
      const res = await app.request('/api/auth/refresh', {
        method: 'POST',
        headers: {
          Cookie: 'refresh_token=fake.corrupt.token',
        },
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('clears session and returns success', async () => {
      const res = await app.request('/api/auth/logout', {
        method: 'POST',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });
});
