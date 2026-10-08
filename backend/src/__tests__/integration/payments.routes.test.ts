import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../../app.js';
import { db } from '../../db/index.js';
import { assets, transactions, categories } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

describe('Payment Confirmation & Admin Settlement Flow (/api/payments/confirm & /api/admin/payments)', () => {
  let sellerToken: string;
  let buyerToken: string;
  let adminToken: string;
  let assetId: string;
  let invoiceNumber: string;
  let paymentId: string;
  const timestamp = Date.now();

  beforeAll(async () => {
    // 1. Seller
    const sellerRes = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Payment Seller',
        email: `seller_pay_${timestamp}@test.com`,
        password: 'Password123!',
      }),
    });
    sellerToken = (await sellerRes.json()).data?.accessToken;

    // 2. Buyer
    const buyerRes = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Payment Buyer',
        email: `buyer_pay_${timestamp}@test.com`,
        password: 'Password123!',
      }),
    });
    buyerToken = (await buyerRes.json()).data?.accessToken;

    // 3. Admin
    const adminRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@assetmarket.com',
        password: 'Admin123!',
      }),
    });
    adminToken = (await adminRes.json()).data?.accessToken;

    // 4. Create and approve an asset
    const [cat] = await db.select().from(categories).limit(1);
    const form = new FormData();
    form.append('title', `Payment Test Asset ${timestamp}`);
    form.append('shortDescription', 'Short description');
    form.append('description', 'Full description');
    form.append('categoryId', cat!.id);
    form.append('assetType', 'ui_template');
    form.append('price', '100000');
    form.append('thumbnail', new File([Buffer.from('thumb')], 'thumb.png', { type: 'image/png' }));
    form.append('file', new File([Buffer.from('zipdata')], 'file.zip', { type: 'application/zip' }));

    const uploadRes = await app.request('/api/assets/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: form,
    });
    assetId = (await uploadRes.json()).data?.asset?.id;

    await app.request(`/api/admin/assets/${assetId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    // 5. Buyer checks out
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
      body: JSON.stringify({
        paymentMethod: 'manual_transfer',
        destinationBank: 'BCA',
      }),
    });
    const checkoutData = await checkoutRes.json();
    invoiceNumber = checkoutData.data?.invoiceNumber;
  });

  describe('POST /api/payments/confirm', () => {
    it('blocks confirmation submission without payment proof receipt', async () => {
      const confirmForm = new FormData();
      confirmForm.append('invoiceNumber', invoiceNumber);
      confirmForm.append('senderBank', 'BCA');
      confirmForm.append('senderAccountNumber', '12345678');
      confirmForm.append('senderAccountName', 'Payment Buyer');
      confirmForm.append('destinationBank', 'BCA');
      confirmForm.append('transferAmount', '100000');
      confirmForm.append('transferDate', new Date().toISOString());

      const res = await app.request('/api/payments/confirm', {
        method: 'POST',
        headers: { Authorization: `Bearer ${buyerToken}` },
        body: confirmForm,
      });

      expect([400, 422]).toContain(res.status);
    });

    it('successfully accepts receipt submission and transitions status to processing', async () => {
      const confirmForm = new FormData();
      confirmForm.append('invoiceNumber', invoiceNumber);
      confirmForm.append('senderBank', 'BCA');
      confirmForm.append('senderAccountNumber', '12345678');
      confirmForm.append('senderAccountName', 'Payment Buyer');
      confirmForm.append('destinationBank', 'BCA');
      confirmForm.append('transferAmount', '100000');
      confirmForm.append('transferDate', new Date().toISOString());

      const jpgBuffer = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
      const proofFile = new File([jpgBuffer], 'receipt.jpg', { type: 'image/jpeg' });
      confirmForm.append('proofImage', proofFile);

      const res = await app.request('/api/payments/confirm', {
        method: 'POST',
        headers: { Authorization: `Bearer ${buyerToken}` },
        body: confirmForm,
      });

      expect([200, 201]).toContain(res.status);
      const body = await res.json();
      expect(body.success).toBe(true);

      // Verify transaction status changed to processing
      const [tx] = await db.select().from(transactions).where(eq(transactions.invoiceNumber, invoiceNumber));
      expect(tx?.status).toBe('processing');
    });
  });

  describe('Admin Payment Verification & 60/40 Revenue Credit', () => {
    it('shows pending confirmation in Admin payment review queue', async () => {
      const res = await app.request('/api/admin/payments/pending', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      const item = body.data.pendingPayments.find(
        (p: any) => p.transaction.invoiceNumber === invoiceNumber
      );
      expect(item).toBeDefined();
      paymentId = item.id;
    });

    it('Admin verifies payment, marks transaction paid, and settles ledger', async () => {
      const res = await app.request(`/api/admin/payments/${paymentId}/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      const [tx] = await db.select().from(transactions).where(eq(transactions.invoiceNumber, invoiceNumber));
      expect(tx?.status).toBe('paid');
    });

    it('credits 60% creator revenue to Seller dashboard (60,000 IDR of 100,000)', async () => {
      const res = await app.request('/api/users/me/revenue', {
        headers: { Authorization: `Bearer ${sellerToken}` },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      const creatorEarnings = Number(body.data.summary?.creatorEarnings || 0);
      expect(creatorEarnings).toBe(60000);
    });
  });
});
