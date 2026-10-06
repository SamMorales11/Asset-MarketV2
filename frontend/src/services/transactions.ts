import { apiClient } from './api';
import type {
  ApiResponse,
  CartItem,
  Transaction,
  TransactionItem,
  PaymentConfirmation,
  DestinationBankAccount,
  PurchasedAsset,
} from '../types';

export interface CartResponse {
  cartId: string;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  platformFee: number;
  totalAmount: number;
}

export interface CheckoutResponse {
  transactionId: string;
  invoiceNumber: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  expiresAt: string;
  destinationAccounts: DestinationBankAccount[];
}

export interface TransactionDetailResponse {
  transaction: Transaction;
  items: TransactionItem[];
  paymentConfirmation: PaymentConfirmation | null;
  destinationAccounts: DestinationBankAccount[];
}

export interface AdminPendingPaymentItem {
  id: string;
  transactionId: string;
  senderBank: string;
  senderAccountNumber: string;
  senderAccountName: string;
  destinationBank: string;
  transferAmount: number;
  transferDate: string;
  proofImageUrl: string;
  status: string;
  submittedAt: string;
  buyer: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  transaction: {
    id: string;
    invoiceNumber: string;
    subtotal: number;
    totalAmount: number;
    status: string;
    createdAt: string;
    expiresAt?: string | null;
  };
  items: TransactionItem[];
}

export const cartService = {
  async getCart(): Promise<CartResponse> {
    const response = await apiClient.get<ApiResponse<CartResponse>>('/cart');
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to retrieve shopping cart');
    }
    return response.data.data;
  },

  async addToCart(assetId: string): Promise<{ cartItemId: string; assetId: string }> {
    const response = await apiClient.post<ApiResponse<{ cartItemId: string; assetId: string }>>(
      '/cart/items',
      { assetId }
    );
    return response.data.data!;
  },

  async removeFromCart(itemIdOrAssetId: string): Promise<void> {
    await apiClient.delete(`/cart/items/${itemIdOrAssetId}`);
  },

  async clearCart(): Promise<void> {
    await apiClient.delete('/cart/clear');
  },
};

export const transactionService = {
  async checkout(source: 'cart' | 'buy_now', assetId?: string): Promise<CheckoutResponse> {
    const response = await apiClient.post<ApiResponse<CheckoutResponse>>('/checkout', {
      source,
      assetId,
    });
    if (!response.data.data) {
      throw new Error(response.data.message || 'Checkout failed to initialize');
    }
    return response.data.data;
  },

  async getTransactionByInvoice(invoiceNumber: string): Promise<TransactionDetailResponse> {
    const response = await apiClient.get<ApiResponse<TransactionDetailResponse>>(
      `/transactions/${invoiceNumber}`
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Invoice details not found');
    }
    return response.data.data;
  },

  async submitPaymentConfirmation(formData: FormData): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>('/payments/confirm', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getMyPurchases(): Promise<{ purchases: PurchasedAsset[]; totalPurchased: number }> {
    const response = await apiClient.get<
      ApiResponse<{ purchases: PurchasedAsset[]; totalPurchased: number }>
    >('/purchases/my');
    return response.data.data || { purchases: [], totalPurchased: 0 };
  },

  getDownloadUrl(fileId: string): string {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
    const token = localStorage.getItem('access_token');
    return token
      ? `${baseUrl}/purchases/download/${fileId}?token=${encodeURIComponent(token)}`
      : `${baseUrl}/purchases/download/${fileId}`;
  },

  getAssetDownloadUrl(assetId: string): string {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
    const token = localStorage.getItem('access_token');
    return token
      ? `${baseUrl}/purchases/assets/${assetId}/download?token=${encodeURIComponent(token)}`
      : `${baseUrl}/purchases/assets/${assetId}/download`;
  },

  async claimFreeAsset(assetId: string): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>(`/purchases/claim/${assetId}`);
    return response.data;
  },
};

export const adminPaymentService = {
  async getPendingPayments(): Promise<AdminPendingPaymentItem[]> {
    const response = await apiClient.get<ApiResponse<{ pendingPayments: AdminPendingPaymentItem[] }>>(
      '/admin/payments/pending'
    );
    return response.data.data?.pendingPayments || [];
  },

  async verifyPayment(confirmationId: string): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>(
      `/admin/payments/${confirmationId}/verify`
    );
    return response.data;
  },

  async rejectPayment(confirmationId: string, rejectionReason: string): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>(
      `/admin/payments/${confirmationId}/reject`,
      { rejectionReason }
    );
    return response.data;
  },
};
