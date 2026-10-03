<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { userService } from '../services/users';
import { formatCurrency } from '../utils/formatters';
import type { RevenueData } from '../types';
import {
  Wallet,
  ArrowUpRight,
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  DollarSign,
  TrendingUp,
} from 'lucide-vue-next';

const revenueData = ref<RevenueData | null>(null);
const isLoading = ref(true);
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);

// Withdrawal Modal State
const isWithdrawModalOpen = ref(false);
const withdrawAmount = ref<number>(50000);
const isWithdrawLoading = ref(false);
const withdrawError = ref<string | null>(null);

// Bank Account Modal State
const isBankModalOpen = ref(false);
const bankName = ref('');
const bankAccountNumber = ref('');
const bankAccountHolder = ref('');
const isBankLoading = ref(false);
const bankError = ref<string | null>(null);

onMounted(async () => {
  await loadRevenueData();
});

async function loadRevenueData() {
  isLoading.value = true;
  errorMessage.value = null;

  try {
    revenueData.value = await userService.getMyRevenue();
    if (revenueData.value.bankAccount) {
      bankName.value = revenueData.value.bankAccount.bankName || '';
      bankAccountNumber.value = revenueData.value.bankAccount.bankAccountNumber || '';
      bankAccountHolder.value = revenueData.value.bankAccount.bankAccountHolder || '';
    }
  } catch (err: any) {
    console.error('Failed to load revenue:', err);
    errorMessage.value = err?.message || 'Gagal memuat rincian revenue dan saldo kreator.';
  } finally {
    isLoading.value = false;
  }
}

async function handleWithdraw() {
  if (!revenueData.value) return;
  withdrawError.value = null;

  const currentBal = revenueData.value.summary.availableBalance;
  if (withdrawAmount.value < 50000) {
    withdrawError.value = 'Nominal penarikan minimal Rp 50.000.';
    return;
  }
  if (withdrawAmount.value > currentBal) {
    withdrawError.value = `Saldo tidak mencukupi (Tersedia: ${formatCurrency(currentBal)}).`;
    return;
  }
  if (!revenueData.value.bankAccount.bankAccountNumber) {
    withdrawError.value = 'Harap lengkapi rekening bank tujuan pencairan terlebih dahulu.';
    return;
  }

  isWithdrawLoading.value = true;
  try {
    const res = await userService.requestPayout(withdrawAmount.value);
    successMessage.value = res.message || 'Permintaan penarikan dana berhasil diproses.';
    isWithdrawModalOpen.value = false;
    await loadRevenueData();
  } catch (err: any) {
    withdrawError.value = err?.message || 'Gagal mengajukan penarikan dana.';
  } finally {
    isWithdrawLoading.value = false;
  }
}

async function handleSaveBankAccount() {
  bankError.value = null;

  if (!bankName.value || !bankAccountNumber.value || !bankAccountHolder.value) {
    bankError.value = 'Semua bidang informasi rekening wajib diisi.';
    return;
  }

  isBankLoading.value = true;
  try {
    await userService.updateBankAccount({
      bankName: bankName.value.trim(),
      bankAccountNumber: bankAccountNumber.value.trim(),
      bankAccountHolder: bankAccountHolder.value.trim(),
    });

    successMessage.value = 'Informasi rekening bank pencairan berhasil diperbarui.';
    isBankModalOpen.value = false;
    await loadRevenueData();
  } catch (err: any) {
    bankError.value = err?.message || 'Gagal menyimpan rekening bank.';
  } finally {
    isBankLoading.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <!-- Breadcrumb -->
    <nav class="mb-6 flex items-center gap-2 text-xs text-text-secondary">
      <router-link to="/" class="hover:text-text-primary transition">Home</router-link>
      <span>/</span>
      <router-link to="/dashboard" class="hover:text-text-primary transition">Dashboard</router-link>
      <span>/</span>
      <span class="text-text-primary font-medium">Revenue & Pembagian Hasil</span>
    </nav>

    <!-- Header -->
    <div class="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
      <div>
        <div class="flex items-center gap-2 text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
          <TrendingUp class="h-4 w-4" />
          <span>Creator Monetization</span>
        </div>
        <h1 class="font-heading text-4xl sm:text-5xl font-bold tracking-tight text-text-primary">
          Revenue & Saldo Kreator
        </h1>
        <p class="mt-2 text-xs sm:text-sm text-text-secondary">
          Buku besar bagi hasil 60/40, mutasi saldo append-only, dan penarikan dana payout rekening bank.
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-3">
        <button
          class="inline-flex items-center gap-2 rounded-2xl border border-border bg-elevated px-4 py-2.5 text-xs font-semibold text-text-primary hover:border-secondary transition shadow"
          @click="isBankModalOpen = true"
        >
          <Building2 class="h-4 w-4 text-secondary" />
          <span>Atur Rekening Payout</span>
        </button>

        <button
          :disabled="!revenueData?.payoutInfo.canWithdraw"
          class="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-2.5 text-xs font-semibold text-white shadow-xl shadow-primary/20 hover:bg-primary-hover transition disabled:opacity-40"
          @click="isWithdrawModalOpen = true"
        >
          <Wallet class="h-4 w-4" />
          <span>Tarik Saldo</span>
        </button>
      </div>
    </div>

    <!-- Success Feedback Alert -->
    <div
      v-if="successMessage"
      class="mb-6 flex items-center justify-between rounded-2xl border border-success/30 bg-success/10 p-4 text-xs font-medium text-success"
    >
      <div class="flex items-center gap-2.5">
        <CheckCircle2 class="h-4 w-4 shrink-0" />
        <span>{{ successMessage }}</span>
      </div>
      <button class="text-success hover:opacity-80" @click="successMessage = null">
        <X class="h-4 w-4" />
      </button>
    </div>

    <!-- LOADING STATE -->
    <div v-if="isLoading" class="py-24 text-center">
      <Loader2 class="mx-auto h-8 w-8 text-primary animate-spin mb-3" />
      <h3 class="font-heading text-xl font-bold text-text-primary">Memuat Buku Besar Keuangan...</h3>
    </div>

    <div v-else-if="revenueData" class="space-y-8">
      <!-- 4 METRIC CARDS (Luxury Editorial Cards) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Card 1: Saldo Tersedia -->
        <div class="rounded-3xl border border-primary/40 bg-primary/10 p-6 backdrop-blur-md space-y-2 shadow-xl">
          <div class="flex items-center justify-between text-xs text-primary font-bold uppercase tracking-wider">
            <span>Saldo Tersedia (Ready)</span>
            <Wallet class="h-4 w-4" />
          </div>
          <div class="font-mono text-3xl font-bold text-text-primary pt-1">
            {{ formatCurrency(revenueData.summary.availableBalance) }}
          </div>
          <p class="text-[11px] text-text-secondary">
            Bisa dicairkan ke rekening bank terdaftar (Min. Rp 50.000).
          </p>
        </div>

        <!-- Card 2: 60% Creator Earnings -->
        <div class="rounded-3xl border border-border bg-elevated/70 p-6 backdrop-blur-md space-y-2 shadow-lg">
          <div class="flex items-center justify-between text-xs text-success font-bold uppercase tracking-wider">
            <span>Pendapatan Bersih (60%)</span>
            <ArrowUpRight class="h-4 w-4" />
          </div>
          <div class="font-mono text-3xl font-bold text-success pt-1">
            {{ formatCurrency(revenueData.summary.creatorEarnings) }}
          </div>
          <p class="text-[11px] text-text-secondary">
            Total 60% dari seluruh aset digital yang berhasil terjual.
          </p>
        </div>

        <!-- Card 3: 100% Gross Volume -->
        <div class="rounded-3xl border border-border bg-elevated/70 p-6 backdrop-blur-md space-y-2 shadow-lg">
          <div class="flex items-center justify-between text-xs text-text-secondary font-bold uppercase tracking-wider">
            <span>Volume Penjualan Kotor</span>
            <DollarSign class="h-4 w-4 text-secondary" />
          </div>
          <div class="font-mono text-3xl font-bold text-text-primary pt-1">
            {{ formatCurrency(revenueData.summary.grossSales) }}
          </div>
          <p class="text-[11px] text-text-secondary">
            Akumulasi 100% omset dari {{ revenueData.summary.totalSalesVolume }} aset terjual.
          </p>
        </div>

        <!-- Card 4: 40% Platform Share -->
        <div class="rounded-3xl border border-border bg-elevated/70 p-6 backdrop-blur-md space-y-2 shadow-lg">
          <div class="flex items-center justify-between text-xs text-text-secondary font-bold uppercase tracking-wider">
            <span>Komisi Platform (40%)</span>
            <ShieldCheck class="h-4 w-4 text-secondary" />
          </div>
          <div class="font-mono text-3xl font-bold text-text-secondary pt-1">
            {{ formatCurrency(revenueData.summary.platformFees) }}
          </div>
          <p class="text-[11px] text-text-secondary">
            Pemeliharaan server, escrow rekening bersama, dan operasional.
          </p>
        </div>
      </div>

      <!-- MIDDLE ROW: BANK ACCOUNT & PAYOUT STATUS (2-Column Grid) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <!-- Left: Rekening Bank Penjual (7 Cols) -->
        <div class="lg:col-span-7 rounded-3xl border border-border bg-elevated/80 p-6 backdrop-blur-md space-y-5 shadow-xl">
          <div class="flex items-center justify-between border-b border-border pb-4">
            <div class="flex items-center gap-2">
              <Building2 class="h-5 w-5 text-secondary" />
              <h3 class="font-heading text-xl font-bold text-text-primary">
                Rekening Pencairan Dana Penjual
              </h3>
            </div>
            <span
              v-if="revenueData.bankAccount.bankAccountNumber"
              class="rounded-full bg-success/15 border border-success/30 px-2.5 py-0.5 text-[10px] font-bold text-success uppercase"
            >
              Aktif & Siap Payout
            </span>
          </div>

          <div v-if="revenueData.bankAccount.bankAccountNumber" class="space-y-4">
            <div class="grid grid-cols-2 gap-4 rounded-2xl border border-border bg-background p-4 text-xs">
              <div>
                <span class="text-text-secondary block">Nama Bank</span>
                <strong class="text-text-primary font-bold text-sm">{{ revenueData.bankAccount.bankName }}</strong>
              </div>
              <div>
                <span class="text-text-secondary block">Nomor Rekening</span>
                <strong class="text-text-primary font-mono font-bold text-sm">{{ revenueData.bankAccount.bankAccountNumber }}</strong>
              </div>
              <div>
                <span class="text-text-secondary block">Nama Pemilik Rekening</span>
                <strong class="text-text-primary font-bold">{{ revenueData.bankAccount.bankAccountHolder }}</strong>
              </div>
              <div>
                <span class="text-text-secondary block">Status Kreator</span>
                <span class="inline-flex items-center gap-1 text-secondary font-bold">
                  <CheckCircle2 class="h-3.5 w-3.5" />
                  <span>Kreator Terverifikasi</span>
                </span>
              </div>
            </div>

            <p class="text-xs text-text-secondary leading-relaxed">
              Hasil penjualan 60% Anda akan ditransfer ke rekening bank di atas setiap kali Anda mengajukan penarikan dana.
            </p>
          </div>

          <!-- Empty Bank Account -->
          <div v-else class="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-3">
            <div class="flex items-start gap-3">
              <AlertCircle class="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div class="text-xs text-amber-300 leading-relaxed">
                <strong class="font-bold block text-text-primary mb-0.5">Rekening Bank Belum Didaftarkan</strong>
                Anda belum mengatur nomor rekening bank untuk pencairan hasil penjualan. Silakan daftarkan rekening Anda agar dapat melakukan penarikan dana.
              </div>
            </div>
            <button
              class="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow hover:bg-primary-hover transition"
              @click="isBankModalOpen = true"
            >
              Atur Rekening Bank Sekarang
            </button>
          </div>
        </div>

        <!-- Right: Payout Rules & Pending Earnings (5 Cols) -->
        <div class="lg:col-span-5 rounded-3xl border border-border bg-elevated/80 p-6 backdrop-blur-md space-y-4 shadow-xl">
          <h3 class="font-heading text-xl font-bold text-text-primary border-b border-border pb-3">
            Kebijakan & Jadwal Payout
          </h3>

          <div class="space-y-3 text-xs text-text-secondary">
            <div class="flex justify-between py-1 border-b border-border/50">
              <span>Batas Minimal Penarikan</span>
              <span class="font-mono font-bold text-text-primary">Rp 50.000</span>
            </div>
            <div class="flex justify-between py-1 border-b border-border/50">
              <span>Waktu Proses Pencairan</span>
              <span class="font-bold text-text-primary">1–2 Hari Kerja</span>
            </div>
            <div class="flex justify-between py-1 border-b border-border/50">
              <span>Pendapatan Tertunda (Review Resi)</span>
              <span class="font-mono font-bold text-amber-400">{{ formatCurrency(revenueData.summary.pendingEarnings) }}</span>
            </div>
            <div class="flex justify-between py-1">
              <span>Total Telah Ditarik</span>
              <span class="font-mono font-bold text-text-primary">{{ formatCurrency(revenueData.summary.withdrawnTotal) }}</span>
            </div>
          </div>

          <div class="rounded-2xl border border-secondary/20 bg-secondary/5 p-4 flex items-start gap-3">
            <ShieldCheck class="h-5 w-5 text-secondary shrink-0 mt-0.5" />
            <div class="text-[11px] text-text-secondary leading-relaxed">
              <strong class="text-text-primary">Perhitungan Bagi Hasil PRD 7.2:</strong>
              Hak kreator 60% dicatat otomatis saat admin memverifikasi transfer pembayaran pembeli.
            </div>
          </div>
        </div>
      </div>

      <!-- MUTATION LEDGER HISTORY TABLE -->
      <div class="rounded-3xl border border-border bg-elevated/70 p-6 shadow-2xl backdrop-blur-md space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h3 class="font-heading text-2xl font-bold text-text-primary">
              Buku Besar Mutasi Saldo (Revenue Ledger)
            </h3>
            <p class="text-xs text-text-secondary">
              Catatan mutasi saldo append-only tidak dapat diubah (immutable).
            </p>
          </div>
          <span class="text-xs font-mono text-text-secondary">
            {{ revenueData.ledgerEntries.length }} Mutasi Tercatat
          </span>
        </div>

        <!-- Empty Ledger State -->
        <div
          v-if="revenueData.ledgerEntries.length === 0"
          class="py-12 text-center text-xs text-text-secondary space-y-2"
        >
          <Wallet class="mx-auto h-8 w-8 text-text-secondary/60 mb-2" />
          <p class="text-text-primary font-bold">Belum Ada Mutasi Saldo</p>
          <p>Mutasi saldo 60% akan otomatis tercatat di sini begitu ada pembeli yang menyelesaikan transfer bank.</p>
        </div>

        <!-- Ledger Table (Desktop) -->
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-border bg-elevated-subtle/50 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                <th class="py-3 px-4">Tanggal & Waktu</th>
                <th class="py-3 px-3">Tipe</th>
                <th class="py-3 px-4">Keterangan</th>
                <th class="py-3 px-4 text-right">Penjualan Kotor</th>
                <th class="py-3 px-4 text-right">Fee Platform (40%)</th>
                <th class="py-3 px-4 text-right">Masuk Bersih (60%)</th>
                <th class="py-3 px-4 text-right">Saldo Akhir</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="entry in revenueData.ledgerEntries"
                :key="entry.id"
                class="hover:bg-elevated/80 transition"
              >
                <!-- Timestamp -->
                <td class="py-3.5 px-4 font-mono text-text-secondary text-[11px] whitespace-nowrap">
                  {{ new Date(entry.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) }}
                </td>

                <!-- Entry Type -->
                <td class="py-3.5 px-3">
                  <span
                    class="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase font-mono"
                    :class="
                      entry.entryType === 'sale_earning'
                        ? 'bg-success/15 border border-success/30 text-success'
                        : entry.entryType === 'withdrawal'
                        ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                        : 'bg-secondary/15 border border-secondary/30 text-secondary'
                    "
                  >
                    {{ entry.entryType.replace('_', ' ') }}
                  </span>
                </td>

                <!-- Description -->
                <td class="py-3.5 px-4 max-w-xs text-text-primary truncate">
                  {{ entry.description }}
                </td>

                <!-- Gross -->
                <td class="py-3.5 px-4 text-right font-mono text-text-secondary">
                  {{ formatCurrency(entry.grossAmount) }}
                </td>

                <!-- Platform Fee 40% -->
                <td class="py-3.5 px-4 text-right font-mono text-red-400/80">
                  -{{ formatCurrency(entry.platformFee) }}
                </td>

                <!-- Net Amount (60%) -->
                <td
                  class="py-3.5 px-4 text-right font-mono font-bold"
                  :class="entry.entryType === 'withdrawal' ? 'text-amber-400' : 'text-success'"
                >
                  {{ entry.entryType === 'withdrawal' ? '-' : '+' }}{{ formatCurrency(entry.netAmount) }}
                </td>

                <!-- Balance After -->
                <td class="py-3.5 px-4 text-right font-mono font-bold text-text-primary">
                  {{ formatCurrency(entry.balanceAfter) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- MODAL: WITHDRAW PAYOUT -->
    <div
      v-if="isWithdrawModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div class="w-full max-w-md rounded-3xl border border-border bg-elevated p-6 shadow-2xl space-y-5">
        <div class="flex items-center justify-between border-b border-border pb-3">
          <h3 class="font-heading text-2xl font-bold text-text-primary">Tarik Saldo Kreator</h3>
          <button class="text-text-secondary hover:text-text-primary" @click="isWithdrawModalOpen = false">
            <X class="h-5 w-5" />
          </button>
        </div>

        <div v-if="withdrawError" class="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
          {{ withdrawError }}
        </div>

        <div class="space-y-4 text-xs">
          <div class="rounded-2xl border border-border bg-background p-4 space-y-1">
            <span class="text-text-secondary">Saldo Tersedia untuk Ditarik:</span>
            <div class="font-mono text-2xl font-bold text-success">
              {{ formatCurrency(revenueData?.summary.availableBalance || 0) }}
            </div>
            <p class="text-[11px] text-text-secondary pt-1">
              Rekening Tujuan: <strong>{{ revenueData?.bankAccount.bankName }} ({{ revenueData?.bankAccount.bankAccountNumber }})</strong>
            </p>
          </div>

          <div>
            <label class="block font-semibold text-text-secondary mb-1.5">Nominal Penarikan (Rp)</label>
            <input
              v-model.number="withdrawAmount"
              type="number"
              min="50000"
              step="10000"
              class="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-mono text-text-primary focus:border-primary focus:outline-none"
            />
            <p class="text-[11px] text-text-secondary mt-1">Minimal penarikan: Rp 50.000</p>
          </div>

          <!-- Quick shortcuts -->
          <div class="flex items-center gap-2">
            <button
              class="rounded-lg border border-border px-2.5 py-1 text-[11px] hover:border-primary"
              @click="withdrawAmount = 50000"
            >
              Rp 50.000
            </button>
            <button
              class="rounded-lg border border-border px-2.5 py-1 text-[11px] hover:border-primary"
              @click="withdrawAmount = 100000"
            >
              Rp 100.000
            </button>
            <button
              class="rounded-lg border border-border px-2.5 py-1 text-[11px] hover:border-primary"
              @click="withdrawAmount = revenueData?.summary.availableBalance || 50000"
            >
              Tarik Semua
            </button>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <button
            class="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary"
            @click="isWithdrawModalOpen = false"
          >
            Batal
          </button>

          <button
            :disabled="isWithdrawLoading"
            class="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-white shadow hover:bg-primary-hover disabled:opacity-50"
            @click="handleWithdraw"
          >
            <Loader2 v-if="isWithdrawLoading" class="h-4 w-4 animate-spin" />
            <span v-else>Konfirmasi Penarikan</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: SET BANK ACCOUNT -->
    <div
      v-if="isBankModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div class="w-full max-w-md rounded-3xl border border-border bg-elevated p-6 shadow-2xl space-y-5">
        <div class="flex items-center justify-between border-b border-border pb-3">
          <h3 class="font-heading text-2xl font-bold text-text-primary">Atur Rekening Payout</h3>
          <button class="text-text-secondary hover:text-text-primary" @click="isBankModalOpen = false">
            <X class="h-5 w-5" />
          </button>
        </div>

        <div v-if="bankError" class="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
          {{ bankError }}
        </div>

        <form class="space-y-4 text-xs" @submit.prevent="handleSaveBankAccount">
          <div>
            <label class="block font-semibold text-text-secondary mb-1">Nama Bank</label>
            <input
              v-model="bankName"
              type="text"
              required
              placeholder="Contoh: BCA, Mandiri, BNI, BRI, Jago..."
              class="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label class="block font-semibold text-text-secondary mb-1">Nomor Rekening</label>
            <input
              v-model="bankAccountNumber"
              type="text"
              required
              placeholder="Nomor rekening bank Anda"
              class="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label class="block font-semibold text-text-secondary mb-1">Nama Pemilik Rekening</label>
            <input
              v-model="bankAccountHolder"
              type="text"
              required
              placeholder="Nama lengkap sesuai buku tabungan"
              class="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none"
            />
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              class="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary"
              @click="isBankModalOpen = false"
            >
              Batal
            </button>

            <button
              type="submit"
              :disabled="isBankLoading"
              class="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-white shadow hover:bg-primary-hover disabled:opacity-50"
            >
              <Loader2 v-if="isBankLoading" class="h-4 w-4 animate-spin" />
              <span v-else>Simpan Rekening</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
