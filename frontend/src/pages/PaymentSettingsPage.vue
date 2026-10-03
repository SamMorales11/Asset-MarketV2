<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { userService } from '../services/users';
import { useAuthStore } from '../stores/auth';
import type { PaymentSettings } from '../types';
import UserNav from '../components/UserNav.vue';
import {
  Building2,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ShieldCheck,
  Loader2,
  X,
  Save,
} from 'lucide-vue-next';

const authStore = useAuthStore();

const paymentData = ref<PaymentSettings | null>(null);
const isLoading = ref(true);
const isSaving = ref(false);
const isDeleting = ref(false);
const showDeleteConfirm = ref(false);

const feedbackMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null);

// Form Fields
const selectedPresetBank = ref('BCA');
const customBankName = ref('');
const bankAccountNumber = ref('');
const bankAccountHolder = ref('');
const bankBranch = ref('');
const bankSwiftOrCode = ref('');

const presetBanks = [
  'Bank Central Asia (BCA)',
  'Bank Mandiri',
  'Bank Negara Indonesia (BNI)',
  'Bank Rakyat Indonesia (BRI)',
  'Bank Syariah Indonesia (BSI)',
  'CIMB Niaga',
  'Bank Permata',
  'Bank Jago / Jenius (BTPN)',
  'Lainnya',
];

const computedBankName = computed(() => {
  if (selectedPresetBank.value === 'Lainnya') {
    return customBankName.value.trim();
  }
  return selectedPresetBank.value;
});

const formattedCardNumber = computed(() => {
  const clean = bankAccountNumber.value.replace(/\s+/g, '');
  if (!clean) return '•••• •••• •••• ••••';
  return clean.replace(/(\d{4})/g, '$1 ').trim();
});

onMounted(async () => {
  await loadPaymentSettings();
});

async function loadPaymentSettings() {
  isLoading.value = true;
  feedbackMessage.value = null;
  try {
    const data = await userService.getPaymentSettings();
    paymentData.value = data;

    if (data.bankName) {
      if (presetBanks.includes(data.bankName)) {
        selectedPresetBank.value = data.bankName;
      } else {
        selectedPresetBank.value = 'Lainnya';
        customBankName.value = data.bankName;
      }
    }
    if (data.bankAccountNumber) bankAccountNumber.value = data.bankAccountNumber;
    if (data.bankAccountHolder) bankAccountHolder.value = data.bankAccountHolder;
    if (data.bankBranch) bankBranch.value = data.bankBranch;
    if (data.bankSwiftOrCode) bankSwiftOrCode.value = data.bankSwiftOrCode;
  } catch (err: any) {
    feedbackMessage.value = {
      type: 'error',
      text: err?.message || 'Gagal memuat informasi rekening pembayaran.',
    };
  } finally {
    isLoading.value = false;
  }
}

async function handleSaveSettings() {
  feedbackMessage.value = null;

  const finalBankName = computedBankName.value;
  if (!finalBankName) {
    feedbackMessage.value = { type: 'error', text: 'Nama bank wajib diisi.' };
    return;
  }
  if (!bankAccountNumber.value.trim()) {
    feedbackMessage.value = { type: 'error', text: 'Nomor rekening bank wajib diisi.' };
    return;
  }
  if (!bankAccountHolder.value.trim()) {
    feedbackMessage.value = { type: 'error', text: 'Nama pemilik rekening wajib diisi.' };
    return;
  }

  isSaving.value = true;
  try {
    const updated = await userService.updatePaymentSettings({
      bankName: finalBankName,
      bankAccountNumber: bankAccountNumber.value.trim(),
      bankAccountHolder: bankAccountHolder.value.trim(),
      bankBranch: bankBranch.value.trim() || undefined,
      bankSwiftOrCode: bankSwiftOrCode.value.trim() || undefined,
    });

    paymentData.value = updated;
    authStore.updateUser({
      bankName: updated.bankName,
      bankAccountNumber: updated.bankAccountNumber,
      bankAccountHolder: updated.bankAccountHolder,
      bankBranch: updated.bankBranch,
    });

    feedbackMessage.value = {
      type: 'success',
      text: 'Informasi rekening pembayaran berhasil disimpan dan aktif untuk penarikan saldo.',
    };
  } catch (err: any) {
    feedbackMessage.value = {
      type: 'error',
      text: err?.message || 'Gagal menyimpan pengaturan rekening.',
    };
  } finally {
    isSaving.value = false;
  }
}

async function handleDeleteSettings() {
  isDeleting.value = true;
  try {
    await userService.deletePaymentSettings();
    paymentData.value = {
      bankName: null,
      bankAccountNumber: null,
      bankAccountHolder: null,
      bankBranch: null,
      bankSwiftOrCode: null,
      isConfigured: false,
      isVerifiedSeller: paymentData.value?.isVerifiedSeller || false,
    };
    bankAccountNumber.value = '';
    bankAccountHolder.value = '';
    bankBranch.value = '';
    bankSwiftOrCode.value = '';
    customBankName.value = '';
    selectedPresetBank.value = 'Bank Central Asia (BCA)';

    authStore.updateUser({
      bankName: null,
      bankAccountNumber: null,
      bankAccountHolder: null,
      bankBranch: null,
    });

    showDeleteConfirm.value = false;
    feedbackMessage.value = {
      type: 'success',
      text: 'Informasi rekening pembayaran berhasil dihapus dari sistem.',
    };
  } catch (err: any) {
    feedbackMessage.value = {
      type: 'error',
      text: err?.message || 'Gagal menghapus informasi rekening.',
    };
  } finally {
    isDeleting.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <!-- Breadcrumb -->
    <nav class="mb-4 flex items-center gap-2 text-xs text-text-secondary">
      <router-link to="/" class="hover:text-text-primary transition">Home</router-link>
      <span>/</span>
      <router-link to="/dashboard" class="hover:text-text-primary transition">Dashboard</router-link>
      <span>/</span>
      <span class="text-text-primary font-medium">Payment Settings</span>
    </nav>

    <!-- User Nav Sub-Header -->
    <UserNav />

    <!-- Page Header -->
    <div class="mb-8 border-b border-border pb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
          <Building2 class="h-4 w-4" />
          <span>Banking & Payout Preferences</span>
        </div>
        <h1 class="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-text-primary">
          Pengaturan Rekening Pembayaran
        </h1>
        <p class="text-xs text-text-secondary mt-1 max-w-2xl leading-relaxed">
          Atur rekening bank tujuan penarikan dana bagi hasil penjualan 60%. Seluruh pembayaran diproses melalui escrow terverifikasi.
        </p>
      </div>

      <!-- Quick Status Pill -->
      <div v-if="paymentData">
        <span
          class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
          :class="
            paymentData.isConfigured
              ? 'bg-success/15 text-success border border-success/30'
              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
          "
        >
          <CheckCircle2 v-if="paymentData.isConfigured" class="h-3.5 w-3.5" />
          <AlertCircle v-else class="h-3.5 w-3.5" />
          <span>{{ paymentData.isConfigured ? 'Rekening Terverifikasi' : 'Rekening Belum Diatur' }}</span>
        </span>
      </div>
    </div>

    <!-- FEEDBACK ALERT -->
    <div
      v-if="feedbackMessage"
      class="mb-6 flex items-center justify-between rounded-2xl p-4 text-xs font-medium"
      :class="
        feedbackMessage.type === 'success'
          ? 'bg-success/10 border border-success/30 text-success'
          : 'bg-red-500/10 border border-red-500/30 text-red-400'
      "
    >
      <div class="flex items-center gap-2.5">
        <CheckCircle2 v-if="feedbackMessage.type === 'success'" class="h-4 w-4 shrink-0" />
        <AlertCircle v-else class="h-4 w-4 shrink-0" />
        <span>{{ feedbackMessage.text }}</span>
      </div>
      <button class="hover:opacity-80" @click="feedbackMessage = null">
        <X class="h-4 w-4" />
      </button>
    </div>

    <!-- LOADING STATE -->
    <div v-if="isLoading" class="py-20 text-center">
      <Loader2 class="mx-auto h-8 w-8 text-primary animate-spin mb-3" />
      <p class="text-xs text-text-secondary">Memuat data rekening pembayaran...</p>
    </div>

    <!-- MAIN FORM GRID (F-PATTERN) -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <!-- LEFT COLUMN: 7 COLS (FORM CONTROLS) -->
      <div class="lg:col-span-7 rounded-3xl border border-border bg-elevated/80 p-6 sm:p-8 backdrop-blur-md shadow-2xl space-y-6">
        <div class="border-b border-border pb-4">
          <h2 class="font-heading text-2xl font-bold text-text-primary">
            Rincian Rekening Bank
          </h2>
          <p class="text-xs text-text-secondary mt-1">
            Pastikan nama pemilik rekening sama persis dengan identitas resmi Anda.
          </p>
        </div>

        <form class="space-y-5" @submit.prevent="handleSaveSettings">
          <!-- 1. Pilihan Bank -->
          <div class="space-y-2">
            <label class="block text-xs font-semibold text-text-primary">
              Nama Bank <span class="text-primary">*</span>
            </label>
            <select
              v-model="selectedPresetBank"
              class="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option v-for="bank in presetBanks" :key="bank" :value="bank">
                {{ bank }}
              </option>
            </select>
          </div>

          <!-- Custom Bank Input if Lainnya -->
          <div v-if="selectedPresetBank === 'Lainnya'" class="space-y-2">
            <label class="block text-xs font-semibold text-text-primary">
              Nama Bank Kustom <span class="text-primary">*</span>
            </label>
            <input
              v-model="customBankName"
              type="text"
              placeholder="Contoh: Bank BJB, Bank Danamon..."
              class="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <!-- 2. Nomor Rekening -->
          <div class="space-y-2">
            <label class="block text-xs font-semibold text-text-primary">
              Nomor Rekening <span class="text-primary">*</span>
            </label>
            <div class="relative">
              <input
                v-model="bankAccountNumber"
                type="text"
                placeholder="Contoh: 1234567890"
                class="w-full rounded-xl border border-border bg-background px-4 py-2.5 pl-10 text-xs font-mono text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
              <CreditCard class="absolute left-3 top-3 h-4 w-4 text-text-secondary" />
            </div>
            <p class="text-[10px] text-text-secondary">Masukkan angka nomor rekening tanpa spasi atau tanda hubung.</p>
          </div>

          <!-- 3. Nama Pemilik Rekening -->
          <div class="space-y-2">
            <label class="block text-xs font-semibold text-text-primary">
              Nama Lengkap Pemilik Rekening <span class="text-primary">*</span>
            </label>
            <input
              v-model="bankAccountHolder"
              type="text"
              placeholder="Contoh: John Doe"
              class="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary uppercase"
              required
            />
          </div>

          <!-- 4. Cabang & Kode SWIFT (2 Columns) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="block text-xs font-semibold text-text-primary">
                Kantor Cabang (Opsional)
              </label>
              <input
                v-model="bankBranch"
                type="text"
                placeholder="Contoh: KCU Sudirman Jakarta"
                class="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div class="space-y-2">
              <label class="block text-xs font-semibold text-text-primary">
                Kode Bank / SWIFT (Opsional)
              </label>
              <input
                v-model="bankSwiftOrCode"
                type="text"
                placeholder="Contoh: CENAIDJA"
                class="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-mono text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary uppercase"
              />
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-4">
            <button
              type="submit"
              :disabled="isSaving"
              class="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-xs font-semibold text-white shadow-xl shadow-primary/20 hover:bg-primary-hover transition disabled:opacity-50"
            >
              <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
              <Save v-else class="h-4 w-4" />
              <span>{{ isSaving ? 'Menyimpan...' : 'Simpan Pengaturan Rekening' }}</span>
            </button>

            <!-- Delete / Unlink Button (If Configured) -->
            <button
              v-if="paymentData?.isConfigured"
              type="button"
              class="inline-flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300 transition"
              @click="showDeleteConfirm = true"
            >
              <Trash2 class="h-4 w-4" />
              <span>Hapus Rekening</span>
            </button>
          </div>
        </form>
      </div>

      <!-- RIGHT COLUMN: 5 COLS (LIVE DIGITAL CARD PREVIEW & ESCROW GUARANTEE) -->
      <div class="lg:col-span-5 space-y-6">
        <!-- 1. LIVE LUXURY BANK CARD PREVIEW -->
        <div class="space-y-3">
          <span class="text-xs font-bold text-text-secondary uppercase tracking-wider block">
            Pratinjau Kartu Rekening Digital
          </span>

          <div class="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-tr from-[#141414] via-[#1E1E1E] to-[#282828] p-6 shadow-2xl text-white space-y-6">
            <!-- Background luxury ambient glow -->
            <div class="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-primary/20 blur-2xl pointer-events-none" />
            <div class="absolute -left-8 -bottom-8 h-36 w-36 rounded-full bg-secondary/20 blur-2xl pointer-events-none" />

            <!-- Card Header: Bank Name & Chip -->
            <div class="relative flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Building2 class="h-5 w-5 text-secondary" />
                <span class="font-heading text-lg font-bold tracking-wide truncate max-w-[200px]">
                  {{ computedBankName || 'NAMA BANK' }}
                </span>
              </div>
              <span class="rounded bg-white/10 border border-white/20 px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest text-text-secondary">
                DEBIT / PAYOUT
              </span>
            </div>

            <!-- Chip & Contactless Icon -->
            <div class="relative flex items-center gap-3">
              <div class="h-8 w-11 rounded-lg bg-gradient-to-tr from-amber-300/80 to-amber-500 border border-amber-200/50 shadow-inner" />
              <div class="text-[10px] text-white/50 tracking-widest font-mono">ASSET ESCROW</div>
            </div>

            <!-- Card Number -->
            <div class="relative pt-2">
              <span class="text-[9px] text-white/50 block font-mono uppercase">Nomor Rekening Payout</span>
              <div class="font-mono text-lg sm:text-xl font-bold tracking-widest text-white mt-0.5">
                {{ formattedCardNumber }}
              </div>
            </div>

            <!-- Card Footer: Card Holder & Branch -->
            <div class="relative flex items-end justify-between pt-2 border-t border-white/10 text-xs">
              <div class="truncate max-w-[180px]">
                <span class="text-[9px] text-white/50 block font-mono uppercase">Nama Pemilik</span>
                <span class="font-bold tracking-wide uppercase text-white truncate block">
                  {{ bankAccountHolder.trim() || 'NAMA LENGKAP PEMILIK' }}
                </span>
              </div>

              <div class="text-right">
                <span class="text-[9px] text-white/50 block font-mono uppercase">Cabang</span>
                <span class="text-[11px] text-white/80 font-mono truncate block max-w-[120px]">
                  {{ bankBranch.trim() || 'Kantor Pusat' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. ESCROW SECURITY GUARANTEE -->
        <div class="rounded-3xl border border-secondary/20 bg-secondary/5 p-6 backdrop-blur-md space-y-3 text-xs">
          <div class="flex items-center gap-2 text-secondary font-bold">
            <ShieldCheck class="h-4 w-4" />
            <span>Keamanan Escrow & Perlindungan Bagi Hasil</span>
          </div>
          <p class="text-text-secondary leading-relaxed text-[11px]">
            Informasi rekening hanya dipergunakan untuk proses transfer pencairan 60% komisi penjualan kreator. Nomor rekening disimpan secara terenkripsi dan tidak dibagikan kepada pembeli.
          </p>
          <ul class="space-y-1.5 text-[11px] text-text-secondary pt-2 border-t border-secondary/20">
            <li class="flex items-center gap-1.5 text-text-primary">
              <CheckCircle2 class="h-3.5 w-3.5 text-success" />
              <span>Verifikasi otomatis nama pemilik rekening</span>
            </li>
            <li class="flex items-center gap-1.5 text-text-primary">
              <CheckCircle2 class="h-3.5 w-3.5 text-success" />
              <span>Pencairan dana 1x24 jam hari kerja</span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- MODAL: DELETE CONFIRMATION -->
    <div
      v-if="showDeleteConfirm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div class="relative w-full max-w-md rounded-3xl border border-border bg-elevated p-6 shadow-2xl space-y-5">
        <div class="flex items-center justify-between border-b border-border pb-3">
          <div class="flex items-center gap-2 text-red-400 font-bold text-sm">
            <AlertCircle class="h-4 w-4" />
            <span>Konfirmasi Hapus Rekening</span>
          </div>
          <button class="text-text-secondary hover:text-text-primary" @click="showDeleteConfirm = false">
            <X class="h-4 w-4" />
          </button>
        </div>

        <p class="text-xs text-text-secondary leading-relaxed">
          Apakah Anda yakin ingin menghapus rekening bank ini? Setelah dihapus, Anda tidak dapat melakukan penarikan saldo sampai rekening baru didaftarkan.
        </p>

        <div class="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <button
            class="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-elevated transition"
            @click="showDeleteConfirm = false"
          >
            Batal
          </button>
          <button
            :disabled="isDeleting"
            class="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 transition disabled:opacity-50"
            @click="handleDeleteSettings"
          >
            <Loader2 v-if="isDeleting" class="h-4 w-4 animate-spin inline-block mr-1" />
            <span>Hapus Rekening</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
