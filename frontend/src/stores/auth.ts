import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authService, type LoginCredentials, type RegisterCredentials } from '../services/auth';
import type { User } from '../types';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem('access_token'));
  const isLoading = ref<boolean>(false);
  const isInitialized = ref<boolean>(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const isAdmin = computed(() => user.value?.role === 'admin' || user.value?.role === 'superadmin');
  const isSuperAdmin = computed(() => user.value?.role === 'superadmin');
  const isSeller = computed(() => user.value?.isVerifiedSeller ?? false);

  function setAuthData(newUser: User, newToken: string) {
    user.value = newUser;
    token.value = newToken;
    localStorage.setItem('access_token', newToken);
    error.value = null;
  }

  function updateUser(updatedUser: Partial<User>) {
    if (user.value) {
      user.value = { ...user.value, ...updatedUser };
    }
  }

  function clearAuth() {
    user.value = null;
    token.value = null;
    localStorage.removeItem('access_token');
  }

  async function login(credentials: LoginCredentials) {
    isLoading.value = true;
    error.value = null;
    try {
      const data = await authService.login(credentials);
      setAuthData(data.user, data.accessToken);
      return data;
    } catch (err: any) {
      error.value = err?.message || 'Login failed';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function register(credentials: RegisterCredentials) {
    isLoading.value = true;
    error.value = null;
    try {
      const data = await authService.register(credentials);
      setAuthData(data.user, data.accessToken);
      return data;
    } catch (err: any) {
      error.value = err?.message || 'Registration failed';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function logout() {
    isLoading.value = true;
    try {
      await authService.logout();
    } finally {
      clearAuth();
      isLoading.value = false;
    }
  }

  /**
   * Initializes authentication state on initial page load / refresh.
   */
  async function initAuth() {
    if (isInitialized.value) return;

    if (token.value) {
      try {
        const currentUser = await authService.getMe();
        user.value = currentUser;
      } catch {
        // Access token might be expired; try silent refresh via HttpOnly cookie
        try {
          const refreshData = await authService.refreshToken();
          setAuthData(refreshData.user, refreshData.accessToken);
        } catch {
          clearAuth();
        }
      }
    } else {
      // Try silent refresh in case session cookie still valid
      try {
        const refreshData = await authService.refreshToken();
        setAuthData(refreshData.user, refreshData.accessToken);
      } catch {
        clearAuth();
      }
    }

    isInitialized.value = true;
  }

  // Handle global session-expired events
  if (typeof window !== 'undefined') {
    window.addEventListener('auth:session-expired', () => {
      clearAuth();
    });
  }

  return {
    user,
    token,
    isLoading,
    isInitialized,
    error,
    isAuthenticated,
    isAdmin,
    isSuperAdmin,
    isSeller,
    login,
    register,
    logout,
    initAuth,
    updateUser,
  };
});
