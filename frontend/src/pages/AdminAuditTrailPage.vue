<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { adminService } from '../services/admin';
import type { AuditTrailLogItem, AuditTrailResponse } from '../types';
import AdminNav from '../components/AdminNav.vue';
import TableSkeleton from '../components/TableSkeleton.vue';
import EmptyState from '../components/EmptyState.vue';
import {
  Activity,
  Search,
  RefreshCw,
  Download,
  Eye,
  Copy,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  AlertOctagon,
  FileText,
  Layers,
  Server,
  User,
  UserCog,
  DollarSign,
  ArrowRight,
  Clock,
  Sparkles,
  SlidersHorizontal,
  ExternalLink,
  Code2,
} from 'lucide-vue-next';

// State
const logs = ref<AuditTrailLogItem[]>([]);
const totalLogs = ref(0);
const currentPage = ref(1);
const totalPages = ref(1);
const limit = ref(20);
const isLoading = ref(true);
const isRefreshing = ref(false);
const errorMessage = ref<string | null>(null);

// Stats State
const stats = ref({
  totalActions: 0,
  totalApprovals: 0,
  totalRejections: 0,
  totalPayments: 0,
  totalUsersManaged: 0,
});
const availableAdmins = ref<Array<{ id: string; name: string; email: string; role: string }>>([]);

// Filters
const searchQuery = ref('');
const selectedAction = ref('all');
const selectedEntity = ref('all');
const selectedAdminId = ref('all');
const activeCategoryTab = ref<'all' | 'assets' | 'payments' | 'users' | 'admins'>('all');
const viewMode = ref<'table' | 'timeline'>('table');

// Modals & Inspection Drawer
const isDetailModalOpen = ref(false);
const inspectingLog = ref<AuditTrailLogItem | null>(null);
const copiedId = ref<string | null>(null);
const copiedJson = ref(false);

onMounted(async () => {
  await loadAuditLogs();
});

// Watch category quick filter
watch(activeCategoryTab, (tab) => {
  if (tab === 'all') {
    selectedAction.value = 'all';
    selectedEntity.value = 'all';
  } else if (tab === 'assets') {
    selectedEntity.value = 'assets';
    selectedAction.value = 'all';
  } else if (tab === 'payments') {
    selectedEntity.value = 'payment_confirmations';
    selectedAction.value = 'all';
  } else if (tab === 'users') {
    selectedEntity.value = 'users';
    selectedAction.value = 'all';
  } else if (tab === 'admins') {
    selectedEntity.value = 'admin';
    selectedAction.value = 'all';
  }
  loadAuditLogs(1);
});

async function loadAuditLogs(page = 1) {
  isLoading.value = true;
  errorMessage.value = null;
  currentPage.value = page;

  try {
    const data: AuditTrailResponse = await adminService.getAuditLogs({
      page,
      limit: limit.value,
      action: selectedAction.value !== 'all' ? selectedAction.value : undefined,
      targetEntity: selectedEntity.value !== 'all' ? selectedEntity.value : undefined,
      adminId: selectedAdminId.value !== 'all' ? selectedAdminId.value : undefined,
      search: searchQuery.value.trim() || undefined,
    });

    logs.value = data.logs;
    totalLogs.value = data.pagination.total;
    totalPages.value = data.pagination.totalPages;
    if (data.stats) {
      stats.value = data.stats;
    }
    if (data.availableAdmins && data.availableAdmins.length > 0) {
      availableAdmins.value = data.availableAdmins;
    }
  } catch (err: any) {
    console.error('Failed to load audit logs:', err);
    errorMessage.value = err?.message || 'Gagal memuat log audit administrator.';
  } finally {
    isLoading.value = false;
    isRefreshing.value = false;
  }
}

async function refreshData() {
  isRefreshing.value = true;
  await loadAuditLogs(currentPage.value);
}

function handleSearch() {
  loadAuditLogs(1);
}

function handleFilterChange() {
  loadAuditLogs(1);
}

function resetAllFilters() {
  searchQuery.value = '';
  selectedAction.value = 'all';
  selectedEntity.value = 'all';
  selectedAdminId.value = 'all';
  activeCategoryTab.value = 'all';
  loadAuditLogs(1);
}

// Helpers: Action Badging & Semantics
function getActionBadge(action: string) {
  const norm = action.toUpperCase();
  if (norm.includes('APPROVE') || norm.includes('VERIFY') || norm.includes('ACTIVATE') && !norm.includes('DEACTIVATE')) {
    return {
      label: formatActionLabel(norm),
      variant: 'success',
      badgeClass: 'bg-success/15 text-success border border-success/30 shadow-sm shadow-success/10',
      dotClass: 'bg-success',
      icon: CheckCircle2,
    };
  }
  if (norm.includes('REJECT') || norm.includes('DEACTIVATE') || norm.includes('DELETE')) {
    return {
      label: formatActionLabel(norm),
      variant: 'danger',
      badgeClass: 'bg-red-500/15 text-red-400 border border-red-500/30 shadow-sm shadow-red-500/10',
      dotClass: 'bg-red-500',
      icon: AlertOctagon,
    };
  }
  if (norm.includes('UPDATE') || norm.includes('EDIT')) {
    return {
      label: formatActionLabel(norm),
      variant: 'secondary',
      badgeClass: 'bg-secondary/15 text-secondary border border-secondary/30 shadow-sm shadow-secondary/10',
      dotClass: 'bg-secondary',
      icon: SlidersHorizontal,
    };
  }
  if (norm.includes('CREATE')) {
    return {
      label: formatActionLabel(norm),
      variant: 'primary',
      badgeClass: 'bg-primary/15 text-primary border border-primary/30 shadow-sm shadow-primary/10',
      dotClass: 'bg-primary',
      icon: Sparkles,
    };
  }
  return {
    label: formatActionLabel(norm),
    variant: 'muted',
    badgeClass: 'bg-surface text-text-secondary border border-border shadow-sm',
    dotClass: 'bg-text-muted',
    icon: Activity,
  };
}

function formatActionLabel(action: string): string {
  const map: Record<string, string> = {
    ASSET_APPROVE: 'Approve Aset',
    APPROVE_ASSET: 'Approve Aset',
    ASSET_REJECT: 'Tolak Aset',
    REJECT_ASSET: 'Tolak Aset',
    PAYMENT_VERIFY: 'Verifikasi Pembayaran',
    VERIFY_PAYMENT: 'Verifikasi Pembayaran',
    PAYMENT_REJECT: 'Tolak Pembayaran',
    REJECT_PAYMENT: 'Tolak Pembayaran',
    UPDATE_USER: 'Perbarui Pengguna',
    TOGGLE_USER_STATUS: 'Status Pengguna',
    ACTIVATE_USER: 'Aktifkan Pengguna',
    DEACTIVATE_USER: 'Nonaktifkan Pengguna',
    CREATE_ADMIN: 'Tambah Admin Baru',
    UPDATE_ADMIN: 'Perbarui Admin',
    DEACTIVATE_ADMIN: 'Nonaktifkan Admin',
    REACTIVATE_ADMIN: 'Aktifkan Ulang Admin',
  };
  return map[action] || action.replace(/_/g, ' ');
}

function formatEntityLabel(entity: string): string {
  const norm = entity.toLowerCase();
  if (norm.includes('asset')) return 'Asset Digital';
  if (norm.includes('payment') || norm.includes('confirm')) return 'Payment Escrow';
  if (norm.includes('transact')) return 'Transaksi';
  if (norm.includes('user')) return 'Pengguna';
  if (norm.includes('admin')) return 'Administrator';
  return entity;
}

function getEntityIcon(entity: string) {
  const norm = entity.toLowerCase();
  if (norm.includes('asset')) return Layers;
  if (norm.includes('payment') || norm.includes('transact')) return DollarSign;
  if (norm.includes('admin')) return UserCog;
  return User;
}

// Formatting
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatRelativeTime(iso: string): string {
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return 'Baru saja';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} mnt lalu`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} hari lalu`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} bln lalu`;
}

// Target navigation or preview helpers
function getEntityLink(log: AuditTrailLogItem): string | null {
  const norm = log.targetEntity.toLowerCase();
  if (norm.includes('asset')) return `/assets/${log.targetId}`;
  if (norm.includes('user')) return `/admin/users`;
  if (norm.includes('admin')) return `/admin/admins`;
  return null;
}

// Modal inspection
function openDetailModal(log: AuditTrailLogItem) {
  inspectingLog.value = log;
  isDetailModalOpen.value = true;
  copiedJson.value = false;
}

function closeDetailModal() {
  isDetailModalOpen.value = false;
  inspectingLog.value = null;
}

async function copyText(text: string, id: string) {
  try {
    await navigator.clipboard.writeText(text);
    copiedId.value = id;
    setTimeout(() => {
      if (copiedId.value === id) copiedId.value = null;
    }, 2000);
  } catch (err) {
    console.error('Copy failed', err);
  }
}

async function copyLogJson() {
  if (!inspectingLog.value) return;
  try {
    await navigator.clipboard.writeText(JSON.stringify(inspectingLog.value, null, 2));
    copiedJson.value = true;
    setTimeout(() => {
      copiedJson.value = false;
    }, 2000);
  } catch (err) {
    console.error('Copy failed', err);
  }
}

// Export to CSV
function exportToCsv() {
  if (logs.value.length === 0) return;
  const headers = ['Timestamp', 'Admin Name', 'Admin Email', 'Action', 'Target Entity', 'Target ID', 'Notes', 'IP Address'];
  const rows = logs.value.map((l) => [
    `"${l.createdAt}"`,
    `"${l.adminName || 'Admin'}"`,
    `"${l.adminEmail || '-'}"`,
    `"${l.action}"`,
    `"${l.targetEntity}"`,
    `"${l.targetId}"`,
    `"${(l.notes || '').replace(/"/g, '""')}"`,
    `"${l.ipAddress || '-'}"`,
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `admin_audit_trail_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Format JSON display
function formatJson(val: any): string {
  if (!val) return 'null';
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
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
      <span class="text-text-primary font-medium">Audit Trail</span>
    </nav>

    <!-- Admin Navigation Bar -->
    <AdminNav />

    <!-- PAGE HEADER -->
    <div class="mb-8 border-b border-border pb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
          <Activity class="h-4 w-4" />
          <span>Security & Governance Ledger</span>
        </div>
        <h1 class="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-text-primary">
          Admin Audit Trail & Immutable Log
        </h1>
        <p class="text-xs text-text-secondary mt-1 max-w-2xl leading-relaxed">
          Pusat riwayat seluruh tindakan administrator dan superadmin secara permanen (append-only).
          Mencakup kurasi publikasi aset, verifikasi mutasi escrow 60/40, serta penyesuaian hak akses akun.
        </p>
      </div>

      <!-- Quick Action Buttons -->
      <div class="flex items-center gap-2 sm:gap-3">
        <button
          @click="refreshData"
          :disabled="isLoading || isRefreshing"
          class="inline-flex items-center gap-2 rounded-2xl border border-border/80 bg-elevated/80 px-4 py-2.5 text-xs font-bold text-text-secondary hover:text-text-primary hover:border-secondary transition cursor-pointer shadow active:scale-95 disabled:opacity-50"
          title="Segarkan Log Audit"
        >
          <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': isRefreshing }" />
          <span class="hidden sm:inline">Refresh</span>
        </button>

        <button
          @click="exportToCsv"
          :disabled="logs.length === 0"
          class="inline-flex items-center gap-2 rounded-2xl bg-secondary/15 border border-secondary/30 px-4 py-2.5 text-xs font-bold text-secondary hover:bg-secondary/25 transition cursor-pointer shadow active:scale-95 disabled:opacity-50"
          title="Ekspor CSV Laporan Audit"
        >
          <Download class="h-3.5 w-3.5" />
          <span>Export CSV</span>
        </button>
      </div>
    </div>

    <!-- FEEDBACK ERROR NOTIFICATION -->
    <div
      v-if="errorMessage"
      class="mb-6 flex items-center justify-between rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-medium text-red-400 backdrop-blur-md"
    >
      <div class="flex items-center gap-2.5">
        <AlertCircle class="h-4 w-4 shrink-0" />
        <span>{{ errorMessage }}</span>
      </div>
      <button class="hover:opacity-80 cursor-pointer" @click="errorMessage = null">
        <X class="h-4 w-4" />
      </button>
    </div>

    <!-- STAT KPI SUMMARY CARDS -->
    <div class="mb-8 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 1. Total Action Entries -->
      <div class="rounded-3xl border border-border/60 bg-elevated/70 p-5 shadow-lg backdrop-blur-md relative overflow-hidden group">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-text-secondary">Total Log Tercatat</span>
          <div class="flex h-9 w-9 items-center justify-center rounded-2xl bg-secondary/15 text-secondary border border-secondary/30">
            <Activity class="h-4.5 w-4.5" />
          </div>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="font-heading text-3xl font-bold text-text-primary tracking-tight">
            {{ stats.totalActions || totalLogs }}
          </span>
          <span class="text-[10px] font-mono text-secondary uppercase tracking-wider">Entries</span>
        </div>
        <div class="mt-2 text-[11px] text-text-muted flex items-center gap-1.5">
          <Server class="h-3 w-3 text-secondary" />
          <span>Immutable Append-Only</span>
        </div>
      </div>

      <!-- 2. Asset Moderation -->
      <div class="rounded-3xl border border-border/60 bg-elevated/70 p-5 shadow-lg backdrop-blur-md relative overflow-hidden group">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-text-secondary">Persetujuan & Revisi</span>
          <div class="flex h-9 w-9 items-center justify-center rounded-2xl bg-success/15 text-success border border-success/30">
            <CheckCircle2 class="h-4.5 w-4.5" />
          </div>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="font-heading text-3xl font-bold text-success tracking-tight">
            {{ stats.totalApprovals }}
          </span>
          <span class="text-[11px] text-red-400 font-mono font-bold">
            / {{ stats.totalRejections }} ditolak
          </span>
        </div>
        <div class="mt-2 text-[11px] text-text-muted flex items-center gap-1.5">
          <Layers class="h-3 w-3 text-success" />
          <span>Kurasi Katalog Kreator</span>
        </div>
      </div>

      <!-- 3. Escrow Verifications -->
      <div class="rounded-3xl border border-border/60 bg-elevated/70 p-5 shadow-lg backdrop-blur-md relative overflow-hidden group">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-text-secondary">Verifikasi Pembayaran</span>
          <div class="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/15 text-primary border border-primary/30">
            <DollarSign class="h-4.5 w-4.5" />
          </div>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="font-heading text-3xl font-bold text-text-primary tracking-tight">
            {{ stats.totalPayments }}
          </span>
          <span class="text-[10px] font-mono text-primary uppercase tracking-wider">Escrow</span>
        </div>
        <div class="mt-2 text-[11px] text-text-muted flex items-center gap-1.5">
          <ShieldCheck class="h-3 w-3 text-primary" />
          <span>Bagi Hasil 60/40 Berhasil</span>
        </div>
      </div>

      <!-- 4. Unique Actors / Admins -->
      <div class="rounded-3xl border border-border/60 bg-elevated/70 p-5 shadow-lg backdrop-blur-md relative overflow-hidden group">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-text-secondary">Admin Bertugas</span>
          <div class="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <UserCog class="h-4.5 w-4.5" />
          </div>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="font-heading text-3xl font-bold text-text-primary tracking-tight">
            {{ availableAdmins.length || 1 }}
          </span>
          <span class="text-[10px] font-mono text-amber-400 uppercase tracking-wider">Actors</span>
        </div>
        <div class="mt-2 text-[11px] text-text-muted flex items-center gap-1.5">
          <ShieldAlert class="h-3 w-3 text-amber-400" />
          <span>Otoritas Pengawasan</span>
        </div>
      </div>
    </div>

    <!-- CATEGORY PILL TABS -->
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
      <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        <button
          @click="activeCategoryTab = 'all'"
          class="rounded-xl px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer"
          :class="activeCategoryTab === 'all' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-elevated/60 text-text-secondary hover:text-text-primary hover:bg-elevated'"
        >
          Semua Aktivitas
        </button>
        <button
          @click="activeCategoryTab = 'assets'"
          class="rounded-xl px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer"
          :class="activeCategoryTab === 'assets' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-elevated/60 text-text-secondary hover:text-text-primary hover:bg-elevated'"
        >
          Moderasi Aset
        </button>
        <button
          @click="activeCategoryTab = 'payments'"
          class="rounded-xl px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer"
          :class="activeCategoryTab === 'payments' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-elevated/60 text-text-secondary hover:text-text-primary hover:bg-elevated'"
        >
          Verifikasi Pembayaran Escrow
        </button>
        <button
          @click="activeCategoryTab = 'users'"
          class="rounded-xl px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer"
          :class="activeCategoryTab === 'users' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-elevated/60 text-text-secondary hover:text-text-primary hover:bg-elevated'"
        >
          Manajemen Pengguna
        </button>
        <button
          @click="activeCategoryTab = 'admins'"
          class="rounded-xl px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer"
          :class="activeCategoryTab === 'admins' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-elevated/60 text-text-secondary hover:text-text-primary hover:bg-elevated'"
        >
          Admin & Superadmin
        </button>
      </div>

      <!-- View Mode Switch (Table vs Timeline) -->
      <div class="flex items-center rounded-xl border border-border bg-elevated/80 p-0.5">
        <button
          @click="viewMode = 'table'"
          class="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer"
          :class="viewMode === 'table' ? 'bg-primary text-white shadow' : 'text-text-secondary hover:text-text-primary'"
          title="Tampilan Tabel Lengkap"
        >
          <FileText class="h-3.5 w-3.5" />
          <span class="hidden sm:inline">Tabel</span>
        </button>
        <button
          @click="viewMode = 'timeline'"
          class="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer"
          :class="viewMode === 'timeline' ? 'bg-primary text-white shadow' : 'text-text-secondary hover:text-text-primary'"
          title="Tampilan Feed Timeline"
        >
          <Clock class="h-3.5 w-3.5" />
          <span class="hidden sm:inline">Timeline</span>
        </button>
      </div>
    </div>

    <!-- FILTER & SEARCH CONTROL TOOLBAR -->
    <div class="mb-6 rounded-3xl border border-border/60 bg-elevated/70 p-4 sm:p-5 shadow-xl backdrop-blur-md">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5">
        <!-- 1. Search query input (col-span-5) -->
        <div class="relative lg:col-span-5">
          <Search class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari catatan, ID target, nama admin, atau email..."
            @keydown.enter="handleSearch"
            class="w-full rounded-2xl border border-border bg-surface pl-10 pr-10 py-2.5 text-xs text-text-primary placeholder:text-text-muted focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary transition"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''; handleSearch()"
            class="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
          >
            <X class="h-3.5 w-3.5" />
          </button>
        </div>

        <!-- 2. Action Type Filter (col-span-3) -->
        <div class="lg:col-span-3">
          <select
            v-model="selectedAction"
            @change="handleFilterChange"
            class="w-full rounded-2xl border border-border bg-surface px-3 py-2.5 text-xs text-text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary transition"
          >
            <option value="all">Semua Tipe Tindakan</option>
            <option value="ASSET_APPROVE">ASSET_APPROVE (Persetujuan Aset)</option>
            <option value="ASSET_REJECT">ASSET_REJECT (Penolakan Aset)</option>
            <option value="PAYMENT_VERIFY">PAYMENT_VERIFY (Verifikasi Pembayaran)</option>
            <option value="PAYMENT_REJECT">PAYMENT_REJECT (Penolakan Pembayaran)</option>
            <option value="UPDATE_USER">UPDATE_USER (Perubahan Pengguna)</option>
            <option value="TOGGLE_USER_STATUS">TOGGLE_USER_STATUS (Status Akun)</option>
            <option value="CREATE_ADMIN">CREATE_ADMIN (Pembuatan Admin)</option>
            <option value="UPDATE_ADMIN">UPDATE_ADMIN (Update Admin)</option>
            <option value="DEACTIVATE_ADMIN">DEACTIVATE_ADMIN (Nonaktifkan Admin)</option>
            <option value="REACTIVATE_ADMIN">REACTIVATE_ADMIN (Aktifkan Admin)</option>
          </select>
        </div>

        <!-- 3. Target Entity Filter (col-span-2) -->
        <div class="lg:col-span-2">
          <select
            v-model="selectedEntity"
            @change="handleFilterChange"
            class="w-full rounded-2xl border border-border bg-surface px-3 py-2.5 text-xs text-text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary transition"
          >
            <option value="all">Semua Entitas</option>
            <option value="assets">Assets (Karya Digital)</option>
            <option value="payment_confirmations">Payments (Escrow Transfer)</option>
            <option value="users">Users (Pengguna)</option>
            <option value="admin">Admins (Administrator)</option>
          </select>
        </div>

        <!-- 4. Filter by Specific Admin (col-span-2) -->
        <div class="lg:col-span-2">
          <select
            v-model="selectedAdminId"
            @change="handleFilterChange"
            class="w-full rounded-2xl border border-border bg-surface px-3 py-2.5 text-xs text-text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary transition"
          >
            <option value="all">Semua Admin Pelaksana</option>
            <option v-for="adm in availableAdmins" :key="adm.id" :value="adm.id">
              {{ adm.name }} ({{ adm.role }})
            </option>
          </select>
        </div>
      </div>

      <!-- Active filter reset badge bar -->
      <div
        v-if="searchQuery || selectedAction !== 'all' || selectedEntity !== 'all' || selectedAdminId !== 'all'"
        class="mt-3 pt-3 border-t border-border/40 flex flex-wrap items-center justify-between gap-2"
      >
        <div class="flex items-center gap-2 text-xs text-text-muted">
          <span>Filter Aktif:</span>
          <span v-if="searchQuery" class="rounded bg-surface border border-border px-2 py-0.5 text-[11px] text-text-primary">
            "{{ searchQuery }}"
          </span>
          <span v-if="selectedAction !== 'all'" class="rounded bg-surface border border-border px-2 py-0.5 text-[11px] text-text-primary">
            Aksi: {{ selectedAction }}
          </span>
          <span v-if="selectedEntity !== 'all'" class="rounded bg-surface border border-border px-2 py-0.5 text-[11px] text-text-primary">
            Entitas: {{ selectedEntity }}
          </span>
          <span v-if="selectedAdminId !== 'all'" class="rounded bg-surface border border-border px-2 py-0.5 text-[11px] text-text-primary">
            Admin terpilih
          </span>
        </div>

        <button
          @click="resetAllFilters"
          class="text-xs font-semibold text-secondary hover:underline flex items-center gap-1 cursor-pointer"
        >
          <X class="h-3 w-3" />
          <span>Reset Semua Filter</span>
        </button>
      </div>
    </div>

    <!-- MAIN DATA DISPLAY SECTION -->
    <div>
      <!-- 1. LOADING SKELETON -->
      <TableSkeleton
        v-if="isLoading"
        :columns="6"
        :rows="8"
      />

      <!-- 2. EMPTY STATE -->
      <EmptyState
        v-else-if="logs.length === 0"
        compact
        icon="shield-check"
        icon-color="muted"
        title="Tidak Ada Catatan Audit yang Cocok"
        description="Tidak ditemukan log aktivitas administrator yang sesuai dengan kriteria filter atau pencarian Anda."
        action-text="Reset Filter"
        @action="resetAllFilters"
      />

      <!-- 3. TABLE VIEW -->
      <div
        v-else-if="viewMode === 'table'"
        class="overflow-hidden rounded-3xl border border-border/60 bg-elevated/70 shadow-2xl backdrop-blur-md"
      >
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-border/60 bg-elevated-subtle/60 text-text-muted uppercase tracking-wider text-[10px] font-semibold">
                <th class="py-4 px-5">Waktu (WIB)</th>
                <th class="py-4 px-5">Admin Pelaksana</th>
                <th class="py-4 px-5">Tindakan (Action)</th>
                <th class="py-4 px-5">Entitas Target & ID</th>
                <th class="py-4 px-5">Rincian / Catatan</th>
                <th class="py-4 px-5 text-right">Opsi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border/40 text-text-secondary">
              <tr
                v-for="log in logs"
                :key="log.id"
                class="hover:bg-surface/50 transition-colors group"
              >
                <!-- 1. Timestamp -->
                <td class="py-4 px-5 whitespace-nowrap">
                  <div class="font-medium text-text-primary font-mono text-[11px]">
                    {{ formatDate(log.createdAt) }}
                  </div>
                  <div class="text-[10px] text-text-muted flex items-center gap-1 mt-0.5">
                    <Clock class="h-3 w-3 text-secondary/70" />
                    <span>{{ formatTime(log.createdAt) }}</span>
                    <span class="text-text-muted/60">•</span>
                    <span>{{ formatRelativeTime(log.createdAt) }}</span>
                  </div>
                </td>

                <!-- 2. Admin Name & Role -->
                <td class="py-4 px-5 whitespace-nowrap">
                  <div class="flex items-center gap-2.5">
                    <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold text-xs shrink-0">
                      {{ (log.adminName || 'A').charAt(0).toUpperCase() }}
                    </div>
                    <div class="min-w-0">
                      <div class="font-bold text-text-primary text-xs truncate max-w-[140px]">
                        {{ log.adminName || 'Administrator' }}
                      </div>
                      <div class="text-[10px] text-text-muted truncate max-w-[140px]">
                        {{ log.adminEmail || 'admin@assetmarket.id' }}
                      </div>
                    </div>
                  </div>
                </td>

                <!-- 3. Action Type Badge -->
                <td class="py-4 px-5 whitespace-nowrap">
                  <div class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    :class="getActionBadge(log.action).badgeClass"
                  >
                    <component :is="getActionBadge(log.action).icon" class="h-3 w-3 shrink-0" />
                    <span>{{ getActionBadge(log.action).label }}</span>
                  </div>
                </td>

                <!-- 4. Target Entity & ID -->
                <td class="py-4 px-5">
                  <div class="space-y-1">
                    <div class="flex items-center gap-1.5">
                      <component :is="getEntityIcon(log.targetEntity)" class="h-3.5 w-3.5 text-text-muted shrink-0" />
                      <span class="font-semibold text-text-primary text-[11px]">
                        {{ formatEntityLabel(log.targetEntity) }}
                      </span>
                    </div>

                    <!-- Target ID with Copy Button and Quick Link -->
                    <div class="flex items-center gap-1.5">
                      <code class="rounded bg-surface border border-border/80 px-1.5 py-0.5 text-[10px] font-mono text-text-muted max-w-[130px] truncate" :title="log.targetId">
                        {{ log.targetId.slice(0, 8) }}...{{ log.targetId.slice(-4) }}
                      </code>
                      <button
                        @click="copyText(log.targetId, log.id)"
                        class="text-text-muted hover:text-text-primary p-0.5 rounded transition cursor-pointer"
                        title="Salin Target ID"
                      >
                        <Check v-if="copiedId === log.id" class="h-3 w-3 text-success" />
                        <Copy v-else class="h-3 w-3" />
                      </button>
                      <router-link
                        v-if="getEntityLink(log)"
                        :to="getEntityLink(log)!"
                        class="text-text-muted hover:text-secondary p-0.5 rounded transition cursor-pointer"
                        title="Buka Entitas"
                      >
                        <ExternalLink class="h-3 w-3" />
                      </router-link>
                    </div>
                  </div>
                </td>

                <!-- 5. Notes / Summary -->
                <td class="py-4 px-5 max-w-xs">
                  <div class="line-clamp-2 text-[11px] text-text-secondary leading-relaxed">
                    {{ log.notes || '-' }}
                  </div>
                  <div v-if="log.ipAddress" class="mt-1 text-[10px] font-mono text-text-muted flex items-center gap-1">
                    <Server class="h-2.5 w-2.5" />
                    <span>IP: {{ log.ipAddress }}</span>
                  </div>
                </td>

                <!-- 6. Actions (Inspect) -->
                <td class="py-4 px-5 text-right whitespace-nowrap">
                  <button
                    @click="openDetailModal(log)"
                    class="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-[11px] font-semibold text-text-secondary hover:text-secondary hover:border-secondary transition cursor-pointer shadow active:scale-95"
                    title="Periksa Rincian Lengkap & Diff"
                  >
                    <Eye class="h-3.5 w-3.5" />
                    <span>Inspeksi</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 4. TIMELINE VIEW -->
      <div
        v-else-if="viewMode === 'timeline'"
        class="rounded-3xl border border-border/60 bg-elevated/70 p-6 shadow-2xl backdrop-blur-md"
      >
        <div class="relative pl-6 sm:pl-8">
          <!-- Continuous Vertical Timeline Track -->
          <div class="absolute left-3 top-3 bottom-3 w-0.5 bg-gradient-to-b from-primary via-secondary to-border/40"></div>

          <div class="space-y-6">
            <div
              v-for="log in logs"
              :key="log.id"
              class="relative group"
            >
              <!-- Timeline Dot -->
              <div
                class="absolute -left-6 sm:-left-8 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background shadow-lg transition-transform group-hover:scale-125"
                :class="getActionBadge(log.action).badgeClass"
              >
                <div class="h-2 w-2 rounded-full" :class="getActionBadge(log.action).dotClass"></div>
              </div>

              <!-- Log Item Card -->
              <div class="rounded-2xl border border-border/50 bg-surface/60 p-4 sm:p-5 hover:border-border hover:bg-surface transition shadow-md">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <!-- Left: Title & Badge -->
                  <div>
                    <div class="flex flex-wrap items-center gap-2">
                      <span
                        class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                        :class="getActionBadge(log.action).badgeClass"
                      >
                        <component :is="getActionBadge(log.action).icon" class="h-3 w-3 shrink-0" />
                        <span>{{ getActionBadge(log.action).label }}</span>
                      </span>

                      <span class="text-xs font-bold text-text-primary">
                        {{ log.adminName || 'Admin' }}
                      </span>
                      <span class="text-xs text-text-muted">
                        bertindak pada
                      </span>
                      <span class="text-xs font-semibold text-secondary flex items-center gap-1">
                        <component :is="getEntityIcon(log.targetEntity)" class="h-3 w-3" />
                        {{ formatEntityLabel(log.targetEntity) }}
                      </span>
                    </div>

                    <p class="text-xs text-text-secondary mt-2 leading-relaxed">
                      {{ log.notes || 'Aktivitas terekam tanpa catatan tambahan.' }}
                    </p>
                  </div>

                  <!-- Right: Time & Inspect CTA -->
                  <div class="text-right shrink-0">
                    <div class="text-xs font-mono font-medium text-text-primary">
                      {{ formatDate(log.createdAt) }}
                    </div>
                    <div class="text-[10px] text-text-muted mt-0.5">
                      {{ formatTime(log.createdAt) }} ({{ formatRelativeTime(log.createdAt) }})
                    </div>
                    <button
                      @click="openDetailModal(log)"
                      class="mt-2 text-[11px] font-semibold text-secondary hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Lihat Rincian</span>
                      <ArrowRight class="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <!-- Footer Meta Details -->
                <div class="mt-3 pt-3 border-t border-border/30 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-text-muted">
                  <div class="flex items-center gap-3">
                    <span>Target ID: {{ log.targetId }}</span>
                    <span v-if="log.ipAddress">• IP: {{ log.ipAddress }}</span>
                  </div>
                  <span>Audit ID: {{ log.id.slice(0, 8) }}...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- PAGINATION CONTROLS -->
      <div
        v-if="logs.length > 0"
        class="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/40 bg-elevated/40 px-5 py-4"
      >
        <div class="flex items-center gap-3 text-xs text-text-secondary">
          <span>Menampilkan {{ (currentPage - 1) * limit + 1 }} - {{ Math.min(currentPage * limit, totalLogs) }} dari {{ totalLogs }} entri audit</span>
          <div class="flex items-center gap-1 text-[11px]">
            <span>Per halaman:</span>
            <select
              v-model="limit"
              @change="loadAuditLogs(1)"
              class="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-secondary"
            >
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>
        </div>

        <div class="flex items-center gap-1.5">
          <button
            @click="loadAuditLogs(currentPage - 1)"
            :disabled="currentPage <= 1 || isLoading"
            class="inline-flex items-center gap-1 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary hover:border-secondary transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft class="h-3.5 w-3.5" />
            <span>Sebelumnya</span>
          </button>

          <span class="px-2 text-xs font-mono font-bold text-text-primary">
            {{ currentPage }} / {{ totalPages }}
          </span>

          <button
            @click="loadAuditLogs(currentPage + 1)"
            :disabled="currentPage >= totalPages || isLoading"
            class="inline-flex items-center gap-1 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary hover:border-secondary transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>Selanjutnya</span>
            <ChevronRight class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- ═══ MODAL: AUDIT RECORD INSPECTOR & JSON DIFF ═══ -->
    <div
      v-if="isDetailModalOpen && inspectingLog"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in"
      @click.self="closeDetailModal"
    >
      <div
        class="relative w-full max-w-3xl rounded-3xl border border-border bg-elevated p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        <!-- Modal Header -->
        <div class="flex items-start justify-between border-b border-border pb-4">
          <div class="flex items-center gap-3">
            <div
              class="flex h-11 w-11 items-center justify-center rounded-2xl border font-bold text-sm"
              :class="getActionBadge(inspectingLog.action).badgeClass"
            >
              <component :is="getActionBadge(inspectingLog.action).icon" class="h-5 w-5" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-heading text-xl font-bold text-text-primary">
                  Inspeksi Catatan Audit
                </h3>
                <span
                  class="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                  :class="getActionBadge(inspectingLog.action).badgeClass"
                >
                  {{ inspectingLog.action }}
                </span>
              </div>
              <p class="text-xs text-text-secondary font-mono mt-0.5">
                Record ID: {{ inspectingLog.id }}
              </p>
            </div>
          </div>

          <button
            @click="closeDetailModal"
            class="rounded-xl p-2 text-text-muted hover:text-text-primary hover:bg-surface transition cursor-pointer"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Modal Body Content -->
        <div class="mt-6 space-y-6">
          <!-- 1. Metadata Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-border/60 bg-surface/60 p-4 text-xs">
            <div>
              <span class="text-text-muted text-[10px] uppercase font-bold block mb-1">Administrator Pelaksana</span>
              <div class="font-bold text-text-primary">{{ inspectingLog.adminName || 'Admin' }}</div>
              <div class="text-[11px] text-text-muted">{{ inspectingLog.adminEmail || '-' }}</div>
              <div class="mt-1 text-[10px] font-mono text-secondary">ID: {{ inspectingLog.adminId }}</div>
            </div>

            <div>
              <span class="text-text-muted text-[10px] uppercase font-bold block mb-1">Waktu Kejadian</span>
              <div class="font-bold text-text-primary">{{ formatDate(inspectingLog.createdAt) }}, {{ formatTime(inspectingLog.createdAt) }}</div>
              <div class="text-[11px] text-text-muted font-mono mt-0.5">{{ inspectingLog.createdAt }}</div>
            </div>

            <div>
              <span class="text-text-muted text-[10px] uppercase font-bold block mb-1">Entitas Target</span>
              <div class="font-bold text-text-primary flex items-center gap-1.5">
                <component :is="getEntityIcon(inspectingLog.targetEntity)" class="h-3.5 w-3.5 text-secondary" />
                <span>{{ formatEntityLabel(inspectingLog.targetEntity) }} ({{ inspectingLog.targetEntity }})</span>
              </div>
              <div class="mt-1 text-[10px] font-mono text-text-muted flex items-center gap-1">
                <span>Target ID: {{ inspectingLog.targetId }}</span>
                <button
                  @click="copyText(inspectingLog.targetId, 'modal-target')"
                  class="text-secondary hover:underline cursor-pointer"
                >
                  <Copy class="h-2.5 w-2.5" />
                </button>
              </div>
            </div>

            <div>
              <span class="text-text-muted text-[10px] uppercase font-bold block mb-1">Jejak Klien & Jaringan</span>
              <div class="text-text-primary font-mono text-[11px]">IP: {{ inspectingLog.ipAddress || '127.0.0.1' }}</div>
              <div class="text-[10px] text-text-muted truncate mt-0.5" :title="inspectingLog.userAgent || ''">
                Agent: {{ inspectingLog.userAgent || 'Unknown Browser' }}
              </div>
            </div>
          </div>

          <!-- 2. Action Notes -->
          <div class="rounded-2xl border border-border/60 bg-surface/60 p-4">
            <span class="text-text-muted text-[10px] uppercase font-bold block mb-1.5">Catatan Resmi Tindakan</span>
            <p class="text-xs text-text-primary leading-relaxed bg-elevated/70 p-3 rounded-xl border border-border/40">
              {{ inspectingLog.notes || 'Tidak ada catatan khusus yang dilampirkan pada tindakan ini.' }}
            </p>
          </div>

          <!-- 3. State Mutation Diff (oldValues vs newValues) -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-text-primary flex items-center gap-1.5">
                <Code2 class="h-4 w-4 text-secondary" />
                <span>Mutasi Nilai Data (Old vs New Values)</span>
              </span>
              <button
                @click="copyLogJson"
                class="inline-flex items-center gap-1.5 text-xs text-secondary hover:underline cursor-pointer"
              >
                <Check v-if="copiedJson" class="h-3.5 w-3.5 text-success" />
                <Copy v-else class="h-3.5 w-3.5" />
                <span>{{ copiedJson ? 'Tersalin!' : 'Salin JSON Penuh' }}</span>
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Old Values Box -->
              <div class="rounded-2xl border border-border/60 bg-surface/90 p-4">
                <div class="flex items-center justify-between pb-2 border-b border-border/40 text-[11px] font-bold text-red-400">
                  <span>Nilai Sebelumnya (Old Values)</span>
                  <span class="text-[9px] uppercase font-mono bg-red-500/10 px-2 py-0.5 rounded">Before</span>
                </div>
                <pre class="mt-2 p-2 rounded-xl bg-background/90 text-[10px] font-mono text-text-secondary overflow-x-auto max-h-48 whitespace-pre-wrap">{{ formatJson(inspectingLog.oldValues) }}</pre>
              </div>

              <!-- New Values Box -->
              <div class="rounded-2xl border border-border/60 bg-surface/90 p-4">
                <div class="flex items-center justify-between pb-2 border-b border-border/40 text-[11px] font-bold text-success">
                  <span>Nilai Sesudahnya (New Values)</span>
                  <span class="text-[9px] uppercase font-mono bg-success/10 px-2 py-0.5 rounded">After</span>
                </div>
                <pre class="mt-2 p-2 rounded-xl bg-background/90 text-[10px] font-mono text-text-secondary overflow-x-auto max-h-48 whitespace-pre-wrap">{{ formatJson(inspectingLog.newValues) }}</pre>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="mt-6 pt-4 border-t border-border flex items-center justify-between">
          <div class="text-[10px] text-text-muted flex items-center gap-1">
            <Server class="h-3 w-3" />
            <span>Audit trail log bersumber dari tabel PostgreSQL admin_actions.</span>
          </div>
          <button
            @click="closeDetailModal"
            class="rounded-xl bg-elevated border border-border px-5 py-2 text-xs font-semibold text-text-primary hover:border-secondary transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
