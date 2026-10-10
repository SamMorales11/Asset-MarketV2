import { apiClient } from './api';
import type {
  ApiResponse,
  AdminDashboardData,
  AdminUsersResponse,
  AdminUserDetail,
  AdminRevenueResponse,
  AdminUserRevenueDetail,
  AdminAccountItem,
  AdminAccountDetail,
  CreateAdminPayload,
  UpdateAdminPayload,
  AuditTrailResponse,
} from '../types';

export const adminService = {
  async getDashboard(): Promise<AdminDashboardData> {
    const res = await apiClient.get<ApiResponse<AdminDashboardData>>('/admin/dashboard');
    if (!res.data.data) {
      throw new Error(res.data.message || 'Gagal memuat dashboard admin');
    }
    return res.data.data;
  },

  async getUsers(params?: {
    page?: number;
    limit?: number;
    role?: string;
    status?: string;
    search?: string;
  }): Promise<AdminUsersResponse> {
    const res = await apiClient.get<ApiResponse<AdminUsersResponse>>('/admin/users', { params });
    if (!res.data.data) {
      throw new Error(res.data.message || 'Gagal memuat daftar pengguna');
    }
    return res.data.data;
  },

  async getUserDetail(id: string): Promise<AdminUserDetail> {
    const res = await apiClient.get<ApiResponse<AdminUserDetail>>(`/admin/users/${id}`);
    if (!res.data.data) {
      throw new Error(res.data.message || 'Gagal memuat detail pengguna');
    }
    return res.data.data;
  },

  async updateUser(
    id: string,
    data: {
      name?: string;
      email?: string;
      role?: string;
      isVerifiedSeller?: boolean;
      phone?: string | null;
      bio?: string | null;
      bankName?: string | null;
      bankAccountNumber?: string | null;
      bankAccountHolder?: string | null;
    }
  ): Promise<any> {
    const res = await apiClient.put<ApiResponse<any>>(`/admin/users/${id}`, data);
    return res.data;
  },

  async toggleUserStatus(id: string): Promise<{ id: string; isActive: boolean; deletedAt: string | null }> {
    const res = await apiClient.post<ApiResponse<{ id: string; isActive: boolean; deletedAt: string | null }>>(
      `/admin/users/${id}/toggle-status`
    );
    if (!res.data.data) {
      throw new Error(res.data.message || 'Gagal mengubah status pengguna');
    }
    return res.data.data;
  },

  async getUsersRevenue(search?: string): Promise<AdminRevenueResponse> {
    const res = await apiClient.get<ApiResponse<AdminRevenueResponse>>('/admin/revenue/users', {
      params: { search },
    });
    if (!res.data.data) {
      throw new Error(res.data.message || 'Gagal memuat laporan revenue pengguna');
    }
    return res.data.data;
  },

  async getUserRevenueDetail(id: string): Promise<AdminUserRevenueDetail> {
    const res = await apiClient.get<ApiResponse<AdminUserRevenueDetail>>(`/admin/revenue/users/${id}`);
    if (!res.data.data) {
      throw new Error(res.data.message || 'Gagal memuat rincian revenue pengguna');
    }
    return res.data.data;
  },

  /**
   * Audit Trail Activity Logs
   */
  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
    action?: string;
    targetEntity?: string;
    adminId?: string;
    search?: string;
  }): Promise<AuditTrailResponse> {
    const res = await apiClient.get<ApiResponse<AuditTrailResponse>>('/admin/audit-logs', { params });
    if (!res.data.data) {
      throw new Error(res.data.message || 'Gagal memuat log audit admin');
    }
    return res.data.data;
  },

  /**
   * Superadmin Only: Manage Admins CRUD
   */
  async getAdmins(): Promise<{ admins: AdminAccountItem[]; count: number }> {
    const res = await apiClient.get<ApiResponse<{ admins: AdminAccountItem[]; count: number }>>('/admin/admins');
    if (!res.data.data) {
      throw new Error(res.data.message || 'Gagal memuat daftar admin');
    }
    return res.data.data;
  },

  async getAdminDetail(id: string): Promise<AdminAccountDetail> {
    const res = await apiClient.get<ApiResponse<AdminAccountDetail>>(`/admin/admins/${id}`);
    if (!res.data.data) {
      throw new Error(res.data.message || 'Gagal memuat detail admin');
    }
    return res.data.data;
  },

  async createAdmin(payload: CreateAdminPayload): Promise<AdminAccountItem> {
    const res = await apiClient.post<ApiResponse<AdminAccountItem>>('/admin/admins', payload);
    if (!res.data.data) {
      throw new Error(res.data.message || 'Gagal membuat admin');
    }
    return res.data.data;
  },

  async updateAdmin(id: string, payload: UpdateAdminPayload): Promise<AdminAccountItem> {
    const res = await apiClient.put<ApiResponse<AdminAccountItem>>(`/admin/admins/${id}`, payload);
    if (!res.data.data) {
      throw new Error(res.data.message || 'Gagal memperbarui admin');
    }
    return res.data.data;
  },

  async deleteAdmin(id: string): Promise<{ id: string; isActive: boolean; deletedAt: string }> {
    const res = await apiClient.delete<ApiResponse<{ id: string; isActive: boolean; deletedAt: string }>>(
      `/admin/admins/${id}`
    );
    if (!res.data.data) {
      throw new Error(res.data.message || 'Gagal menonaktifkan admin');
    }
    return res.data.data;
  },

  async reactivateAdmin(id: string): Promise<{ id: string; isActive: boolean; deletedAt: null }> {
    const res = await apiClient.post<ApiResponse<{ id: string; isActive: boolean; deletedAt: null }>>(
      `/admin/admins/${id}/reactivate`
    );
    if (!res.data.data) {
      throw new Error(res.data.message || 'Gagal mengaktifkan kembali admin');
    }
    return res.data.data;
  },
};
