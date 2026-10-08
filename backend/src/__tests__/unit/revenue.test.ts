import { describe, it, expect } from 'vitest';

export interface SplitResult {
  price: number;
  sellerAmount: number;
  platformAmount: number;
  sellerRatePercent: number;
  platformRatePercent: number;
}

export function calculateRevenueSplit(price: number): SplitResult {
  const sellerAmount = Number((price * 0.6).toFixed(2));
  const platformAmount = Number((price * 0.4).toFixed(2));
  return {
    price,
    sellerAmount,
    platformAmount,
    sellerRatePercent: 60.0,
    platformRatePercent: 40.0,
  };
}

export function calculateOrderSummary(items: { price: number }[]) {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const taxAmount = 0;
  const totalAmount = subtotal + taxAmount;
  const totalSellerEarnings = items.reduce((sum, item) => sum + calculateRevenueSplit(item.price).sellerAmount, 0);
  const totalPlatformEarnings = items.reduce((sum, item) => sum + calculateRevenueSplit(item.price).platformAmount, 0);

  return {
    subtotal: Number(subtotal.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
    totalSellerEarnings: Number(totalSellerEarnings.toFixed(2)),
    totalPlatformEarnings: Number(totalPlatformEarnings.toFixed(2)),
  };
}

describe('Payment & 60/40 Revenue Share Split Calculations', () => {
  describe('calculateRevenueSplit', () => {
    it('accurately calculates 60% creator and 40% platform split on round numbers', () => {
      const split100k = calculateRevenueSplit(100000);
      expect(split100k.sellerAmount).toBe(60000);
      expect(split100k.platformAmount).toBe(40000);
      expect(split100k.sellerAmount + split100k.platformAmount).toBe(100000);

      const split250k = calculateRevenueSplit(250000);
      expect(split250k.sellerAmount).toBe(150000);
      expect(split250k.platformAmount).toBe(100000);
      expect(split250k.sellerAmount + split250k.platformAmount).toBe(250000);
    });

    it('correctly handles fractional prices with 2-decimal precision', () => {
      const splitOdd = calculateRevenueSplit(99.99);
      // 99.99 * 0.6 = 59.994 -> 59.99
      // 99.99 * 0.4 = 39.996 -> 40.00
      expect(splitOdd.sellerAmount).toBe(59.99);
      expect(splitOdd.platformAmount).toBe(40.0);
    });

    it('returns zero earnings for free assets (price = 0)', () => {
      const splitZero = calculateRevenueSplit(0);
      expect(splitZero.sellerAmount).toBe(0);
      expect(splitZero.platformAmount).toBe(0);
    });
  });

  describe('calculateOrderSummary', () => {
    it('aggregates multi-item order totals and splits accurately', () => {
      const cartItems = [
        { price: 150000 },
        { price: 250000 },
        { price: 100000 },
      ];

      const summary = calculateOrderSummary(cartItems);

      expect(summary.subtotal).toBe(500000);
      expect(summary.totalAmount).toBe(500000);
      // 60% of 500,000 = 300,000
      expect(summary.totalSellerEarnings).toBe(300000);
      // 40% of 500,000 = 200,000
      expect(summary.totalPlatformEarnings).toBe(200000);
      expect(summary.totalSellerEarnings + summary.totalPlatformEarnings).toBe(500000);
    });

    it('handles empty order items list', () => {
      const summary = calculateOrderSummary([]);
      expect(summary.subtotal).toBe(0);
      expect(summary.totalAmount).toBe(0);
      expect(summary.totalSellerEarnings).toBe(0);
      expect(summary.totalPlatformEarnings).toBe(0);
    });
  });

  describe('Creator Available Balance Ledger Computation', () => {
    it('calculates available balance by subtracting withdrawals from net earnings', () => {
      const paidSales = [
        { sellerAmount: '60000.00' },
        { sellerAmount: '150000.00' },
        { sellerAmount: '90000.00' },
      ];
      const completedWithdrawals = [
        { amount: '100000.00' },
      ];

      const creatorEarnings = paidSales.reduce((acc, s) => acc + Number(s.sellerAmount), 0);
      const withdrawnAmount = completedWithdrawals.reduce((acc, w) => acc + Number(w.amount), 0);
      const availableBalance = Math.max(0, creatorEarnings - withdrawnAmount);

      expect(creatorEarnings).toBe(300000);
      expect(withdrawnAmount).toBe(100000);
      expect(availableBalance).toBe(200000);
    });

    it('prevents negative available balance display', () => {
      const creatorEarnings = 50000;
      const withdrawnAmount = 80000;
      const availableBalance = Math.max(0, creatorEarnings - withdrawnAmount);
      expect(availableBalance).toBe(0);
    });
  });
});
