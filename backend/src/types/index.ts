export type UserRole = 'user' | 'admin' | 'superadmin';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: unknown;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  tokenType?: 'access' | 'refresh';
  [key: string]: unknown;
}

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl: string | null;
  isVerifiedSeller: boolean;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
  createdAt: Date;
  updatedAt: Date;
}
