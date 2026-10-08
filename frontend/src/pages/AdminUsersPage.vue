<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { adminService } from '../services/admin';
import { formatCurrency } from '../utils/formatters';
import type { AdminUserListItem, AdminUserDetail } from '../types';
import AdminNav from '../components/AdminNav.vue';
import TableSkeleton from '../components/TableSkeleton.vue';
import EmptyState from '../components/EmptyState.vue';
import Skeleton from '../components/Skeleton.vue';
import {
  Users,
  Search,
  Eye,
  Edit2,
  UserX,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  ShieldCheck,
  Save,
  Building2,
  Layers,
} from 'lucide-vue-next';

// State
const usersList = ref<AdminUserListItem[]>([]);
const totalUsers = ref(0);
const currentPage = ref(1);
const totalPages = ref(1);
const limit = ref(15);
const isLoading = ref(true);
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);

// Filters
const searchQuery = ref('');
const selectedRole = ref('all');
const selectedStatus = ref('all');

// Modals
// 1. User Detail Modal
const isDetailModalOpen = ref(false);
const detailLoading = ref(false);
const selectedUserDetail = ref<AdminUserDetail | null>(null);

// 2. Edit User Modal
const isEditModalOpen = ref(false);
const editLoading = ref(false);
const editingUserId = ref('');
const editForm = ref({
  name: '',
  email: '',
  role: 'user' as 'user' | 'admin' | 'superadmin',
  isVerifiedSeller: false,
  phone: '',
  bio: '',
  bankName: '',
  bankAccountNumber: '',
  bankAccountHolder: '',
});

// 3. Deactivate/Activate Confirmation
const isToggleModalOpen = ref(false);
const togglingUser = ref<AdminUserListItem | null>(null);
const toggleLoading = ref(false);

onMounted(async () => {
  await loadUsers();
});

async function loadUsers(page = 1) {
  isLoading.value = true;
  errorMessage.value = null;
  currentPage.value = page;

  try {
    const data = await adminService.getUsers({
      page,
      limit: limit.value,
      role: selectedRole.value !== 'all' ? selectedRole.value : undefined,
      status: selectedStatus.value !== 'all' ? selectedStatus.value : undefined,
      search: searchQuery.value.trim() || undefined,
    });

    usersList.value = data.users;
    totalUsers.value = data.pagination.total;
    totalPages.value = data.pagination.totalPages;
  } catch (err: any) {
    errorMessage.value = err?.message || 'Gagal memuat daftar pengguna.';
  } finally {
    isLoading.value = false;
  }
}

function handleSearch() {
  loadUsers(1);
}

function handleFilterChange() {
  loadUsers(1);
}

// Open Detail Modal
async function openDetailModal(userId: string) {
  isDetailModalOpen.value = true;
  detailLoading.value = true;
  selectedUserDetail.value = null;

  try {
    selectedUserDetail.value = await adminService.getUserDetail(userId);
  } catch (err: any) {
    errorMessage.value = err?.message || 'Gagal mengambil rincian pengguna.';
  } finally {
    detailLoading.value = false;
  }
}

// Open Edit Modal
function openEditModal(user: AdminUserListItem) {
  editingUserId.value = user.id;
  editForm.value = {
    name: user.name,
    email: user.email,
    role: user.role,
    isVerifiedSeller: user.isVerifiedSeller,
    phone: user.phone || '',
    bio: user.bio || '',
    bankName: user.bankName || '',
    bankAccountNumber: user.bankAccountNumber || '',
    bankAccountHolder: user.bankAccountHolder || '',
  };
  isEditModalOpen.value = true;
}

// Save Edit User
async function handleSaveEdit() {
  editLoading.value = true;
  try {
    await adminService.updateUser(editingUserId.value, {
      name: editForm.value.name,
      email: editForm.value.email,
      role: editForm.value.role,
      isVerifiedSeller: editForm.value.isVerifiedSeller,
      phone: editForm.value.phone || null,
      bio: editForm.value.bio || null,
      bankName: editForm.value.bankName || null,
      bankAccountNumber: editForm.value.bankAccountNumber || null,
      bankAccountHolder: editForm.value.bankAccountHolder || null,
    });

    successMessage.value = `Data pengguna ${editForm.value.name} berhasil diperbarui.`;
    isEditModalOpen.value = false;
    await loadUsers(currentPage.value);
  } catch (err: any) {
    errorMessage.value = err?.message || 'Gagal memperbarui pengguna.';
  } finally {
    editLoading.value = false;
  }
}

// Open Toggle Active/Deactivate
function openToggleStatusModal(user: AdminUserListItem) {
  togglingUser.value = user;
  isToggleModalOpen.value = true;
}

// Confirm Toggle Status
async function handleConfirmToggle() {
  if (!togglingUser.value) return;

  toggleLoading.value = true;
  try {
    const res = await adminService.toggleUserStatus(togglingUser.value.id);
    successMessage.value = res.isActive
      ? `Akun ${togglingUser.value.name} berhasil diaktifkan kembali.`
      : `Akun ${togglingUser.value.name} berhasil dinonaktifkan.`;
    isToggleModalOpen.value = false;
    await loadUsers(currentPage.value);
  } catch (err: any) {
    errorMessage.value = err?.message || 'Gagal mengubah status pengguna.';
  } finally {
    toggleLoading.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <!-- Breadcrumb -->
    <nav class="mb-4 flex items-center gap-2 text-xs text-text-secondary">
      <router-link to="/" class="hover:text-text-primary transition">Home</router-link>
      <span>/</span>
      <router-link to="/admin" class="hover:text-text-primary transition">Admin</router-link>
      <span>/</span>
      <span class="text-text-primary font-medium">Manage Users</span>
    </nav>

    <!-- Admin Nav -->
    <AdminNav />

    <!-- Page Header -->
    <div class="mb-8 border-b border-border pb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
          <Users class="h-4 w-4" />
          <span>User Directory & RBAC</span>
        </div>
        <h1 class="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-text-primary">
          Manajemen Pengguna & Hak Akses
        </h1>
        <p class="text-xs text-text-secondary mt-1 max-w-2xl leading-relaxed">
          Kelola seluruh akun terdaftar, status verifikasi penjual (60% bagi hasil), hak akses admin, dan kontrol deaktivasi akun.
        </p>
      </div>

      <span class="rounded-full bg-secondary/10 border border-secondary/30 px-3.5 py-1 text-xs font-mono font-bold text-secondary">
        {{ totalUsers }} Pengguna Terdata
      </span>
    </div>

    <!-- FEEDBACK ALERT -->
    <div
      v-if="successMessage"
      class="mb-6 flex items-center justify-between rounded-2xl border border-success/30 bg-success/10 p-4 text-xs font-medium text-success"
    >
      <div class="flex items-center gap-2.5">
        <CheckCircle2 class="h-4 w-4 shrink-0" />
        <span>{{ successMessage }}</span>
      </div>
      <button class="hover:opacity-80" @click="successMessage = null">
        <X class="h-4 w-4" />
      </button>
    </div>

    <div
      v-if="errorMessage"
      class="mb-6 flex items-center justify-between rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-medium text-red-400"
    >
      <div class="flex items-center gap-2.5">
        <AlertCircle class="h-4 w-4 shrink-0" />
        <span>{{ errorMessage }}</span>
      </div>
      <button class="hover:opacity-80" @click="errorMessage = null">
        <X class="h-4 w-4" />
      </button>
    </div>

    <!-- FILTER & SEARCH BAR (F-PATTERN CONTROL ROW) -->
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-elevated/70 p-3.5 backdrop-blur-md">
      <!-- Search Input -->
      <div class="relative w-full sm:w-72">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari nama atau email pengguna..."
          class="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-4 text-xs text-text-primary placeholder-text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          @keyup.enter="handleSearch"
        />
        <Search class="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-secondary" />
      </div>

      <!-- Filters Row -->
      <div class="flex flex-wrap items-center gap-3">
        <!-- Role Filter -->
        <select
          v-model="selectedRole"
          class="rounded-xl border border-border bg-background px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none"
          @change="handleFilterChange"
        >
          <option value="all">Semua Role</option>
          <option value="user">User Biasa</option>
          <option value="admin">Admin</option>
          <option value="superadmin">Superadmin</option>
        </select>

        <!-- Status Filter -->
        <select
          v-model="selectedStatus"
          class="rounded-xl border border-border bg-background px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none"
          @change="handleFilterChange"
        >
          <option value="all">Semua Status Akun</option>
          <option value="active">Aktif</option>
          <option value="inactive">Dinonaktifkan</option>
        </select>

        <button
          class="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-hover transition shadow"
          @click="handleSearch"
        >
          Cari
        </button>
      </div>
    </div>

    <!-- LOADING STATE: TABLE SKELETON -->
    <div v-if="isLoading" class="space-y-4">
      <TableSkeleton :columns="7" :rows="8" />
    </div>

    <!-- ERROR STATE WITH RETRY -->
    <div
      v-else-if="errorMessage && usersList.length === 0"
      class="rounded-3xl border border-red-500/30 bg-red-500/10 p-12 text-center"
    >
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/20 mb-4 text-red-400">
        <AlertCircle class="h-7 w-7" />
      </div>
      <h3 class="font-heading text-xl font-bold text-text-primary mb-2">Gagal Memuat Data Pengguna</h3>
      <p class="text-xs text-red-400/90 max-w-md mx-auto mb-6">{{ errorMessage }}</p>
      <button
        class="rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow hover:bg-primary-hover transition"
        @click="loadUsers(currentPage)"
      >
        Coba Muat Ulang
      </button>
    </div>

    <!-- EMPTY STATE -->
    <EmptyState
      v-else-if="usersList.length === 0"
      compact
      icon="inbox"
      icon-color="muted"
      title="Tidak Ada Pengguna Ditemukan"
      description="Tidak ada data pengguna yang cocok dengan kriteria pencarian atau filter yang Anda pilih."
      action-text="Reset Filter & Pencarian"
      action-variant="outline"
      @action="searchQuery = ''; selectedRole = 'all'; selectedStatus = 'all'; handleSearch();"
    />

    <!-- USER DIRECTORY TABLE (HIGH INFORMATION DENSITY) -->
    <div v-else class="space-y-4">
      <div class="overflow-hidden rounded-3xl border border-border bg-elevated/80 shadow-2xl backdrop-blur-md">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-border bg-elevated-subtle/50 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                <th class="py-4 px-5">Pengguna</th>
                <th class="py-4 px-3">Peran (Role)</th>
                <th class="py-4 px-3">Status Kreator</th>
                <th class="py-4 px-3 text-center">Aktivitas</th>
                <th class="py-4 px-3 text-right">Hasil Penjualan (60%)</th>
                <th class="py-4 px-3 text-center">Status Akun</th>
                <th class="py-4 px-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border/60">
              <tr
                v-for="user in usersList"
                :key="user.id"
                class="hover:bg-elevated/90 transition"
              >
                <!-- User Profile -->
                <td class="py-4 px-5">
                  <div class="flex items-center gap-3">
                    <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-primary/30 to-elevated-subtle border border-primary/30 text-xs font-bold text-text-primary">
                      <img
                        v-if="user.avatarUrl"
                        :src="user.avatarUrl"
                        :alt="user.name"
                        class="h-full w-full object-cover rounded-xl"
                      />
                      <span v-else>{{ user.name.charAt(0).toUpperCase() }}</span>
                    </div>
                    <div class="min-w-0">
                      <p class="font-bold text-text-primary truncate">{{ user.name }}</p>
                      <p class="text-[11px] text-text-secondary font-mono truncate">{{ user.email }}</p>
                    </div>
                  </div>
                </td>

                <!-- Role -->
                <td class="py-4 px-3">
                  <span
                    class="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider font-mono"
                    :class="
                      user.role === 'superadmin'
                        ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                        : user.role === 'admin'
                        ? 'bg-primary/15 text-primary border border-primary/30'
                        : 'bg-elevated-subtle text-text-secondary border border-border'
                    "
                  >
                    {{ user.role }}
                  </span>
                </td>

                <!-- Creator Verification -->
                <td class="py-4 px-3">
                  <span
                    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                    :class="
                      user.isVerifiedSeller
                        ? 'bg-secondary/15 text-secondary border border-secondary/30'
                        : 'text-text-secondary'
                    "
                  >
                    <CheckCircle2 v-if="user.isVerifiedSeller" class="h-3 w-3" />
                    <span>{{ user.isVerifiedSeller ? 'Verified Seller' : 'Standard' }}</span>
                  </span>
                </td>

                <!-- Activity Stats -->
                <td class="py-4 px-3 text-center">
                  <div class="flex items-center justify-center gap-2 text-[10px] font-mono text-text-secondary">
                    <span title="Katalog Karya">{{ user.stats.assetsCount }} Aset</span>
                    <span>•</span>
                    <span title="Pembelian">{{ user.stats.purchasesCount }} Beli</span>
                    <span>•</span>
                    <span title="Penjualan">{{ user.stats.salesCount }} Jual</span>
                  </div>
                </td>

                <!-- 60% Sales Earnings -->
                <td class="py-4 px-3 text-right font-mono font-bold" :class="user.stats.totalEarned > 0 ? 'text-success' : 'text-text-secondary'">
                  {{ formatCurrency(user.stats.totalEarned) }}
                </td>

                <!-- Active / Inactive Status -->
                <td class="py-4 px-3 text-center">
                  <span
                    class="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase"
                    :class="
                      user.isActive
                        ? 'bg-success/15 text-success border border-success/30'
                        : 'bg-red-500/15 text-red-400 border border-red-500/30'
                    "
                  >
                    {{ user.isActive ? 'Aktif' : 'Nonaktif' }}
                  </span>
                </td>

                <!-- Actions -->
                <td class="py-4 px-5 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <!-- Detail -->
                    <button
                      class="rounded-lg border border-border bg-background p-1.5 text-text-secondary hover:text-text-primary hover:border-border-hover transition"
                      title="Lihat Rincian Akun"
                      @click="openDetailModal(user.id)"
                    >
                      <Eye class="h-3.5 w-3.5" />
                    </button>

                    <!-- Edit -->
                    <button
                      class="rounded-lg border border-border bg-background p-1.5 text-text-secondary hover:text-secondary hover:border-secondary/40 transition"
                      title="Edit Data & Role"
                      @click="openEditModal(user)"
                    >
                      <Edit2 class="h-3.5 w-3.5" />
                    </button>

                    <!-- Toggle Status (Deactivate / Reactivate) -->
                    <button
                      class="rounded-lg border border-border bg-background p-1.5 transition"
                      :class="
                        user.isActive
                          ? 'text-red-400 hover:border-red-400/40 hover:bg-red-500/10'
                          : 'text-success hover:border-success/40 hover:bg-success/10'
                      "
                      :title="user.isActive ? 'Nonaktifkan Akun' : 'Aktifkan Kembali Akun'"
                      @click="openToggleStatusModal(user)"
                    >
                      <UserX v-if="user.isActive" class="h-3.5 w-3.5" />
                      <UserCheck v-else class="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- PAGINATION BAR -->
      <div class="flex items-center justify-between text-xs text-text-secondary px-2">
        <div>
          Halaman <strong class="text-text-primary font-mono">{{ currentPage }}</strong> dari <strong class="text-text-primary font-mono">{{ totalPages }}</strong>
        </div>

        <div class="flex items-center gap-2">
          <button
            :disabled="currentPage <= 1"
            class="rounded-xl border border-border bg-elevated px-4 py-1.5 font-semibold text-text-primary hover:bg-elevated-subtle transition disabled:opacity-40"
            @click="loadUsers(currentPage - 1)"
          >
            Sebelumnya
          </button>
          <button
            :disabled="currentPage >= totalPages"
            class="rounded-xl border border-border bg-elevated px-4 py-1.5 font-semibold text-text-primary hover:bg-elevated-subtle transition disabled:opacity-40"
            @click="loadUsers(currentPage + 1)"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL 1: USER DETAIL -->
    <div
      v-if="isDetailModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div class="relative w-full max-w-2xl rounded-3xl border border-border bg-elevated p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-border pb-4">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/15 text-secondary border border-secondary/30 font-bold">
              {{ selectedUserDetail?.user.name.charAt(0).toUpperCase() }}
            </div>
            <div>
              <h3 class="font-heading text-2xl font-bold text-text-primary">
                {{ selectedUserDetail?.user.name }}
              </h3>
              <p class="text-xs text-text-secondary font-mono">{{ selectedUserDetail?.user.email }}</p>
            </div>
          </div>
          <button class="text-text-secondary hover:text-text-primary" @click="isDetailModalOpen = false">
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Modal Detail Skeleton -->
        <div v-if="detailLoading" class="space-y-6">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div v-for="i in 4" :key="i" class="rounded-2xl border border-border/50 bg-background p-3 space-y-1.5">
              <Skeleton variant="text" width="w-16" height="h-3" rounded="rounded" />
              <Skeleton variant="title" width="w-24" height="h-4" rounded="rounded" />
            </div>
          </div>
          <div class="rounded-2xl border border-border/50 bg-background p-4 space-y-3">
            <Skeleton variant="text" width="w-36" height="h-4" rounded="rounded" />
            <div class="grid grid-cols-2 gap-2">
              <Skeleton v-for="i in 4" :key="i" variant="text" width="w-3/4" height="h-3" rounded="rounded" />
            </div>
          </div>
          <div class="space-y-2">
            <Skeleton variant="title" width="w-40" height="h-4" rounded="rounded" />
            <div class="space-y-2">
              <Skeleton v-for="i in 2" :key="i" variant="card" height="h-14" rounded="rounded-xl" />
            </div>
          </div>
        </div>

        <div v-else-if="selectedUserDetail" class="space-y-6 text-xs">
          <!-- Overview Cards -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="rounded-2xl border border-border bg-background p-3 space-y-1">
              <span class="text-text-secondary block">Role Akses</span>
              <strong class="font-bold text-text-primary uppercase font-mono">{{ selectedUserDetail.user.role }}</strong>
            </div>
            <div class="rounded-2xl border border-border bg-background p-3 space-y-1">
              <span class="text-text-secondary block">Status Penjual</span>
              <strong class="font-bold text-secondary">{{ selectedUserDetail.user.isVerifiedSeller ? 'Terverifikasi (60%)' : 'Standard' }}</strong>
            </div>
            <div class="rounded-2xl border border-border bg-background p-3 space-y-1">
              <span class="text-text-secondary block">Omset Penjualan</span>
              <strong class="font-mono font-bold text-text-primary">{{ formatCurrency(selectedUserDetail.financialSummary.grossSales) }}</strong>
            </div>
            <div class="rounded-2xl border border-border bg-background p-3 space-y-1">
              <span class="text-text-secondary block">Hak Bersih 60%</span>
              <strong class="font-mono font-bold text-success">+{{ formatCurrency(selectedUserDetail.financialSummary.creatorEarnings) }}</strong>
            </div>
          </div>

          <!-- Bank Account Info -->
          <div class="rounded-2xl border border-border bg-background p-4 space-y-2">
            <div class="flex items-center gap-2 font-bold text-text-primary">
              <Building2 class="h-4 w-4 text-secondary" />
              <span>Rekening Payout Terdaftar</span>
            </div>
            <div v-if="selectedUserDetail.user.bankAccountNumber" class="grid grid-cols-2 gap-2 text-text-secondary">
              <div>Bank: <strong class="text-text-primary">{{ selectedUserDetail.user.bankName }}</strong></div>
              <div>Rekening: <strong class="text-text-primary font-mono">{{ selectedUserDetail.user.bankAccountNumber }}</strong></div>
              <div>Nama Pemilik: <strong class="text-text-primary">{{ selectedUserDetail.user.bankAccountHolder }}</strong></div>
              <div>Cabang: <strong class="text-text-primary">{{ selectedUserDetail.user.bankBranch || '—' }}</strong></div>
            </div>
            <div v-else class="text-text-secondary italic">
              Pengguna belum mengatur nomor rekening bank.
            </div>
          </div>

          <!-- Uploaded Assets Sample -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="font-bold text-text-primary flex items-center gap-1.5">
                <Layers class="h-4 w-4 text-primary" />
                <span>Katalog Karya Diunggah ({{ selectedUserDetail.assets.length }})</span>
              </h4>
            </div>
            <div v-if="selectedUserDetail.assets.length === 0" class="text-text-secondary italic">
              Belum ada aset digital yang diunggah.
            </div>
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div
                v-for="asset in selectedUserDetail.assets.slice(0, 4)"
                :key="asset.id"
                class="flex items-center justify-between rounded-xl border border-border bg-background p-2.5"
              >
                <div class="truncate min-w-0 pr-2">
                  <p class="font-bold text-text-primary truncate">{{ asset.title }}</p>
                  <p class="text-[10px] text-text-secondary font-mono">{{ formatCurrency(Number(asset.price)) }} • {{ asset.status }}</p>
                </div>
                <span class="rounded bg-elevated px-2 py-0.5 text-[9px] font-mono shrink-0">
                  {{ asset.downloadCount }} DL
                </span>
              </div>
            </div>
          </div>

          <!-- Footer Modal -->
          <div class="flex items-center justify-end pt-3 border-t border-border">
            <button
              class="rounded-xl bg-elevated border border-border px-5 py-2 text-xs font-semibold text-text-primary hover:bg-elevated-subtle transition"
              @click="isDetailModalOpen = false"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL 2: EDIT USER -->
    <div
      v-if="isEditModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div class="relative w-full max-w-lg rounded-3xl border border-border bg-elevated p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-border pb-3">
          <div class="flex items-center gap-2">
            <ShieldCheck class="h-5 w-5 text-secondary" />
            <h3 class="font-heading text-2xl font-bold text-text-primary">
              Edit Data Pengguna
            </h3>
          </div>
          <button class="text-text-secondary hover:text-text-primary" @click="isEditModalOpen = false">
            <X class="h-5 w-5" />
          </button>
        </div>

        <form class="space-y-4 text-xs" @submit.prevent="handleSaveEdit">
          <!-- Name -->
          <div class="space-y-1">
            <label class="font-semibold text-text-primary">Nama Lengkap</label>
            <input
              v-model="editForm.name"
              type="text"
              class="w-full rounded-xl border border-border bg-background px-3 py-2 text-text-primary focus:border-primary focus:outline-none"
              required
            />
          </div>

          <!-- Email -->
          <div class="space-y-1">
            <label class="font-semibold text-text-primary">Alamat Email</label>
            <input
              v-model="editForm.email"
              type="email"
              class="w-full rounded-xl border border-border bg-background px-3 py-2 text-text-primary focus:border-primary focus:outline-none font-mono"
              required
            />
          </div>

          <!-- Role -->
          <div class="space-y-1">
            <label class="font-semibold text-text-primary">Peran Akses (Role)</label>
            <select
              v-model="editForm.role"
              class="w-full rounded-xl border border-border bg-background px-3 py-2 text-text-primary focus:border-primary focus:outline-none"
            >
              <option value="user">User Biasa</option>
              <option value="admin">Platform Admin</option>
              <option value="superadmin">Superadmin</option>
            </select>
          </div>

          <!-- Seller Status Checkbox -->
          <div class="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-background">
            <input
              v-model="editForm.isVerifiedSeller"
              type="checkbox"
              id="verifiedSellerCheck"
              class="h-4 w-4 rounded border-border bg-elevated text-primary focus:ring-primary"
            />
            <label for="verifiedSellerCheck" class="text-xs font-semibold text-text-primary cursor-pointer">
              Verifikasi Sebagai Penjual (Verified Seller - Hak Bagi Hasil 60%)
            </label>
          </div>

          <!-- Bank Account Info -->
          <div class="grid grid-cols-2 gap-3 pt-2 border-t border-border">
            <div class="space-y-1">
              <label class="text-[11px] text-text-secondary">Nama Bank</label>
              <input
                v-model="editForm.bankName"
                type="text"
                class="w-full rounded-xl border border-border bg-background px-3 py-2 text-text-primary focus:border-primary focus:outline-none"
              />
            </div>
            <div class="space-y-1">
              <label class="text-[11px] text-text-secondary">Nomor Rekening</label>
              <input
                v-model="editForm.bankAccountNumber"
                type="text"
                class="w-full rounded-xl border border-border bg-background px-3 py-2 text-text-primary focus:border-primary focus:outline-none font-mono"
              />
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-[11px] text-text-secondary">Nama Pemilik Rekening</label>
            <input
              v-model="editForm.bankAccountHolder"
              type="text"
              class="w-full rounded-xl border border-border bg-background px-3 py-2 text-text-primary focus:border-primary focus:outline-none uppercase"
            />
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              class="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-elevated transition"
              @click="isEditModalOpen = false"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="editLoading"
              class="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-white hover:bg-primary-hover transition disabled:opacity-50"
            >
              <Loader2 v-if="editLoading" class="h-3.5 w-3.5 animate-spin" />
              <Save v-else class="h-3.5 w-3.5" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL 3: TOGGLE STATUS CONFIRMATION -->
    <div
      v-if="isToggleModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div class="relative w-full max-w-md rounded-3xl border border-border bg-elevated p-6 shadow-2xl space-y-4 text-xs">
        <div class="flex items-center justify-between border-b border-border pb-3">
          <div class="flex items-center gap-2 text-sm font-bold" :class="togglingUser?.isActive ? 'text-red-400' : 'text-success'">
            <AlertCircle class="h-4 w-4" />
            <span>{{ togglingUser?.isActive ? 'Nonaktifkan Akun Pengguna' : 'Aktifkan Kembali Akun' }}</span>
          </div>
          <button class="text-text-secondary hover:text-text-primary" @click="isToggleModalOpen = false">
            <X class="h-4 w-4" />
          </button>
        </div>

        <p class="text-text-secondary leading-relaxed">
          Apakah Anda yakin ingin {{ togglingUser?.isActive ? 'menonaktifkan' : 'mengaktifkan kembali' }} akun
          <strong class="text-text-primary">{{ togglingUser?.name }} ({{ togglingUser?.email }})</strong>?
          <span v-if="togglingUser?.isActive" class="block mt-1 text-red-300">
            Pengguna tidak akan dapat login atau mengunggah aset selama akun dinonaktifkan.
          </span>
        </p>

        <div class="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <button
            class="rounded-xl border border-border px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-elevated transition font-semibold"
            @click="isToggleModalOpen = false"
          >
            Batal
          </button>
          <button
            :disabled="toggleLoading"
            class="rounded-xl px-5 py-2 font-semibold text-white transition disabled:opacity-50"
            :class="togglingUser?.isActive ? 'bg-red-600 hover:bg-red-500' : 'bg-success hover:bg-success/80'"
            @click="handleConfirmToggle"
          >
            <Loader2 v-if="toggleLoading" class="h-3.5 w-3.5 animate-spin inline-block mr-1" />
            <span>{{ togglingUser?.isActive ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
