import { apiClient } from './api';
import type { Asset, Category, Pagination, ApiResponse } from '../types';

export interface PendingAssetWithFiles extends Asset {
  files?: Array<{
    id: string;
    fileName: string;
    fileSizeBytes: number;
    mimeType: string;
    fileExtension?: string;
    version: string;
  }>;
}

export interface AssetFilterParams {
  category?: string;
  type?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'rating';
  page?: number;
  limit?: number;
}

export const assetService = {
  /**
   * Upload digital asset with upload progress tracking
   */
  async uploadAsset(
    formData: FormData,
    onProgress?: (percent: number) => void
  ): Promise<Asset> {
    const response = await apiClient.post<ApiResponse<{ asset: Asset }>>(
      '/assets/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 180000,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentCompleted);
          }
        },
      }
    );

    if (!response.data.data?.asset) {
      throw new Error(response.data.message || 'Upload failed');
    }
    return response.data.data.asset;
  },

  /**
   * Get assets uploaded by current authenticated seller
   */
  async getMyListings(): Promise<Asset[]> {
    const response = await apiClient.get<ApiResponse<{ assets: Asset[] }>>('/assets/my');
    return response.data.data?.assets || [];
  },

  /**
   * Seller: Submit or resubmit an asset for administrator moderation
   */
  async submitForModeration(assetId: string): Promise<Asset> {
    const response = await apiClient.post<ApiResponse<{ asset: Asset }>>(
      `/assets/${assetId}/submit`
    );
    if (!response.data.data?.asset) {
      throw new Error(response.data.message || 'Gagal mengajukan aset ke moderasi admin');
    }
    return response.data.data.asset;
  },

  /**
   * Admin: Get queue of pending assets awaiting review
   */
  async getPendingAssets(): Promise<PendingAssetWithFiles[]> {
    const response = await apiClient.get<ApiResponse<{ pendingAssets: PendingAssetWithFiles[] }>>(
      '/admin/assets/pending'
    );
    return response.data.data?.pendingAssets || [];
  },

  /**
   * Admin: Approve asset and publish to public marketplace
   */
  async approveAsset(assetId: string): Promise<Asset> {
    const response = await apiClient.post<ApiResponse<{ asset: Asset }>>(
      `/admin/assets/${assetId}/approve`
    );
    if (!response.data.data?.asset) {
      throw new Error(response.data.message || 'Approval failed');
    }
    return response.data.data.asset;
  },

  /**
   * Admin: Reject asset with mandatory rejection reason
   */
  async rejectAsset(assetId: string, rejectionReason: string): Promise<Asset> {
    const response = await apiClient.post<ApiResponse<{ asset: Asset }>>(
      `/admin/assets/${assetId}/reject`,
      { rejectionReason }
    );
    if (!response.data.data?.asset) {
      throw new Error(response.data.message || 'Rejection failed');
    }
    return response.data.data.asset;
  },

  /**
   * Fetch available marketplace categories
   */
  async getCategories(): Promise<Category[]> {
    const response = await apiClient.get<ApiResponse<{ categories: Category[] }>>('/categories');
    return response.data.data?.categories || [];
  },

  /**
   * Public marketplace assets listing with filters and pagination
   */
  async getPublicAssets(
    params?: AssetFilterParams
  ): Promise<{ assets: Asset[]; pagination: Pagination }> {
    const response = await apiClient.get<
      ApiResponse<{ assets: Asset[]; pagination: Pagination }>
    >('/assets', {
      params,
    });

    const fallbackPagination: Pagination = {
      total: response.data.data?.assets?.length || 0,
      page: params?.page || 1,
      limit: params?.limit || 9,
      totalPages: Math.ceil((response.data.data?.assets?.length || 0) / (params?.limit || 9)) || 1,
    };

    return {
      assets: response.data.data?.assets || [],
      pagination: response.data.data?.pagination || fallbackPagination,
    };
  },

  /**
   * Public asset detail by ID or Slug
   */
  async getAssetByIdOrSlug(idOrSlug: string): Promise<Asset> {
    const response = await apiClient.get<ApiResponse<{ asset: Asset }>>(`/assets/${idOrSlug}`);
    if (!response.data.data?.asset) {
      throw new Error(response.data.message || 'Asset not found');
    }
    return response.data.data.asset;
  },
};
