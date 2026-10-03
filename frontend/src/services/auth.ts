import { apiClient } from './api';
import type { User, ApiResponse } from '../types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface AuthData {
  accessToken: string;
  user: User;
}

export const authService = {
  /**
   * Log in user with email & password.
   * Access token returned in response; Refresh token saved in HttpOnly cookie.
   */
  async login(credentials: LoginCredentials): Promise<AuthData> {
    const response = await apiClient.post<ApiResponse<AuthData>>('/auth/login', credentials);
    if (!response.data.data) {
      throw new Error(response.data.message || 'Login failed');
    }
    return response.data.data;
  },

  /**
   * Register a new user account.
   */
  async register(data: RegisterCredentials): Promise<AuthData> {
    const response = await apiClient.post<ApiResponse<AuthData>>('/auth/register', data);
    if (!response.data.data) {
      throw new Error(response.data.message || 'Registration failed');
    }
    return response.data.data;
  },

  /**
   * Request new access token using HttpOnly refresh cookie.
   */
  async refreshToken(): Promise<AuthData> {
    const response = await apiClient.post<ApiResponse<AuthData>>('/auth/refresh');
    if (!response.data.data) {
      throw new Error(response.data.message || 'Token refresh failed');
    }
    return response.data.data;
  },

  /**
   * Terminate user session and clear refresh cookie.
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      localStorage.removeItem('access_token');
    }
  },

  /**
   * Fetch current authenticated user's profile.
   */
  async getMe(): Promise<User> {
    const response = await apiClient.get<ApiResponse<{ user: User }>>('/auth/me');
    if (!response.data.data?.user) {
      throw new Error(response.data.message || 'Failed to fetch user');
    }
    return response.data.data.user;
  },
};
