import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import HomePage from '../pages/HomePage.vue';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../composables/useToast';
import type { UserRole } from '../types';

declare module 'vue-router' {
  interface RouteMeta {
    title?: string;
    description?: string;
    requiresAuth?: boolean;
    roles?: UserRole[];
    guestOnly?: boolean;
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: HomePage,
    meta: {
      title: 'Asset Market — Curated Digital Asset Marketplace for Visionaries',
      description: 'Platform marketplace aset digital premium untuk UI templates, source code, model 3D, dan grafis berkualitas tinggi dengan bagi hasil 60% untuk kreator.',
    },
  },
  {
    path: '/explore',
    name: 'Catalog',
    component: () => import('../pages/CatalogPage.vue'),
    meta: {
      title: 'Katalog Aset Digital — UI Templates, 3D Models, Source Code | Asset Market',
      description: 'Jelajahi dan unduh ribuan aset digital terverifikasi dengan lisensi komersial dan garansi keamanan transfer manual.',
    },
  },
  {
    path: '/categories',
    redirect: '/explore',
  },
  {
    path: '/panduan',
    name: 'Guide',
    component: () => import('../pages/GuidePage.vue'),
    meta: {
      title: 'Panduan Pengguna & Kreator (Registrasi, Login, Jual & Edit Aset) — Asset Market',
      description: 'Panduan lengkap langkah demi langkah cara mendaftar akun, menjaga keamanan login, menjual aset digital untuk bagi hasil 60%, serta mengelola listing Anda.',
    },
  },
  {
    path: '/guide',
    redirect: '/panduan',
  },
  {
    path: '/assets/:id',
    name: 'AssetDetail',
    component: () => import('../pages/AssetDetailPage.vue'),
    meta: {
      title: 'Detail & Preview Aset Digital — Asset Market',
      description: 'Lihat rincian spesifikasi, preview visual, demo interaktif, lisensi, dan ulasan pembeli aset digital terpilih.',
    },
  },
  {
    path: '/cart',
    name: 'Cart',
    component: () => import('../pages/CartPage.vue'),
    meta: {
      title: 'Keranjang Belanja — Asset Market',
      description: 'Daftar aset digital pilihan Anda siap untuk checkout dan pembayaran manual aman.',
    },
  },
  {
    path: '/checkout',
    name: 'Checkout',
    component: () => import('../pages/CheckoutPage.vue'),
    meta: {
      title: 'Checkout & Instruksi Transfer Bank Manual — Asset Market',
      description: 'Selesaikan transaksi pembelian aset dengan instruksi transfer bank manual dan verifikasi escrow terpercaya.',
      requiresAuth: true,
    },
  },
  {
    path: '/transactions/:invoiceNumber',
    name: 'PaymentStatus',
    component: () => import('../pages/PaymentStatusPage.vue'),
    meta: {
      title: 'Status Pembayaran & Verifikasi Admin — Asset Market',
      description: 'Pantau status verifikasi bukti transfer manual oleh administrator dan unduh aset yang sudah diverifikasi.',
      requiresAuth: true,
    },
  },
  {
    path: '/purchases',
    name: 'PurchasedAssets',
    component: () => import('../pages/PurchasedAssetsPage.vue'),
    meta: {
      title: 'My Assets (Perpustakaan Unduhan Saya) — Asset Market',
      description: 'Akses dan unduh seluruh berkas arsip aset digital yang telah berhasil Anda beli selamanya.',
      requiresAuth: true,
    },
  },
  {
    path: '/my-assets',
    redirect: '/purchases',
  },
  {
    path: '/library',
    redirect: '/purchases',
  },
  {
    path: '/transactions',
    name: 'TransactionHistory',
    component: () => import('../pages/TransactionHistoryPage.vue'),
    meta: {
      title: 'Riwayat Transaksi & Pembelian — Asset Market',
      description: 'Laporan riwayat transaksi pembelian dan invoice resmi pembayaran aset digital.',
      requiresAuth: true,
    },
  },
  {
    path: '/revenue',
    name: 'Revenue',
    component: () => import('../pages/RevenuePage.vue'),
    meta: {
      title: 'Revenue & Payout (Bagi Hasil 60%) — Asset Market',
      description: 'Laporan pendapatan penjualan aset kreator (60% split), mutasi buku besar, dan pengajuan pencairan saldo.',
      requiresAuth: true,
    },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../pages/LoginPage.vue'),
    meta: {
      title: 'Sign In (Masuk ke Akun) — Asset Market',
      description: 'Masuk ke akun Asset Market Anda untuk mengakses aset, dashboard, atau kelola listing kreator.',
      guestOnly: true,
    },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../pages/RegisterPage.vue'),
    meta: {
      title: 'Create Account (Daftar Akun Baru) — Asset Market',
      description: 'Daftar akun gratis di Asset Market untuk mulai membeli aset digital atau menjadi kreator dengan bagi hasil 60%.',
      guestOnly: true,
    },
  },
  {
    path: '/upload',
    name: 'UploadAsset',
    component: () => import('../pages/UploadAssetPage.vue'),
    meta: {
      title: 'Upload Aset Digital Baru (Kreator 60/40) — Asset Market',
      description: 'Publikasikan karya digital Anda ke etalase publik dan nikmati bagi hasil 60% dari setiap penjualan bersih.',
      requiresAuth: true,
    },
  },
  {
    path: '/sell',
    redirect: '/upload',
  },
  {
    path: '/listings',
    name: 'MyListings',
    component: () => import('../pages/MyListingsPage.vue'),
    meta: {
      title: 'My Asset Listings (Kelola Portofolio Kreator) — Asset Market',
      description: 'Kelola portofolio listing aset digital Anda, pantau status pending/approved/rejected, dan edit informasi produk.',
      requiresAuth: true,
    },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../pages/DashboardPage.vue'),
    meta: {
      title: 'Dashboard Pengguna & Kreator — Asset Market',
      description: 'Pusat ringkasan statistik aset yang dimiliki, listing aktif, saldo pendapatan, dan aktivitas terbaru.',
      requiresAuth: true,
    },
  },
  {
    path: '/settings/payment',
    name: 'PaymentSettings',
    component: () => import('../pages/PaymentSettingsPage.vue'),
    meta: {
      title: 'Pengaturan Rekening Bank & Payout — Asset Market',
      description: 'Konfigurasi informasi rekening bank lokal (BCA, Mandiri, BNI, BRI) untuk penerimaan penarikan saldo pendapatan 60%.',
      requiresAuth: true,
    },
  },
  {
    path: '/payment-settings',
    redirect: '/settings/payment',
  },
  {
    path: '/settings/profile',
    name: 'EditProfile',
    component: () => import('../pages/EditProfilePage.vue'),
    meta: {
      title: 'Edit Profil Pengguna & Kreator — Asset Market',
      description: 'Perbarui nama lengkap, bio kreator, nomor telepon, dan identitas profil publik Anda.',
      requiresAuth: true,
    },
  },
  {
    path: '/profile',
    redirect: '/settings/profile',
  },
  {
    path: '/edit-profile',
    redirect: '/settings/profile',
  },
  {
    path: '/admin',
    redirect: '/admin/dashboard',
  },
  {
    path: '/admin/dashboard',
    name: 'AdminDashboard',
    component: () => import('../pages/AdminDashboardPage.vue'),
    meta: {
      title: 'Admin Dashboard — Asset Market',
      requiresAuth: true,
      roles: ['admin', 'superadmin'],
    },
  },
  {
    path: '/admin/approvals',
    name: 'AdminApprovals',
    component: () => import('../pages/AdminApprovalPage.vue'),
    meta: {
      title: 'Moderation Queue & Verifikasi Pembayaran — Asset Market',
      requiresAuth: true,
      roles: ['admin', 'superadmin'],
    },
  },
  {
    path: '/admin/users',
    name: 'AdminUsers',
    component: () => import('../pages/AdminUsersPage.vue'),
    meta: {
      title: 'Manage Users & Hak Akses — Asset Market',
      requiresAuth: true,
      roles: ['admin', 'superadmin'],
    },
  },
  {
    path: '/admin/revenue',
    name: 'AdminRevenue',
    component: () => import('../pages/AdminRevenuePage.vue'),
    meta: {
      title: 'Laporan User Revenue (60/40) — Asset Market',
      requiresAuth: true,
      roles: ['admin', 'superadmin'],
    },
  },
  {
    path: '/admin/admins',
    name: 'AdminManageAdmins',
    component: () => import('../pages/AdminManageAdminsPage.vue'),
    meta: {
      title: 'SuperAdmin: Manage Admins — Asset Market',
      requiresAuth: true,
      roles: ['superadmin'],
    },
  },
  {
    path: '/admin/manage-admins',
    redirect: '/admin/admins',
  },
  {
    path: '/admin/payments',
    redirect: '/admin/approvals',
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../pages/NotFoundPage.vue'),
    meta: { title: '404: Halaman Tidak Ditemukan — Asset Market' },
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

// Role-Based Navigation Guard
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  // Ensure auth state is initialized (including silent refresh from HttpOnly cookie)
  if (!authStore.isInitialized) {
    await authStore.initAuth();
  }

  // Guest Only Routes (Login, Register)
  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return next({ path: '/dashboard' });
  }

  // Protected Routes
  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      return next({
        path: '/login',
        query: { redirect: to.fullPath },
      });
    }

    // Role-Based Access Control (RBAC)
    if (to.meta.roles && to.meta.roles.length > 0) {
      const userRole = authStore.user?.role;
      if (!userRole || !to.meta.roles.includes(userRole)) {
        // Insufficient permissions -> redirect to general dashboard
        return next({ path: '/dashboard' });
      }
    }
  }

  return next();
});

// Dynamic Title & Meta Description SEO Handler
router.afterEach((to) => {
  if (to.meta.title) {
    document.title = String(to.meta.title);
  }
  if (to.meta.description) {
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', String(to.meta.description));
  }
});

// Graceful Session Expiration Handler
if (typeof window !== 'undefined') {
  let isHandlingSessionExpiry = false;

  window.addEventListener('auth:session-expired', () => {
    if (isHandlingSessionExpiry) return;
    isHandlingSessionExpiry = true;

    try {
      const { toast } = useToast();
      toast.warning(
        'Sesi Login Berakhir',
        'Sesi Anda telah kedaluwarsa. Silakan login kembali untuk melanjutkan tindakan Anda.'
      );
    } catch {
      // Toast fallback if context is unavailable
    }

    const currentRoute = router.currentRoute.value;
    if (currentRoute.meta.requiresAuth) {
      router.push({
        path: '/login',
        query: { redirect: currentRoute.fullPath },
      });
    }

    setTimeout(() => {
      isHandlingSessionExpiry = false;
    }, 3000);
  });
}

