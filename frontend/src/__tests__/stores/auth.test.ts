import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../../stores/auth';
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
    it('sets user, token, and persists to localStorage on successful login', async () => {
      const store = useAuthStore();
      vi.mocked(authService.login).mockResolvedValue({
        user: dummyUser,
        accessToken: 'access.jwt.token',
      });

      await store.login({ email: 'creator@assetmarket.com', password: 'Password123!' });

      expect(store.user).toEqual(dummyUser);
      expect(store.token).toBe('access.jwt.token');
      expect(store.isAuthenticated).toBe(true);
      expect(localStorage.getItem('access_token')).toBe('access.jwt.token');
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
      expect(store.isAuthenticated).toBe(true);
    });
  });

  describe('logout()', () => {
    it('clears user, token, and localStorage', async () => {
      const store = useAuthStore();
      store.user = dummyUser;
      store.token = 'existing.token';
      localStorage.setItem('access_token', 'existing.token');

      vi.mocked(authService.logout).mockResolvedValue({ success: true } as any);

      await store.logout();

      expect(store.user).toBeNull();
      expect(store.token).toBeNull();
      expect(store.isAuthenticated).toBe(false);
      expect(localStorage.getItem('access_token')).toBeNull();
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
