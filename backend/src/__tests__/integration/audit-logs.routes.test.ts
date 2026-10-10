import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../../app.js';

interface AuthTokenResponse {
  success: boolean;
  data?: { accessToken: string };
}

interface AuditLogsResponse {
  success: boolean;
  data?: {
    logs: Array<{
      id: string;
      action: string;
      targetEntity: string;
      targetId: string;
      createdAt: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages?: number;
    };
    stats: {
      totalActions: number;
      totalApprovals?: number;
      totalRejections?: number;
      totalPayments?: number;
      totalUsersManaged?: number;
    };
    availableAdmins?: Array<{ id: string; name: string }>;
  };
}

describe('Admin Audit Trail API Routes (/api/admin/audit-logs)', () => {
  let adminToken: string;
  let normalUserToken: string;
  const timestamp = Date.now();

  beforeAll(async () => {
    // 1. Admin Login
    const adminRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@assetmarket.com',
        password: 'Admin123!',
      }),
    });
    adminToken = (await adminRes.json() as AuthTokenResponse).data!.accessToken;

    // 2. Normal User Registration
    const userRes = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Regular Auditor Test',
        email: `auditor_${timestamp}@test.com`,
        password: 'Password123!',
      }),
    });
    normalUserToken = (await userRes.json() as AuthTokenResponse).data!.accessToken;
  });

  it('rejects unauthenticated requests with 401 Unauthorized', async () => {
    const res = await app.request('/api/admin/audit-logs');
    expect(res.status).toBe(401);
  });

  it('rejects regular users without admin role with 403 Forbidden', async () => {
    const res = await app.request('/api/admin/audit-logs', {
      headers: {
        Authorization: `Bearer ${normalUserToken}`,
      },
    });
    expect(res.status).toBe(403);
  });

  it('allows admin to retrieve paginated audit logs with metadata and stats', async () => {
    const res = await app.request('/api/admin/audit-logs?page=1&limit=10', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as AuditLogsResponse;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data?.logs)).toBe(true);
    expect(body.data?.pagination).toBeDefined();
    expect(body.data?.pagination.page).toBe(1);
    expect(body.data?.pagination.limit).toBe(10);
    expect(typeof body.data?.pagination.total).toBe('number');
    expect(body.data?.stats).toBeDefined();
    expect(typeof body.data?.stats.totalActions).toBe('number');

    if (body.data?.logs && body.data.logs.length > 0) {
      const firstLog = body.data.logs[0]!;
      expect(firstLog.id).toBeDefined();
      expect(firstLog.action).toBeDefined();
      expect(firstLog.targetEntity).toBeDefined();
      expect(firstLog.targetId).toBeDefined();
      expect(firstLog.createdAt).toBeDefined();
    }
  });

  it('supports filtering by action type', async () => {
    const res = await app.request('/api/admin/audit-logs?action=ASSET_APPROVE', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as AuditLogsResponse;
    expect(body.success).toBe(true);
    for (const log of body.data?.logs ?? []) {
      expect(log.action).toBe('ASSET_APPROVE');
    }
  });

  it('supports filtering by target entity', async () => {
    const res = await app.request('/api/admin/audit-logs?targetEntity=assets', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as AuditLogsResponse;
    expect(body.success).toBe(true);
    for (const log of body.data?.logs ?? []) {
      expect(log.targetEntity).toBe('assets');
    }
  });

  it('supports searching by text', async () => {
    const res = await app.request('/api/admin/audit-logs?search=admin', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as AuditLogsResponse;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data?.logs)).toBe(true);
  });
});
