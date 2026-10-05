<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { adminService } from '../services/admin';
import type { AdminAccountItem, AdminActionAuditLog, CreateAdminPayload, UpdateAdminPayload } from '../types';
import AdminNav from '../components/AdminNav.vue';
import StatCardSkeleton from '../components/StatCardSkeleton.vue';
import TableSkeleton from '../components/TableSkeleton.vue';
import EmptyState from '../components/EmptyState.vue';
import Skeleton from '../components/Skeleton.vue';
import {
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  UserPlus,
  Search,
  Eye,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Save,
  History,
  Lock,
  Mail,
  User,
  Phone,
  FileText,
} from 'lucide-vue-next';

const router = useRouter();
const authStore = useAuthStore();

// Guard: Strictly Superadmin Only
if (!authStore.isSuperAdmin) {
  router.push('/dashboard');
}

// State
const admins = ref<AdminAccountItem[]>([]);
const isLoading = ref(true);
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);

// Search & Filter
const searchQuery = ref('');
const roleFilter = ref<'all' | 'admin' | 'superadmin'>('all');
const statusFilter = ref<'all' | 'active' | 'inactive'>('all');

// Modals
// 1. Create / Edit Admin Modal
const isFormModalOpen = ref(false);
const formMode = ref<'create' | 'edit'>('create');
const formLoading = ref(false);
const formError = ref<string | null>(null);
const editingAdminId = ref<string | null>(null);

const formData = ref({
  name: '',
  email: '',
  password: '',
  role: 'admin' as 'admin' | 'superadmin',
  phone: '',
  bio: '',
});

// 2. Admin Detail & Audit Logs Modal
const isDetailModalOpen = ref(false);
const detailLoading = ref(false);
const selectedAdmin = ref<AdminAccountItem | null>(null);
const adminAuditLogs = ref<AdminActionAuditLog[]>([]);

// 3. Deactivate / Reactivate Modal
const isToggleModalOpen = ref(false);
const toggleLoading = ref(false);
const togglingAdmin = ref<AdminAccountItem | null>(null);

onMounted(async () => {
  await loadAdmins();
});

async function loadAdmins() {
  isLoading.value = true;
  errorMessage.value = null;

  try {
    const data = await adminService.getAdmins();
    admins.value = data.admins;
  } catch (err: any) {
    errorMessage.value = err?.message || 'Gagal memuat daftar administrator.';
  } finally {
    isLoading.value = false;
  }
}

// Computed stats
const totalSuperAdmins = computed(() => admins.value.filter((a) => a.role === 'superadmin').length);
const totalAdmins = computed(() => admins.value.filter((a) => a.role === 'admin').length);
const totalActive = computed(() => admins.value.filter((a) => a.isActive).length);
const totalActionsLogged = computed(() => admins.value.reduce((acc, a) => acc + (a.actionsCount || 0), 0));

// Filtered Admins list
const filteredAdmins = computed(() => {
  return admins.value.filter((a) => {
    // Search match
    const q = searchQuery.value.trim().toLowerCase();
    const matchesSearch = !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);

    // Role filter
    const matchesRole = roleFilter.value === 'all' || a.role === roleFilter.value;

    // Status filter
    const matchesStatus =
      statusFilter.value === 'all' ||
      (statusFilter.value === 'active' && a.isActive) ||
      (statusFilter.value === 'inactive' && !a.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });
});

// Open Create Admin Modal
function openCreateModal() {
  formMode.value = 'create';
  editingAdminId.value = null;
  formError.value = null;
  formData.value = {
    name: '',
    email: '',
    password: '',
    role: 'admin',
    phone: '',
    bio: '',
  };
  isFormModalOpen.value = true;
}

// Open Edit Admin Modal
function openEditModal(admin: AdminAccountItem) {
  formMode.value = 'edit';
  editingAdminId.value = admin.id;
  formError.value = null;
  formData.value = {
    name: admin.name,
    email: admin.email,
    password: '', // Blank unless changed
    role: admin.role,
    phone: admin.phone || '',
    bio: admin.bio || '',
  };
  isFormModalOpen.value = true;
}

// Submit Admin Form (Create / Edit)
async function submitAdminForm() {
  formError.value = null;

  if (!formData.value.name.trim()) {
    formError.value = 'Nama lengkap wajib diisi.';
    return;
  }

  if (!formData.value.email.trim() || !formData.value.email.includes('@')) {
    formError.value = 'Alamat email tidak valid.';
    return;
  }

  if (formMode.value === 'create') {
    if (!formData.value.password || formData.value.password.length < 8) {
      formError.value = 'Password awal minimal 8 karakter.';
      return;
    }
  } else {
    if (formData.value.password && formData.value.password.length < 8) {
      formError.value = 'Password baru minimal 8 karakter.';
      return;
    }
  }

  formLoading.value = true;

  try {
    if (formMode.value === 'create') {
      const payload: CreateAdminPayload = {
        name: formData.value.name.trim(),
        email: formData.value.email.trim().toLowerCase(),
        password: formData.value.password,
        role: formData.value.role,
        phone: formData.value.phone.trim() || null,
        bio: formData.value.bio.trim() || null,
      };

      await adminService.createAdmin(payload);
      successMessage.value = `Akun ${formData.value.role === 'superadmin' ? 'Superadmin' : 'Admin'} ${payload.name} berhasil dibuat.`;
    } else {
      const payload: UpdateAdminPayload = {
        name: formData.value.name.trim(),
        email: formData.value.email.trim().toLowerCase(),
        role: formData.value.role,
        phone: formData.value.phone.trim() || null,
        bio: formData.value.bio.trim() || null,
      };

      if (formData.value.password && formData.value.password.trim()) {
        payload.password = formData.value.password.trim();
      }

      await adminService.updateAdmin(editingAdminId.value!, payload);
      successMessage.value = `Data administrator ${payload.name} berhasil diperbarui.`;
    }

    isFormModalOpen.value = false;
    await loadAdmins();
  } catch (err: any) {
    formError.value = err?.message || 'Terjadi kesalahan saat memproses data admin.';
  } finally {
    formLoading.value = false;
  }
}

// Open Detail & Audit Modal
async function openDetailModal(admin: AdminAccountItem) {
  selectedAdmin.value = admin;
  isDetailModalOpen.value = true;
  detailLoading.value = true;
  adminAuditLogs.value = [];

  try {
    const detail = await adminService.getAdminDetail(admin.id);
    selectedAdmin.value = detail.admin;
    adminAuditLogs.value = detail.actions;
  } catch (err: any) {
    errorMessage.value = err?.message || 'Gagal memuat riwayat audit admin.';
  } finally {
    detailLoading.value = false;
  }
}

// Open Toggle Active/Deactivate Modal
function openToggleModal(admin: AdminAccountItem) {
  togglingAdmin.value = admin;
  isToggleModalOpen.value = true;
}

// Confirm Toggle Status
async function confirmToggleStatus() {
  if (!togglingAdmin.value) return;

  // Validation: Superadmin cannot deactivate themselves
  if (togglingAdmin.value.id === authStore.user?.id) {
    errorMessage.value = 'Anda tidak dapat menonaktifkan akun Anda sendiri demi integritas sistem.';
    isToggleModalOpen.value = false;
    return;
  }

  toggleLoading.value = true;

  try {
    if (togglingAdmin.value.isActive) {
      await adminService.deleteAdmin(togglingAdmin.value.id);
      successMessage.value = `Akun admin ${togglingAdmin.value.name} telah dinonaktifkan.`;
    } else {
      await adminService.reactivateAdmin(togglingAdmin.value.id);
      successMessage.value = `Akun admin ${togglingAdmin.value.name} telah diaktifkan kembali.`;
    }

    isToggleModalOpen.value = false;
    togglingAdmin.value = null;
    await loadAdmins();
  } catch (err: any) {
    errorMessage.value = err?.message || 'Gagal mengubah status administrator.';
  } finally {
    toggleLoading.value = false;
  }
}

function formatDate(dateString?: string | null) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
      <span class="text-text-primary font-medium">Manage Admins</span>
    </nav>

    <!-- Admin Navigation Bar -->
    <AdminNav />

    <!-- Page Header & Action CTA -->
    <div class="mb-8 border-b border-border pb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
          <ShieldAlert class="h-4 w-4" />
          <span>Superadmin Privilege Zone</span>
        </div>
        <h1 class="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-text-primary">
          Manajemen Administrator & Akses
        </h1>
        <p class="text-xs text-text-secondary mt-1 max-w-2xl leading-relaxed">
          Kontrol mutlak akun Superadmin dan Admin operasional marketplace. Setiap perubahan kredensial dan hak akses dicatat dalam immutable audit log.
        </p>
      </div>

      <!-- Add Admin CTA Button -->
      <button
        @click="openCreateModal"
        class="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-primary-hover active:scale-[0.98] transition cursor-pointer"
      >
        <UserPlus class="h-4 w-4" />
        <span>Tambah Administrator</span>
      </button>
    </div>

    <!-- FEEDBACK NOTIFICATIONS -->
    <div
      v-if="successMessage"
      class="mb-6 flex items-center justify-between rounded-2xl border border-success/30 bg-success/10 p-4 text-xs font-medium text-success backdrop-blur-md"
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
      class="mb-6 flex items-center justify-between rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-medium text-red-400 backdrop-blur-md"
    >
      <div class="flex items-center gap-2.5">
        <AlertCircle class="h-4 w-4 shrink-0" />
        <span>{{ errorMessage }}</span>
      </div>
      <button class="hover:opacity-80" @click="errorMessage = null">
        <X class="h-4 w-4" />
      </button>
    </div>

    <!-- STATS OVERVIEW CARDS (HIGH INFORMATION DENSITY) -->
    <div v-if="isLoading" class="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatCardSkeleton v-for="n in 4" :key="n" />
    </div>
    <div v-else class="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div class="rounded-3xl border border-border bg-elevated/60 p-4 sm:p-5 backdrop-blur-md">
        <div class="flex items-center justify-between text-text-secondary mb-2">
          <span class="text-xs font-semibold">Total Superadmin</span>
          <ShieldAlert class="h-4 w-4 text-primary" />
        </div>
        <div class="font-heading text-2xl sm:text-3xl font-bold text-text-primary">
          {{ totalSuperAdmins }}
        </div>
        <span class="text-[11px] text-text-secondary mt-1 block">Otoritas sistem tertinggi</span>
      </div>

      <div class="rounded-3xl border border-border bg-elevated/60 p-4 sm:p-5 backdrop-blur-md">
        <div class="flex items-center justify-between text-text-secondary mb-2">
          <span class="text-xs font-semibold">Admin Operasional</span>
          <ShieldCheck class="h-4 w-4 text-secondary" />
        </div>
        <div class="font-heading text-2xl sm:text-3xl font-bold text-text-primary">
          {{ totalAdmins }}
        </div>
        <span class="text-[11px] text-text-secondary mt-1 block">Moderator katalog & pembayaran</span>
      </div>

      <div class="rounded-3xl border border-border bg-elevated/60 p-4 sm:p-5 backdrop-blur-md">
        <div class="flex items-center justify-between text-text-secondary mb-2">
          <span class="text-xs font-semibold">Akun Aktif</span>
          <UserCheck class="h-4 w-4 text-success" />
        </div>
        <div class="font-heading text-2xl sm:text-3xl font-bold text-text-primary">
          {{ totalActive }}
        </div>
        <span class="text-[11px] text-text-secondary mt-1 block">Dari total {{ admins.length }} akun</span>
      </div>

      <div class="rounded-3xl border border-border bg-elevated/60 p-4 sm:p-5 backdrop-blur-md">
        <div class="flex items-center justify-between text-text-secondary mb-2">
          <span class="text-xs font-semibold">Total Audit Actions</span>
          <History class="h-4 w-4 text-yellow-500" />
        </div>
        <div class="font-heading text-2xl sm:text-3xl font-bold text-text-primary">
          {{ totalActionsLogged }}
        </div>
        <span class="text-[11px] text-text-secondary mt-1 block">Tindakan terekam di sistem</span>
      </div>
    </div>

    <!-- FILTER & SEARCH BAR -->
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-elevated/70 p-3.5 backdrop-blur-md">
      <!-- Search Input -->
      <div class="relative w-full sm:w-80">
        <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari nama atau email admin..."
          class="w-full rounded-2xl border border-border bg-surface pl-10 pr-4 py-2 text-xs text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none transition"
        />
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto">
        <!-- Role Filter -->
        <select
          v-model="roleFilter"
          class="rounded-2xl border border-border bg-surface px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none transition"
        >
          <option value="all">Semua Peran</option>
          <option value="superadmin">Superadmin</option>
          <option value="admin">Admin</option>
        </select>

        <!-- Status Filter -->
        <select
          v-model="statusFilter"
          class="rounded-2xl border border-border bg-surface px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none transition"
        >
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </div>
    </div>

    <!-- DATA TABLE -->
    <div class="rounded-3xl border border-border bg-elevated/50 backdrop-blur-md overflow-hidden shadow-2xl">
      <!-- Loading State -->
      <div v-if="isLoading" class="p-6">
        <TableSkeleton :columns="5" :rows="5" />
      </div>

      <!-- Empty State -->
      <EmptyState
        v-else-if="filteredAdmins.length === 0"
        compact
        icon="inbox"
        icon-color="muted"
        title="Tidak Ada Administrator Ditemukan"
        description="Coba sesuaikan kata kunci pencarian atau filter yang dipilih."
        action-text="Reset Filter & Pencarian"
        action-variant="outline"
        @action="searchQuery = ''; roleFilter = 'all'; statusFilter = 'all';"
      />

      <!-- Table View -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="border-b border-border bg-surface/50 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            <tr>
              <th class="px-6 py-4">Administrator</th>
              <th class="px-6 py-4">Peran (Role)</th>
              <th class="px-6 py-4">Audit Actions</th>
              <th class="px-6 py-4">Status</th>
              <th class="px-6 py-4">Terdaftar</th>
              <th class="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border/60">
            <tr
              v-for="admin in filteredAdmins"
              :key="admin.id"
              class="hover:bg-elevated/70 transition group"
            >
              <!-- Name & Email -->
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface border border-border text-sm font-bold text-text-primary shadow">
                    {{ admin.name.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-text-primary">{{ admin.name }}</span>
                      <span
                        v-if="admin.id === authStore.user?.id"
                        class="rounded-full bg-primary/20 border border-primary/40 px-2 py-0.5 text-[9px] font-bold text-primary"
                      >
                        Anda
                      </span>
                    </div>
                    <span class="text-[11px] text-text-secondary block mt-0.5 font-mono">{{ admin.email }}</span>
                  </div>
                </div>
              </td>

              <!-- Role Badge -->
              <td class="px-6 py-4">
                <span
                  v-if="admin.role === 'superadmin'"
                  class="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 px-3 py-1 text-[11px] font-bold text-purple-400"
                >
                  <ShieldAlert class="h-3 w-3" />
                  <span>Superadmin</span>
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1.5 rounded-full bg-secondary/15 border border-secondary/30 px-3 py-1 text-[11px] font-bold text-secondary"
                >
                  <ShieldCheck class="h-3 w-3" />
                  <span>Admin Operasional</span>
                </span>
              </td>

              <!-- Audit Actions Count -->
              <td class="px-6 py-4">
                <div class="flex items-center gap-1.5">
                  <span class="font-mono font-bold text-text-primary">{{ admin.actionsCount }}</span>
                  <span class="text-[11px] text-text-secondary">tindakan</span>
                </div>
              </td>

              <!-- Status Pill -->
              <td class="px-6 py-4">
                <span
                  v-if="admin.isActive"
                  class="inline-flex items-center gap-1 rounded-full bg-success/15 border border-success/30 px-2.5 py-0.5 text-[10px] font-semibold text-success"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-success"></span>
                  Aktif
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1 rounded-full bg-red-500/15 border border-red-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-red-400"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                  Nonaktif
                </span>
              </td>

              <!-- Date Created -->
              <td class="px-6 py-4 text-text-secondary text-[11px]">
                {{ formatDate(admin.createdAt) }}
              </td>

              <!-- Actions Buttons -->
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <!-- View Detail & Logs -->
                  <button
                    @click="openDetailModal(admin)"
                    title="Lihat Detail & Audit Log"
                    class="rounded-xl border border-border bg-surface p-2 text-text-secondary hover:text-text-primary hover:border-secondary hover:bg-elevated transition cursor-pointer"
                  >
                    <Eye class="h-3.5 w-3.5" />
                  </button>

                  <!-- Edit Admin -->
                  <button
                    @click="openEditModal(admin)"
                    title="Edit Data Admin"
                    class="rounded-xl border border-border bg-surface p-2 text-text-secondary hover:text-text-primary hover:border-primary hover:bg-elevated transition cursor-pointer"
                  >
                    <Edit2 class="h-3.5 w-3.5" />
                  </button>

                  <!-- Deactivate / Reactivate Button -->
                  <button
                    v-if="admin.isActive"
                    :disabled="admin.id === authStore.user?.id"
                    @click="openToggleModal(admin)"
                    :title="admin.id === authStore.user?.id ? 'Anda tidak dapat menonaktifkan akun sendiri' : 'Nonaktifkan Admin'"
                    class="rounded-xl border border-border bg-surface p-2 text-red-400 hover:border-red-500 hover:bg-red-500/10 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <UserX class="h-3.5 w-3.5" />
                  </button>

                  <button
                    v-else
                    @click="openToggleModal(admin)"
                    title="Aktifkan Kembali Admin"
                    class="rounded-xl border border-border bg-surface p-2 text-success hover:border-success hover:bg-success/10 transition cursor-pointer"
                  >
                    <UserCheck class="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- MODAL 1: FORM TAMBAH / EDIT ADMIN -->
    <!-- ========================================================================= -->
    <div
      v-if="isFormModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
    >
      <div class="relative w-full max-w-lg rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-2xl">
        <!-- Close Button -->
        <button
          @click="isFormModalOpen = false"
          class="absolute right-5 top-5 rounded-full p-2 text-text-secondary hover:text-text-primary hover:bg-elevated transition"
        >
          <X class="h-4 w-4" />
        </button>

        <!-- Header -->
        <div class="flex items-center gap-3 mb-6">
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/20 text-primary border border-primary/30">
            <UserPlus v-if="formMode === 'create'" class="h-5 w-5" />
            <Edit2 v-else class="h-5 w-5" />
          </div>
          <div>
            <h3 class="font-heading text-xl font-bold text-text-primary">
              {{ formMode === 'create' ? 'Tambah Administrator Baru' : 'Edit Data Administrator' }}
            </h3>
            <p class="text-xs text-text-secondary">
              {{ formMode === 'create' ? 'Buat akun dengan hak akses khusus dan keamanan terverifikasi.' : 'Perbarui identitas, kontak, atau kata sandi.' }}
            </p>
          </div>
        </div>

        <!-- Form Error Banner -->
        <div
          v-if="formError"
          class="mb-4 flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400"
        >
          <AlertCircle class="h-4 w-4 shrink-0" />
          <span>{{ formError }}</span>
        </div>

        <!-- Form Fields -->
        <form @submit.prevent="submitAdminForm" class="space-y-4">
          <!-- Name Field -->
          <div>
            <label class="block text-xs font-semibold text-text-secondary mb-1.5">
              Nama Lengkap <span class="text-red-400">*</span>
            </label>
            <div class="relative">
              <User class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <input
                v-model="formData.name"
                type="text"
                required
                placeholder="Contoh: Rian Anggoro"
                class="w-full rounded-2xl border border-border bg-elevated pl-10 pr-4 py-2.5 text-xs text-text-primary focus:border-primary focus:outline-none transition"
              />
            </div>
          </div>

          <!-- Email Field -->
          <div>
            <label class="block text-xs font-semibold text-text-secondary mb-1.5">
              Alamat Email <span class="text-red-400">*</span>
            </label>
            <div class="relative">
              <Mail class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <input
                v-model="formData.email"
                type="email"
                required
                placeholder="admin@assetmarket.id"
                class="w-full rounded-2xl border border-border bg-elevated pl-10 pr-4 py-2.5 text-xs text-text-primary focus:border-primary focus:outline-none transition"
              />
            </div>
          </div>

          <!-- Password Field -->
          <div>
            <label class="block text-xs font-semibold text-text-secondary mb-1.5">
              {{ formMode === 'create' ? 'Password Awal *' : 'Password Baru (Opsional)' }}
            </label>
            <div class="relative">
              <Lock class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <input
                v-model="formData.password"
                type="password"
                :required="formMode === 'create'"
                :placeholder="formMode === 'create' ? 'Minimal 8 karakter aman' : 'Kosongkan jika tidak ingin mengubah password'"
                class="w-full rounded-2xl border border-border bg-elevated pl-10 pr-4 py-2.5 text-xs text-text-primary focus:border-primary focus:outline-none transition"
              />
            </div>
            <p v-if="formMode === 'edit'" class="text-[10px] text-text-secondary mt-1">
              Hanya isi jika ingin mereset password akun admin ini.
            </p>
          </div>

          <!-- Role Selector -->
          <div>
            <label class="block text-xs font-semibold text-text-secondary mb-1.5">
              Tingkat Hak Akses (Role) <span class="text-red-400">*</span>
            </label>
            <div class="grid grid-cols-2 gap-3">
              <!-- Admin Option -->
              <label
                :class="[
                  'flex flex-col p-3 rounded-2xl border cursor-pointer transition',
                  formData.role === 'admin'
                    ? 'border-secondary bg-secondary/10 text-text-primary'
                    : 'border-border bg-elevated text-text-secondary hover:border-border/80'
                ]"
              >
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-bold text-text-primary">Admin</span>
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    v-model="formData.role"
                    class="accent-secondary"
                    :disabled="formMode === 'edit' && editingAdminId === authStore.user?.id"
                  />
                </div>
                <span class="text-[10px] text-text-secondary leading-tight">
                  Moderasi katalog, verifikasi pembayaran manual, & manajemen user.
                </span>
              </label>

              <!-- Superadmin Option -->
              <label
                :class="[
                  'flex flex-col p-3 rounded-2xl border cursor-pointer transition',
                  formData.role === 'superadmin'
                    ? 'border-primary bg-primary/10 text-text-primary'
                    : 'border-border bg-elevated text-text-secondary hover:border-border/80'
                ]"
              >
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-bold text-text-primary">Superadmin</span>
                  <input
                    type="radio"
                    name="role"
                    value="superadmin"
                    v-model="formData.role"
                    class="accent-primary"
                  />
                </div>
                <span class="text-[10px] text-text-secondary leading-tight">
                  Akses penuh platform + CRUD akun administrator & audit logging.
                </span>
              </label>
            </div>
            <p v-if="formMode === 'edit' && editingAdminId === authStore.user?.id" class="text-[10px] text-yellow-400 mt-1.5">
              Catatan: Anda tidak dapat menurunkan peran akun Superadmin Anda sendiri demi proteksi sistem.
            </p>
          </div>

          <!-- Phone (Optional) -->
          <div>
            <label class="block text-xs font-semibold text-text-secondary mb-1.5">
              Nomor Telepon / WhatsApp (Opsional)
            </label>
            <div class="relative">
              <Phone class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <input
                v-model="formData.phone"
                type="text"
                placeholder="+62 812-3456-7890"
                class="w-full rounded-2xl border border-border bg-elevated pl-10 pr-4 py-2.5 text-xs text-text-primary focus:border-primary focus:outline-none transition"
              />
            </div>
          </div>

          <!-- Bio / Internal Notes (Optional) -->
          <div>
            <label class="block text-xs font-semibold text-text-secondary mb-1.5">
              Catatan Internal / Divisi (Opsional)
            </label>
            <div class="relative">
              <FileText class="absolute left-3.5 top-3 h-4 w-4 text-text-secondary" />
              <textarea
                v-model="formData.bio"
                rows="2"
                placeholder="Contoh: Lead Compliance & Verification Officer"
                class="w-full rounded-2xl border border-border bg-elevated pl-10 pr-4 py-2 text-xs text-text-primary focus:border-primary focus:outline-none transition resize-none"
              ></textarea>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              @click="isFormModalOpen = false"
              class="rounded-2xl border border-border px-4 py-2.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="formLoading"
              class="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-primary-hover active:scale-[0.98] transition disabled:opacity-50 cursor-pointer"
            >
              <Loader2 v-if="formLoading" class="h-4 w-4 animate-spin" />
              <Save v-else class="h-4 w-4" />
              <span>{{ formMode === 'create' ? 'Simpan & Buat Admin' : 'Simpan Perubahan' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- MODAL 2: DETAIL ADMIN & AUDIT LOGS -->
    <!-- ========================================================================= -->
    <div
      v-if="isDetailModalOpen && selectedAdmin"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
    >
      <div class="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-2xl">
        <!-- Close Button -->
        <button
          @click="isDetailModalOpen = false"
          class="absolute right-5 top-5 rounded-full p-2 text-text-secondary hover:text-text-primary hover:bg-elevated transition"
        >
          <X class="h-4 w-4" />
        </button>

        <!-- Header -->
        <div class="flex items-center gap-4 mb-6 pb-5 border-b border-border">
          <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-primary border border-primary/30 text-xl font-bold">
            {{ selectedAdmin.name.charAt(0).toUpperCase() }}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="font-heading text-2xl font-bold text-text-primary">
                {{ selectedAdmin.name }}
              </h3>
              <span
                :class="selectedAdmin.role === 'superadmin' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-secondary/20 text-secondary border-secondary/30'"
                class="rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              >
                {{ selectedAdmin.role }}
              </span>
            </div>
            <p class="text-xs text-text-secondary font-mono mt-0.5">{{ selectedAdmin.email }}</p>
          </div>
        </div>

        <!-- Admin Identity Info -->
        <div class="grid grid-cols-2 gap-4 mb-6 text-xs">
          <div class="rounded-2xl border border-border bg-elevated/50 p-3.5">
            <span class="text-text-secondary block mb-1">Status Akun:</span>
            <span :class="selectedAdmin.isActive ? 'text-success font-semibold' : 'text-red-400 font-semibold'">
              {{ selectedAdmin.isActive ? 'Aktif' : 'Dinonaktifkan' }}
            </span>
          </div>

          <div class="rounded-2xl border border-border bg-elevated/50 p-3.5">
            <span class="text-text-secondary block mb-1">Terdaftar Sejak:</span>
            <span class="font-mono text-text-primary">{{ formatDate(selectedAdmin.createdAt) }}</span>
          </div>

          <div class="rounded-2xl border border-border bg-elevated/50 p-3.5">
            <span class="text-text-secondary block mb-1">Nomor Telepon:</span>
            <span class="font-mono text-text-primary">{{ selectedAdmin.phone || '-' }}</span>
          </div>

          <div class="rounded-2xl border border-border bg-elevated/50 p-3.5">
            <span class="text-text-secondary block mb-1">Total Tindakan (Audit Log):</span>
            <span class="font-mono text-primary font-bold">{{ selectedAdmin.actionsCount }} Log Tercatat</span>
          </div>
        </div>

        <div v-if="selectedAdmin.bio" class="mb-6 rounded-2xl border border-border bg-elevated/30 p-3.5 text-xs">
          <span class="text-text-secondary block mb-1 font-semibold">Catatan / Deskripsi:</span>
          <p class="text-text-primary leading-relaxed">{{ selectedAdmin.bio }}</p>
        </div>

        <!-- Audit History List -->
        <div>
          <div class="flex items-center gap-2 mb-3">
            <History class="h-4 w-4 text-yellow-500" />
            <h4 class="text-xs font-bold uppercase tracking-wider text-text-primary">
              Riwayat Tindakan Administratif Terbaru (15 Terakhir)
            </h4>
          </div>

          <div v-if="detailLoading" class="space-y-2 py-2">
            <div v-for="i in 3" :key="i" class="rounded-2xl border border-border/50 bg-elevated/40 p-3 space-y-2">
              <div class="flex items-center justify-between">
                <Skeleton variant="badge" width="w-24" height="h-4" rounded="rounded" />
                <Skeleton variant="text" width="w-20" height="h-3" rounded="rounded" />
              </div>
              <Skeleton variant="text" width="w-3/4" height="h-3" rounded="rounded" />
            </div>
          </div>

          <div v-else-if="adminAuditLogs.length === 0" class="py-8 text-center rounded-2xl border border-border bg-elevated/20 text-xs text-text-secondary">
            Belum ada audit action yang dicatat untuk administrator ini.
          </div>

          <div v-else class="space-y-2 max-h-60 overflow-y-auto pr-1">
            <div
              v-for="log in adminAuditLogs"
              :key="log.id"
              class="flex items-start justify-between gap-3 rounded-2xl border border-border/80 bg-elevated/40 p-3 text-xs"
            >
              <div>
                <div class="flex items-center gap-2 mb-0.5">
                  <span class="rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                    {{ log.action }}
                  </span>
                  <span class="text-[11px] text-text-secondary">
                    pada entitas <strong class="text-text-primary">{{ log.targetEntity }}</strong>
                  </span>
                </div>
                <p v-if="log.notes" class="text-[11px] text-text-secondary mt-1">
                  {{ log.notes }}
                </p>
              </div>
              <span class="text-[10px] text-text-secondary shrink-0 font-mono">
                {{ formatDate(log.createdAt) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- MODAL 3: KONFIRMASI DEAKTIVASI / REAKTIVASI -->
    <!-- ========================================================================= -->
    <div
      v-if="isToggleModalOpen && togglingAdmin"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
    >
      <div class="relative w-full max-w-md rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-2xl text-center">
        <!-- Close Button -->
        <button
          @click="isToggleModalOpen = false"
          class="absolute right-5 top-5 rounded-full p-2 text-text-secondary hover:text-text-primary hover:bg-elevated transition"
        >
          <X class="h-4 w-4" />
        </button>

        <div
          :class="togglingAdmin.isActive ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-success/20 text-success border-success/30'"
          class="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl border mb-4 shadow"
        >
          <UserX v-if="togglingAdmin.isActive" class="h-6 w-6" />
          <UserCheck v-else class="h-6 w-6" />
        </div>

        <h3 class="font-heading text-xl font-bold text-text-primary mb-2">
          {{ togglingAdmin.isActive ? 'Nonaktifkan Akun Administrator?' : 'Aktifkan Kembali Administrator?' }}
        </h3>

        <p class="text-xs text-text-secondary leading-relaxed mb-6">
          <span v-if="togglingAdmin.isActive">
            Akun <strong>{{ togglingAdmin.name }}</strong> ({{ togglingAdmin.email }}) tidak akan dapat login lagi ke panel admin. Data dan jejak audit tetap disimpan permanen.
          </span>
          <span v-else>
            Akun <strong>{{ togglingAdmin.name }}</strong> ({{ togglingAdmin.email }}) akan dipulihkan dan dapat kembali mengakses fungsi administratif.
          </span>
        </p>

        <!-- Actions -->
        <div class="flex items-center justify-center gap-3">
          <button
            type="button"
            @click="isToggleModalOpen = false"
            class="rounded-2xl border border-border px-5 py-2.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition"
          >
            Batal
          </button>
          <button
            type="button"
            :disabled="toggleLoading"
            @click="confirmToggleStatus"
            :class="togglingAdmin.isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-success hover:bg-success/90'"
            class="inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-bold text-white shadow transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            <Loader2 v-if="toggleLoading" class="h-4 w-4 animate-spin" />
            <span>{{ togglingAdmin.isActive ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
