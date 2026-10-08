import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../../app.js';
import { db } from '../../db/index.js';
import { categories } from '../../db/schema.js';

describe('My Purchases, Secure Downloads & Deliverable Protection', () => {
  let sellerToken: string;
  let buyerToken: string;
  let strangerToken: string;
  let adminToken: string;
  let assetId: string;
  let invoiceNumber: string;
  const timestamp = Date.now();

  beforeAll(async () => {
    // 1. Seller
    const sellerRes = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Download Seller',
        email: `download_seller_${timestamp}@test.com`,
        password: 'Password123!',
      }),
    });
    sellerToken = (await sellerRes.json()).data?.accessToken;

    // 2. Buyer
    const buyerRes = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Download Buyer',
        email: `download_buyer_${timestamp}@test.com`,
        password: 'Password123!',
      }),
    });
    buyerToken = (await buyerRes.json()).data?.accessToken;

    // 3. Stranger (has not bought)
    const strangerRes = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Stranger User',
        email: `stranger_${timestamp}@test.com`,
        password: 'Password123!',
      }),
    });
    strangerToken = (await strangerRes.json()).data?.accessToken;

    // 4. Admin
    const adminRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@assetmarket.com',
        password: 'Admin123!',
      }),
    });
    adminToken = (await adminRes.json()).data?.accessToken;

    // 5. Upload asset
    const [cat] = await db.select().from(categories).limit(1);
    const form = new FormData();
    form.append('title', `Deliverable Asset ${timestamp}`);
    form.append('shortDescription', 'Short description');
    form.append('description', 'Comprehensive deliverable description');
    form.append('categoryId', cat!.id);
    form.append('assetType', 'ui_template');
    form.append('price', '80000');

    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    form.append('thumbnail', new File([png], 'cover.png', { type: 'image/png' }));
    form.append('file', new File([Buffer.from('fake-zip-binary-deliverable-data')], 'deliverable.zip', { type: 'application/zip' }));

    const uploadRes = await app.request('/api/assets/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: form,
    });
    assetId = (await uploadRes.json()).data?.asset?.id;

    // Approve asset
    await app.request(`/api/admin/assets/${assetId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    // 6. Complete purchase for buyer
    await app.request('/api/cart/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({ assetId }),
    });

    const checkoutRes = await app.request('/api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({ paymentMethod: 'manual_transfer', destinationBank: 'BCA' }),
    });
    invoiceNumber = (await checkoutRes.json()).data?.invoiceNumber;

    const confirmForm = new FormData();
    confirmForm.append('invoiceNumber', invoiceNumber);
    confirmForm.append('senderBank', 'BCA');
    confirmForm.append('senderAccountNumber', '8271928371');
    confirmForm.append('senderAccountName', 'Download Buyer');
    confirmForm.append('destinationBank', 'BCA');
    confirmForm.append('transferAmount', '80000');
    confirmForm.append('transferDate', new Date().toISOString());
    confirmForm.append(
      'proofImage',
      new File([Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64')], 'receipt.jpg', { type: 'image/jpeg' })
    );

    await app.request('/api/payments/confirm', {
      method: 'POST',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: confirmForm,
    });

    const pendingQueueRes = await app.request('/api/admin/payments/pending', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const pendingItem = (await pendingQueueRes.json()).data?.pendingPayments?.find(
      (p: any) => p.transaction.invoiceNumber === invoiceNumber
    );

    if (pendingItem) {
      await app.request(`/api/admin/payments/${pendingItem.id}/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }
  });

  describe('GET /api/purchases/my', () => {
    it('returns purchased assets in buyer vault', async () => {
      const res = await app.request('/api/purchases/my', {
        headers: { Authorization: `Bearer ${buyerToken}` },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      const hasInvoice = body.data?.purchases?.some(
        (p: any) => p.invoiceNumber === invoiceNumber
      );
      expect(hasInvoice).toBe(true);
    });

    it('returns empty purchases list for user who has not bought anything', async () => {
      const res = await app.request('/api/purchases/my', {
        headers: { Authorization: `Bearer ${strangerToken}` },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data?.purchases?.length).toBe(0);
    });
  });

  describe('GET /api/assets/:id/download (Access Control)', () => {
    it('blocks stranger who has not purchased the asset with 403 Forbidden', async () => {
      const res = await app.request(`/api/assets/${assetId}/download`, {
        headers: { Authorization: `Bearer ${strangerToken}` },
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toContain('Akses Ditolak');
    });

    it('blocks unauthenticated request with 401 Unauthorized', async () => {
      const res = await app.request(`/api/assets/${assetId}/download`);
      expect(res.status).toBe(401);
    });

    it('allows verified buyer to download the deliverable with 200 OK', async () => {
      const res = await app.request(`/api/assets/${assetId}/download`, {
        headers: { Authorization: `Bearer ${buyerToken}` },
      });

      expect(res.status).toBe(200);
    });

    it('allows the asset creator/seller to download their own deliverable with 200 OK', async () => {
      const res = await app.request(`/api/assets/${assetId}/download`, {
        headers: { Authorization: `Bearer ${sellerToken}` },
      });

      expect(res.status).toBe(200);
    });

    it('allows admin to download any asset deliverable with 200 OK', async () => {
      const res = await app.request(`/api/assets/${assetId}/download`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
    });
  });

  describe('Static Direct Deliverables Access Guard (/uploads/files/*)', () => {
    it('blocks direct URL bypass to protected files with 403', async () => {
      const res = await app.request('/uploads/files/some-deliverable.zip');
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toContain('Direct access to digital asset deliverable is forbidden');
    });
  });
});
