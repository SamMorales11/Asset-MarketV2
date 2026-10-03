import { apiClient } from './api';
import type {
  ApiResponse,
  PurchasedAsset,
  UnifiedTransactionItem,
  RevenueData,
  Transaction,
  TransactionItem,
  PaymentConfirmation,
  DashboardSummary,
  PaymentSettings,
  UpdateProfilePayload,
  User,
} from '../types';

export interface TransactionsResponse {
  transactions: UnifiedTransactionItem[];
  totalCount: number;
  summary: {
    totalPurchasesCount: number;
    totalSalesCount: number;
    totalSpent: number;
    totalEarned: number;
  };
}

export interface TransactionFullDetail {
  transaction: Transaction;
  buyer: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  isBuyer: boolean;
  isSeller: boolean;
  items: TransactionItem[];
  paymentConfirmation: PaymentConfirmation | null;
}

export const userService = {
  async getMyAssets(): Promise<{ assets: PurchasedAsset[]; totalCount: number }> {
    const response = await apiClient.get<ApiResponse<{ assets: PurchasedAsset[]; totalCount: number }>>(
      '/users/me/assets'
    );
    return response.data.data || { assets: [], totalCount: 0 };
  },

  async getMyTransactions(params?: {
    role?: string;
    status?: string;
  }): Promise<TransactionsResponse> {
    const response = await apiClient.get<ApiResponse<TransactionsResponse>>(
      '/users/me/transactions',
      { params }
    );
    return (
      response.data.data || {
        transactions: [],
        totalCount: 0,
        summary: {
          totalPurchasesCount: 0,
          totalSalesCount: 0,
          totalSpent: 0,
          totalEarned: 0,
        },
      }
    );
  },

  async getTransactionDetail(idOrInvoice: string): Promise<TransactionFullDetail> {
    const response = await apiClient.get<ApiResponse<TransactionFullDetail>>(
      `/users/me/transactions/${idOrInvoice}`
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Detail transaksi tidak ditemukan');
    }
    return response.data.data;
  },

  async getMyRevenue(): Promise<RevenueData> {
    const response = await apiClient.get<ApiResponse<RevenueData>>('/users/me/revenue');
    if (!response.data.data) {
      throw new Error(response.data.message || 'Gagal memuat rincian revenue');
    }
    return response.data.data;
  },

  async requestPayout(amount: number): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>('/users/me/payout/request', {
      amount,
    });
    return response.data;
  },

  async updateBankAccount(data: {
    bankName: string;
    bankAccountNumber: string;
    bankAccountHolder: string;
    bankBranch?: string;
  }): Promise<any> {
    const response = await apiClient.put<ApiResponse<any>>('/users/me/bank-account', data);
    return response.data;
  },

  async getDashboardSummary(): Promise<DashboardSummary> {
    const response = await apiClient.get<ApiResponse<DashboardSummary>>('/users/me/dashboard');
    if (!response.data.data) {
      throw new Error(response.data.message || 'Gagal memuat ringkasan dashboard');
    }
    return response.data.data;
  },

  async getPaymentSettings(): Promise<PaymentSettings> {
    const response = await apiClient.get<ApiResponse<PaymentSettings>>('/users/me/payment-settings');
    if (!response.data.data) {
      throw new Error(response.data.message || 'Gagal memuat informasi rekening');
    }
    return response.data.data;
  },

  async updatePaymentSettings(data: {
    bankName: string;
    bankAccountNumber: string;
    bankAccountHolder: string;
    bankBranch?: string;
    bankSwiftOrCode?: string;
  }): Promise<PaymentSettings> {
    const response = await apiClient.put<ApiResponse<PaymentSettings>>('/users/me/payment-settings', data);
    if (!response.data.data) {
      throw new Error(response.data.message || 'Gagal menyimpan pengaturan pembayaran');
    }
    return response.data.data;
  },

  async deletePaymentSettings(): Promise<void> {
    await apiClient.delete<ApiResponse<any>>('/users/me/payment-settings');
  },

  async getProfile(): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>('/users/me/profile');
    if (!response.data.data) {
      throw new Error(response.data.message || 'Gagal mengambil data profil');
    }
    return response.data.data;
  },

  async updateProfile(data: UpdateProfilePayload): Promise<User> {
    const response = await apiClient.put<ApiResponse<User>>('/users/me/profile', data);
    if (!response.data.data) {
      throw new Error(response.data.message || 'Gagal memperbarui profil');
    }
    return response.data.data;
  },
};

