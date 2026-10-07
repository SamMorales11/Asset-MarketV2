import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { cartService } from '../services/transactions';
import { useAuthStore } from './auth';
import { useToast } from '../composables/useToast';
import type { Asset } from '../types';

export interface LocalCartItem {
  id: string;
  cartItemId?: string;
  assetId: string;
  asset: Asset;
  price: number;
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<LocalCartItem[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const authStore = useAuthStore();
  const toast = useToast();

  const itemCount = computed(() => items.value.length);
  const subtotal = computed(() =>
    items.value.reduce(
      (sum, item) => sum + (item.asset.discountPrice ?? item.asset.price),
      0
    )
  );
  const totalAmount = computed(() => subtotal.value);

  function hasItem(assetId: string): boolean {
    return items.value.some((i) => i.assetId === assetId || i.id === assetId);
  }

  /**
   * Load Cart from Backend API (if logged in)
   */
  async function fetchCart() {
    if (!authStore.isAuthenticated) return;

    isLoading.value = true;
    error.value = null;

    try {
      const data = await cartService.getCart();
      items.value = data.items.map((item) => ({
        id: item.cartItemId || item.id,
        cartItemId: item.cartItemId,
        assetId: item.assetId,
        asset: item.asset,
        price: item.effectivePrice ?? (item.asset.discountPrice ?? item.asset.price),
      }));
    } catch (err: any) {
      console.warn('Could not sync cart from backend:', err?.message);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Add Item to Cart
   */
  async function addItem(asset: Asset) {
    // Prevent duplicate addition
    if (hasItem(asset.id)) return;

    const price = asset.discountPrice ?? asset.price;
    const localEntry: LocalCartItem = {
      id: asset.id,
      assetId: asset.id,
      asset,
      price,
    };

    // Optimistic update
    items.value.push(localEntry);

    if (authStore.isAuthenticated) {
      try {
        const res = await cartService.addToCart(asset.id);
        localEntry.cartItemId = res.cartItemId;
      } catch (err: any) {
        // Rollback optimistic update
        const idx = items.value.findIndex(i => i.id === asset.id);
        if (idx !== -1) {
          items.value.splice(idx, 1);
        }
        // Show error notification
        toast.error('Gagal Menambah ke Keranjang', err?.message || 'Terjadi kesalahan saat menambahkan item');
        console.error('Failed to sync cart item:', err);
      }
    }
  }

  /**
   * Remove Item from Cart
   */
  async function removeItem(itemIdOrAssetId: string) {
    const itemToRemove = items.value.find(
      (i) => i.id === itemIdOrAssetId || i.assetId === itemIdOrAssetId || i.cartItemId === itemIdOrAssetId
    );

    // Store for rollback
    const removedIdx = items.value.findIndex(
      (i) => i.id === itemIdOrAssetId || i.assetId === itemIdOrAssetId || i.cartItemId === itemIdOrAssetId
    );
    const removedItem = removedIdx !== -1 ? { ...items.value[removedIdx] } : null;

    // Optimistic remove
    items.value = items.value.filter(
      (i) => i.id !== itemIdOrAssetId && i.assetId !== itemIdOrAssetId && i.cartItemId !== itemIdOrAssetId
    );

    if (authStore.isAuthenticated && itemToRemove) {
      try {
        const idToDelete = itemToRemove.cartItemId || itemToRemove.assetId;
        await cartService.removeFromCart(idToDelete);
      } catch (err: any) {
        // Rollback optimistic remove
        if (removedItem && removedIdx !== -1) {
          items.value.splice(removedIdx, 0, removedItem);
        }
        // Show error notification
        toast.error('Gagal Menghapus dari Keranjang', err?.message || 'Terjadi kesalahan saat menghapus item');
        console.error('Failed to remove cart item:', err);
      }
    }
  }

  /**
   * Clear All Items in Cart
   */
  async function clearCart() {
    // Store for potential rollback
    const previousItems = [...items.value];

    // Optimistic clear
    items.value = [];

    if (authStore.isAuthenticated) {
      try {
        await cartService.clearCart();
      } catch (err: any) {
        // Rollback optimistic clear
        items.value = previousItems;
        // Show error notification
        toast.error('Gagal Mengosongkan Keranjang', err?.message || 'Terjadi kesalahan saat mengosongkan keranjang');
        console.error('Failed to clear cart:', err);
      }
    }
  }

  return {
    items,
    itemCount,
    subtotal,
    totalAmount,
    isLoading,
    error,
    hasItem,
    fetchCart,
    addItem,
    removeItem,
    clearCart,
  };
});
