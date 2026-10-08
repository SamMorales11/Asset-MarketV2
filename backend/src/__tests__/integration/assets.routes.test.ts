import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../../app.js';
import { db } from '../../db/index.js';
import { categories } from '../../db/schema.js';

describe('Asset Catalog & Moderation Routes Integration Tests', () => {
  let sellerToken: string;
  let adminToken: string;
  let userToken: string;
  let activeCategoryId: string;
  let createdAssetId: string;
  const timestamp = Date.now();

  beforeAll(async () => {
    // 1. Register Seller
    const sellerRes = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Asset Tester Seller',
        email: `seller_asset_${timestamp}@test.com`,
        password: 'Password123!',
      }),
    });
    const sellerData = await sellerRes.json();
    sellerToken = sellerData.data?.accessToken;

    // 2. Register Regular User
    const userRes = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Asset Tester User',
        email: `buyer_asset_${timestamp}@test.com`,
        password: 'Password123!',
      }),
    });
    const userData = await userRes.json();
    userToken = userData.data?.accessToken;

    // 3. Login Admin
    const adminRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@assetmarket.com',
        password: 'Admin123!',
      }),
    });
    const adminData = await adminRes.json();
    adminToken = adminData.data?.accessToken;

    // 4. Retrieve valid category
    const [cat] = await db.select().from(categories).limit(1);
    activeCategoryId = cat?.id || '';
  });

  describe('GET /api/assets (Public Catalog)', () => {
    it('returns public asset catalog with pagination and count', async () => {
      const res = await app.request('/api/assets');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data.assets)).toBe(true);
      expect(typeof body.data.pagination.total).toBe('number');
    });

    it('filters assets by search keyword', async () => {
      const res = await app.request('/api/assets?search=Design');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  describe('POST /api/assets/upload (Seller Upload)', () => {
    it('blocks unauthenticated upload with 401', async () => {
      const res = await app.request('/api/assets/upload', {
        method: 'POST',
      });
      expect(res.status).toBe(401);
    });

    it('rejects upload without deliverable file with 400', async () => {
      const formData = new FormData();
      formData.append('title', 'Asset Missing File');
      formData.append('shortDescription', 'Short description here');
      formData.append('description', 'Long detailed description here');
      formData.append('categoryId', activeCategoryId);
      formData.append('assetType', 'ui_template');
      formData.append('price', '150000');

      const res = await app.request('/api/assets/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: formData,
      });

      expect([400, 422]).toContain(res.status);
    });

    it('successfully uploads new asset with pending moderation status', async () => {
      const formData = new FormData();
      formData.append('title', `Integration Suite Asset ${timestamp}`);
      formData.append('shortDescription', 'A beautiful template for tests');
      formData.append('description', 'Comprehensive description for integration tests.');
      formData.append('categoryId', activeCategoryId);
      formData.append('assetType', 'ui_template');
      formData.append('price', '200000');
      formData.append('tags', JSON.stringify(['Vue', 'Integration']));

      const pngBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
      const dummyCover = new File([pngBytes], 'cover.png', { type: 'image/png' });
      const dummyArchive = new File([Buffer.from('archive-mock-payload')], 'project.zip', {
        type: 'application/zip',
      });

      formData.append('thumbnail', dummyCover);
      formData.append('file', dummyArchive);

      const res = await app.request('/api/assets/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: formData,
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.asset).toBeDefined();
      expect(body.data.asset.status).toBe('pending');
      createdAssetId = body.data.asset.id;
    });

    it('ensures pending asset is NOT visible in public catalog', async () => {
      const res = await app.request('/api/assets');
      const body = await res.json();
      const found = body.data.assets.some((a: any) => a.id === createdAssetId);
      expect(found).toBe(false);
    });
  });

  describe('Admin Moderation Queue & Approval Lifecycle', () => {
    it('blocks regular user from accessing pending queue with 403', async () => {
      const res = await app.request('/api/admin/assets/pending', {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(res.status).toBe(403);
    });

    it('allows Admin to view pending assets queue containing uploaded asset', async () => {
      const res = await app.request('/api/admin/assets/pending', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      const found = body.data.pendingAssets.some((a: any) => a.id === createdAssetId);
      expect(found).toBe(true);
    });

    it('allows Admin to approve asset and publishes it', async () => {
      const res = await app.request(`/api/admin/assets/${createdAssetId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.asset.status).toBe('approved');
    });

    it('verifies approved asset is now listed in public catalog', async () => {
      const res = await app.request('/api/assets');
      const body = await res.json();
      const found = body.data.assets.some((a: any) => a.id === createdAssetId);
      expect(found).toBe(true);
    });

    it('allows public retrieval of approved asset details by ID', async () => {
      const res = await app.request(`/api/assets/${createdAssetId}`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.asset.id).toBe(createdAssetId);
      expect(body.data.asset.status).toBe('approved');
    });

    it('searches assets by tag keyword', async () => {
      const res = await app.request('/api/assets?q=Integration');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      const found = body.data.assets.some((a: any) => a.id === createdAssetId);
      expect(found).toBe(true);
    });

    it('filters assets by asset type', async () => {
      const res = await app.request('/api/assets?type=ui_template');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.assets.every((a: any) => a.assetType === 'ui_template')).toBe(true);
    });

    it('filters assets by paid pricing', async () => {
      const res = await app.request('/api/assets?pricing=paid');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.assets.every((a: any) => Number(a.price) > 0)).toBe(true);
    });

    it('filters assets by free pricing', async () => {
      const res = await app.request('/api/assets?pricing=free');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.assets.every((a: any) => Number(a.discountPrice ?? a.price) <= 0)).toBe(true);
    });

    it('filters assets by valid price range', async () => {
      const res = await app.request('/api/assets?minPrice=150000&maxPrice=250000');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(
        body.data.assets.every((a: any) => {
          const effective = Number(a.discountPrice ?? a.price);
          return effective >= 150000 && effective <= 250000;
        })
      ).toBe(true);
    });

    it('rejects inverted price range with 400', async () => {
      const res = await app.request('/api/assets?minPrice=500000&maxPrice=100000');
      expect([400, 422]).toContain(res.status);
      const body = await res.json();
      expect(body.success).toBe(false);
    });

    it('sorts assets by price ascending', async () => {
      const res = await app.request('/api/assets?sort=price_asc&limit=10');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      const prices = body.data.assets.map((a: any) => Number(a.discountPrice ?? a.price));
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
      }
    });

    it('sorts assets by price descending', async () => {
      const res = await app.request('/api/assets?sort=price_desc&limit=10');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      const prices = body.data.assets.map((a: any) => Number(a.discountPrice ?? a.price));
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeLessThanOrEqual(prices[i - 1]);
      }
    });

    it('supports custom pagination limits and page numbers', async () => {
      const res = await app.request('/api/assets?page=1&limit=2');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.pagination.page).toBe(1);
      expect(body.data.pagination.limit).toBe(2);
      expect(body.data.pagination.totalPages).toBeGreaterThanOrEqual(1);
      expect(body.data.assets.length).toBeLessThanOrEqual(2);
    });
  });
});
