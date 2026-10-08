import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { router } from '../../router/index';
import { useAuthStore } from '../../stores/auth';

describe('Router Navigation Guards & RBAC', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    localStorage.clear();
    const authStore = useAuthStore();
    authStore.isInitialized = true;
    authStore.user = null;
    authStore.token = null;
    await router.push('/');
  });

  it('allows unauthenticated navigation to public routes (Home, Explore)', async () => {
    await router.push('/explore');
    expect(router.currentRoute.value.path).toBe('/explore');

    await router.push('/');
    expect(router.currentRoute.value.path).toBe('/');
  });

  it('redirects unauthenticated user away from protected routes to /login with redirect query', async () => {
    const authStore = useAuthStore();
    authStore.user = null;
    authStore.token = null;

    await router.push('/checkout');

    expect(router.currentRoute.value.path).toBe('/login');
    expect(router.currentRoute.value.query.redirect).toBe('/checkout');
  });

  it('redirects authenticated user away from guestOnly pages (Login) to /dashboard', async () => {
    const authStore = useAuthStore();
    authStore.user = {
      id: 'usr_1',
      email: 'user@test.com',
      name: 'User',
      role: 'user',
    } as any;
    authStore.token = 'valid.token';

    await router.push('/login');
    expect(router.currentRoute.value.path).toBe('/dashboard');
  });

  it('blocks regular user (role: user) from admin routes and redirects to /dashboard', async () => {
    const authStore = useAuthStore();
    authStore.user = {
      id: 'usr_regular',
      email: 'regular@test.com',
      name: 'Regular Buyer',
      role: 'user',
    } as any;
    authStore.token = 'valid.token';

    await router.push('/admin/approvals');
    expect(router.currentRoute.value.path).toBe('/dashboard');
  });

  it('allows user with admin role to navigate to admin routes', async () => {
    const authStore = useAuthStore();
    authStore.user = {
      id: 'usr_admin',
      email: 'admin@assetmarket.com',
      name: 'Admin User',
      role: 'admin',
    } as any;
    authStore.token = 'valid.token';

    await router.push('/admin/approvals');
    expect(router.currentRoute.value.path).toBe('/admin/approvals');
  });
});
