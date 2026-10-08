import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../../app.js';
import { db } from '../../db/index.js';
import { assets } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

describe('Cart & Checkout Flow Integration Tests (/api/cart & /api/checkout)', () => {
  let buyerToken: string;
  let testAssetId: string;
  let generatedInvoiceNumber: string;
  const timestamp = Date.now();

  beforeAll(async () => {
    // 1. Register Buyer
    const buyerRes = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Cart Buyer Test',
        email: `cart_buyer_${timestamp}@test.com`,
        password: 'Password123!',
      }),
    });
    const buyerData = await buyerRes.json();
    buyerToken = buyerData.data?.accessToken;

    // 2. Find an approved asset from database
    const [existingAsset] = await db
      .select()
      .from(assets)
      .where(eq(assets.status, 'approved'))
      .limit(1);

    if (existingAsset) {
      testAssetId = existingAsset.id;
    }
  });

  describe('Cart Operations (/api/cart)', () => {
    it('blocks unauthenticated access to cart with 401', async () => {
      const res = await app.request('/api/cart');
      expect(res.status).toBe(401);
    });

    it('returns empty cart initially for new buyer', async () => {
      const res = await app.request('/api/cart', {
        headers: { Authorization: `Bearer ${buyerToken}` },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.items.length).toBe(0);
    });

    it('adds an asset to the cart successfully', async () => {
      const res = await app.request('/api/cart/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${buyerToken}`,
        },
        body: JSON.stringify({ assetId: testAssetId }),
      });

      expect([200, 201]).toContain(res.status);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it('prevents duplicate item additions to cart gracefully', async () => {
      const res = await app.request('/api/cart/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${buyerToken}`,
        },
        body: JSON.stringify({ assetId: testAssetId }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.alreadyInCart).toBe(true);
      expect(body.message).toContain('already in your cart');
    });

    it('retrieves cart containing the added asset', async () => {
      const res = await app.request('/api/cart', {
        headers: { Authorization: `Bearer ${buyerToken}` },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.items.length).toBe(1);
      expect(body.data.items[0].assetId).toBe(testAssetId);
    });
  });

  describe('Checkout Operations (/api/checkout)', () => {
    it('blocks checkout without authorization with 401', async () => {
      const res = await app.request('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: 'manual_transfer' }),
      });
      expect(res.status).toBe(401);
    });

    it('successfully checks out items from cart and generates invoice', async () => {
      const res = await app.request('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${buyerToken}`,
        },
        body: JSON.stringify({
          paymentMethod: 'manual_transfer',
          destinationBank: 'BCA',
          notes: 'Integration test checkout',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      generatedInvoiceNumber =
        body.data?.invoiceNumber || body.data?.transaction?.invoiceNumber;
      expect(generatedInvoiceNumber).toBeDefined();
      expect(generatedInvoiceNumber.startsWith('INV-')).toBe(true);
    });

    it('empties the user cart after successful checkout', async () => {
      const res = await app.request('/api/cart', {
        headers: { Authorization: `Bearer ${buyerToken}` },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.items.length).toBe(0);
    });

    it('rejects checkout when cart is empty with 400', async () => {
      const res = await app.request('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${buyerToken}`,
        },
        body: JSON.stringify({ paymentMethod: 'manual_transfer' }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message.toLowerCase()).toContain('empty');
    });

    it('retrieves invoice details by invoice number with pending status', async () => {
      const res = await app.request(`/api/transactions/${generatedInvoiceNumber}`, {
        headers: { Authorization: `Bearer ${buyerToken}` },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.transaction.invoiceNumber).toBe(generatedInvoiceNumber);
      expect(body.data.transaction.status).toBe('pending');
    });
  });
});
