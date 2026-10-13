import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../../stores/auth';
import { getAccessToken, clearAccessToken } from '../../services/token';
import type { User } from '../../types';

vi.mock('../../services/auth', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
    refreshToken: vi.fn(),
  },
}));

import { authService } from '../../services/auth';

describe('useAuthStore (Pinia)', () => {
  const dummyUser: User = {
    id: 'usr_123',
    email: 'creator@assetmarket.com',
    name: 'Elena Rostova',
    role: 'seller',
    avatarUrl: null,
    isVerifiedSeller: true,
    bankName: 'BCA',
    bankAccountNumber: '12345678',
    bankAccountHolder: 'Elena Rostova',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    clearAccessToken();
    vi.clearAllMocks();
  });

  describe('Initial State & Role Computeds', () => {
    it('initializes with unauthenticated state', () => {
      const store = useAuthStore();
      expect(store.user).toBeNull();
      expect(store.token).toBeNull();
      expect(store.isAuthenticated).toBe(false);
      expect(store.isAdmin).toBe(false);
      expect(store.isSuperAdmin).toBe(false);
      expect(store.isSeller).toBe(false);
    });

    it('correctly computes role flags for admin', () => {
      const store = useAuthStore();
      store.user = { ...dummyUser, role: 'admin' };
      store.token = 'mock.jwt.token';

      expect(store.isAuthenticated).toBe(true);
      expect(store.isAdmin).toBe(true);
      expect(store.isSuperAdmin).toBe(false);
    });

    it('correctly computes role flags for superadmin', () => {
      const store = useAuthStore();
      store.user = { ...dummyUser, role: 'superadmin' };
      store.token = 'mock.jwt.token';

      expect(store.isAuthenticated).toBe(true);
      expect(store.isAdmin).toBe(true);
      expect(store.isSuperAdmin).toBe(true);
    });

    it('correctly computes isSeller from isVerifiedSeller property', () => {
      const store = useAuthStore();
      store.user = { ...dummyUser, isVerifiedSeller: true };
      expect(store.isSeller).toBe(true);

      store.user = { ...dummyUser, isVerifiedSeller: false };
      expect(store.isSeller).toBe(false);
    });
  });

  describe('login()', () => {
    it('sets user, in-memory token, and does not store access_token in localStorage on successful login', async () => {
      const store = useAuthStore();
      vi.mocked(authService.login).mockResolvedValue({
        user: dummyUser,
        accessToken: 'access.jwt.token',
      });

      await store.login({ email: 'creator@assetmarket.com', password: 'Password123!' });

      expect(store.user).toEqual(dummyUser);
      expect(store.token).toBe('access.jwt.token');
      expect(getAccessToken()).toBe('access.jwt.token');
      expect(store.isAuthenticated).toBe(true);
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(store.isLoading).toBe(false);
      expect(store.error).toBeNull();
    });

    it('handles login failure and saves error message', async () => {
      const store = useAuthStore();
      vi.mocked(authService.login).mockRejectedValue(new Error('Invalid email or password'));

      await expect(
        store.login({ email: 'wrong@test.com', password: 'bad' })
      ).rejects.toThrow('Invalid email or password');

      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
      expect(store.error).toBe('Invalid email or password');
      expect(store.isLoading).toBe(false);
    });
  });

  describe('register()', () => {
    it('sets authentication state upon successful registration', async () => {
      const store = useAuthStore();
      vi.mocked(authService.register).mockResolvedValue({
        user: dummyUser,
        accessToken: 'registered.token',
      });

      await store.register({
        name: 'Elena Rostova',
        email: 'creator@assetmarket.com',
        password: 'Password123!',
      });

      expect(store.user).toEqual(dummyUser);
      expect(store.token).toBe('registered.token');
      expect(getAccessToken()).toBe('registered.token');
      expect(store.isAuthenticated).toBe(true);
      expect(localStorage.getItem('access_token')).toBeNull();
    });
  });

  describe('logout()', () => {
    it('clears user and in-memory token', async () => {
      const store = useAuthStore();
      store.user = dummyUser;
      store.token = 'existing.token';

      vi.mocked(authService.logout).mockResolvedValue({ success: true } as any);

      await store.logout();

      expect(store.user).toBeNull();
      expect(store.token).toBeNull();
      expect(getAccessToken()).toBeNull();
      expect(store.isAuthenticated).toBe(false);
      expect(localStorage.getItem('access_token')).toBeNull();
    });
  });

  describe('initAuth()', () => {
    it('restores user and in-memory token via silent cookie refresh when starting unauthenticated', async () => {
      const store = useAuthStore();
      vi.mocked(authService.refreshToken).mockResolvedValue({
        user: dummyUser,
        accessToken: 'silent.refreshed.token',
      });

      await store.initAuth();

      expect(authService.refreshToken).toHaveBeenCalledTimes(1);
      expect(store.user).toEqual(dummyUser);
      expect(store.token).toBe('silent.refreshed.token');
      expect(getAccessToken()).toBe('silent.refreshed.token');
      expect(store.isAuthenticated).toBe(true);
      expect(store.isInitialized).toBe(true);
      expect(localStorage.getItem('access_token')).toBeNull();
    });

    it('marks initialized as true and clears auth when silent cookie refresh fails (guest mode)', async () => {
      const store = useAuthStore();
      vi.mocked(authService.refreshToken).mockRejectedValue(new Error('No refresh cookie'));

      await store.initAuth();

      expect(store.user).toBeNull();
      expect(store.token).toBeNull();
      expect(getAccessToken()).toBeNull();
      expect(store.isAuthenticated).toBe(false);
      expect(store.isInitialized).toBe(true);
    });

    it('fetches profile directly via getMe if in-memory token is already present', async () => {
      const store = useAuthStore();
      store.token = 'existing.inmemory.token';
      vi.mocked(authService.getMe).mockResolvedValue(dummyUser);

      await store.initAuth();

      expect(authService.getMe).toHaveBeenCalledTimes(1);
      expect(authService.refreshToken).not.toHaveBeenCalled();
      expect(store.user).toEqual(dummyUser);
      expect(store.isInitialized).toBe(true);
    });
  });

  describe('updateUser()', () => {
    it('partially updates current user profile in store', () => {
      const store = useAuthStore();
      store.user = dummyUser;

      store.updateUser({ name: 'Elena New Name', bankName: 'Mandiri' });

      expect(store.user?.name).toBe('Elena New Name');
      expect(store.user?.bankName).toBe('Mandiri');
      expect(store.user?.email).toBe(dummyUser.email);
    });
  });
});
