import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
} from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

/**
 * Normalized API Error structure
 * Ensures consistent error shape across all API calls
 */
export interface ApiError {
  success: false;
  message: string;
  code?: string;
  errors?: Array<{ field: string; message: string }>;
  originalError?: string;
}

function normalizeError(error: AxiosError | unknown): ApiError {
  // Axios error with response
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ success?: boolean; message?: string; code?: string; error?: any }>;

    // Server returned an error response
    if (axiosError.response?.data) {
      const data = axiosError.response.data;
      return {
        success: false,
        message: data?.message || axiosError.message || 'Terjadi kesalahan server',
        code: data?.code,
        errors: data?.error,
      };
    }

    // Network error
    if (axiosError.message === 'Network Error' || !axiosError.response) {
      return {
        success: false,
        message: 'Koneksi terputus. Periksa koneksi internet Anda.',
        code: 'NETWORK_ERROR',
      };
    }

    // Request timeout
    if (axiosError.code === 'ECONNABORTED') {
      return {
        success: false,
        message: 'Request timeout. Silakan coba lagi.',
        code: 'TIMEOUT',
      };
    }
  }

  // Unknown error
  return {
    success: false,
    message: 'Terjadi kesalahan yang tidak terduga',
    code: 'UNKNOWN_ERROR',
    originalError: error instanceof Error ? error.message : String(error),
  };
}

// Create central Axios client
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send and receive HttpOnly cookies across origins
  timeout: 15000,
});

// Request Interceptor: Attach Bearer Access Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(normalizeError(error))
);

// Concurrency Queue for Silent Token Refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

// Response Interceptor: Handle 401 & Automatic Token Refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!originalRequest) {
      return Promise.reject(normalizeError(error));
    }

    const requestUrl = originalRequest.url || '';
    const isAuthRoute =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/refresh');

    // If 401 and not an authentication route and hasn't been retried yet
    if (error.response?.status === 401 && !isAuthRoute && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue concurrent requests while token is refreshing
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (newToken: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
              }
              resolve(apiClient(originalRequest));
            },
            reject: (err) => reject(err),
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Direct call to refresh endpoint using HttpOnly cookie
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = refreshResponse.data?.data?.accessToken;

        if (!newAccessToken) {
          throw new Error('Refresh response missing access token');
        }

        localStorage.setItem('access_token', newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('access_token');
        // Dispatch custom event for stores/router to react to session expiration
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
        return Promise.reject(normalizeError(refreshErr));
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(normalizeError(error));
  }
);
