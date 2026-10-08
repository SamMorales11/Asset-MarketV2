import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCartStore } from '../../stores/cart';
import { useAuthStore } from '../../stores/auth';
import type { Asset } from '../../types';

vi.mock('../../services/transactions', () => ({
  cartService: {
    getCart: vi.fn(),
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    clearCart: vi.fn(),
  },
}));

const mockToast = {
  error: vi.fn(),
  success: vi.fn(),
};

vi.mock('../../composables/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

import { cartService } from '../../services/transactions';

describe('useCartStore (Pinia)', () => {
  const dummyAsset1: Asset = {
    id: 'asset_1',
    title: 'Editorial Web Kit',
    slug: 'editorial-web-kit',
    shortDescription: 'Short desc',
    description: 'Long description',
    assetType: 'ui_template',
    status: 'approved',
    price: 200000,
    discountPrice: 150000,
    currency: 'IDR',
    thumbnailUrl: 'https://cdn/thumb1.png',
    tags: ['vue'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const dummyAsset2: Asset = {
    id: 'asset_2',
    title: '3D Cyberpack',
    slug: '3d-cyberpack',
    shortDescription: 'Short desc',
    description: 'Long description',
    assetType: '3d_model',
    status: 'approved',
    price: 100000,
    discountPrice: null,
    currency: 'IDR',
    thumbnailUrl: 'https://cdn/thumb2.png',
    tags: ['blender'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('Initial State & Getters', () => {
    it('initializes with empty items array and zero totals', () => {
      const store = useCartStore();
      expect(store.items).toEqual([]);
      expect(store.itemCount).toBe(0);
      expect(store.subtotal).toBe(0);
      expect(store.totalAmount).toBe(0);
      expect(store.hasItem('asset_1')).toBe(false);
    });
  });

  describe('addItem()', () => {
    it('adds item locally and calculates discount subtotal correctly', async () => {
      const store = useCartStore();
      await store.addItem(dummyAsset1);

      expect(store.itemCount).toBe(1);
      expect(store.hasItem('asset_1')).toBe(true);
      // asset1 discountPrice is 150000
      expect(store.subtotal).toBe(150000);

      // Add second item (regular price 100000)
      await store.addItem(dummyAsset2);
      expect(store.itemCount).toBe(2);
      expect(store.subtotal).toBe(250000);
    });

    it('prevents adding duplicate assets to the cart', async () => {
      const store = useCartStore();
      await store.addItem(dummyAsset1);
      await store.addItem(dummyAsset1);

      expect(store.itemCount).toBe(1);
    });

    it('syncs with backend when user is authenticated', async () => {
      const authStore = useAuthStore();
      authStore.token = 'valid.token';
      authStore.user = { id: 'usr_buyer' } as any;

      vi.mocked(cartService.addToCart).mockResolvedValue({
        cartItemId: 'cart_item_999',
        alreadyInCart: false,
      });

      const store = useCartStore();
      await store.addItem(dummyAsset1);

      expect(cartService.addToCart).toHaveBeenCalledWith('asset_1');
      expect(store.items[0].cartItemId).toBe('cart_item_999');
    });

    it('rolls back optimistic add and shows toast on backend failure', async () => {
      const authStore = useAuthStore();
      authStore.token = 'valid.token';
      authStore.user = { id: 'usr_buyer' } as any;

      vi.mocked(cartService.addToCart).mockRejectedValue(new Error('Network error'));

      const store = useCartStore();
      await store.addItem(dummyAsset1);

      expect(store.items.length).toBe(0);
      expect(mockToast.error).toHaveBeenCalled();
    });
  });

  describe('removeItem()', () => {
    it('removes item from cart and recalculates totals', async () => {
      const store = useCartStore();
      await store.addItem(dummyAsset1);
      await store.addItem(dummyAsset2);
      expect(store.itemCount).toBe(2);

      await store.removeItem('asset_1');
      expect(store.itemCount).toBe(1);
      expect(store.hasItem('asset_1')).toBe(false);
      expect(store.hasItem('asset_2')).toBe(true);
      expect(store.subtotal).toBe(100000);
    });

    it('rolls back removed item if backend sync fails', async () => {
      const authStore = useAuthStore();
      authStore.token = 'valid.token';
      authStore.user = { id: 'usr_buyer' } as any;

      vi.mocked(cartService.addToCart).mockResolvedValue({ cartItemId: 'ci_1', alreadyInCart: false });
      vi.mocked(cartService.removeFromCart).mockRejectedValue(new Error('Delete failed'));

      const store = useCartStore();
      await store.addItem(dummyAsset1);
      expect(store.itemCount).toBe(1);

      await store.removeItem('asset_1');
      // Rolled back
      expect(store.itemCount).toBe(1);
      expect(mockToast.error).toHaveBeenCalled();
    });
  });

  describe('clearCart()', () => {
    it('empties all cart items', async () => {
      const store = useCartStore();
      await store.addItem(dummyAsset1);
      await store.addItem(dummyAsset2);

      await store.clearCart();
      expect(store.itemCount).toBe(0);
      expect(store.subtotal).toBe(0);
    });
  });
});
