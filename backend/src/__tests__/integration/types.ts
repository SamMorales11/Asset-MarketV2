/**
 * Shared TypeScript interfaces for integration test response assertions.
 * Used to cast `res.json()` (typed as `unknown` by Hono) to known shapes.
 */

export interface AuthTokenResponse {
  success: boolean;
  data?: { accessToken: string; user?: { id: string; name: string; role: string; email: string } };
  message?: string;
  error?: unknown;
}

export interface AssetsListResponse {
  success: boolean;
  data?: {
    assets: Array<Record<string, unknown>>;
    pagination: { total: number; page: number; limit: number; totalPages: number };
  };
}

export interface AssetDetailResponse {
  success: boolean;
  data?: { asset: Record<string, unknown> };
  message?: string;
}

export interface AssetUploadResponse {
  success: boolean;
  data?: { asset: Record<string, unknown> };
  message?: string;
}

export interface CartResponse {
  success: boolean;
  data?: {
    items: Array<{ assetId: string; alreadyInCart?: boolean }>;
    alreadyInCart?: boolean;
    [key: string]: unknown;
  };
  message?: string;
}

export interface CheckoutResponse {
  success: boolean;
  data?: { invoiceNumber: string; transactionId: string };
  message?: string;
}

export interface PaymentConfirmResponse {
  success: boolean;
  data?: Record<string, unknown>;
  message?: string;
}

export interface PurchaseListResponse {
  success: boolean;
  data?: {
    purchases: Array<Record<string, unknown>>;
    pagination: { total: number; page: number; limit: number };
  };
  message?: string;
}

export interface DownloadResponse {
  success: boolean;
  data?: { downloadUrl: string; assetId: string };
  message?: string;
}

export interface GenericResponse {
  success: boolean;
  data?: unknown;
  message?: string;
  error?: unknown;
}
