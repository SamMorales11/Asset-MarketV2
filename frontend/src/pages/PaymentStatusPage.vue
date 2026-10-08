<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { transactionService, type TransactionDetailResponse } from '../services/transactions';
import { formatCurrency } from '../utils/formatters';
import { getAssetImageUrl, handleImageFallback } from '../utils/imageUrl';
import { useToast } from '../composables/useToast';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Building2,
  Copy,
  Check,
  RefreshCw,
  Download,
  FolderOpen,
  ArrowRight,
  UploadCloud,
  Loader2,
  Eye,
} from 'lucide-vue-next';

const route = useRoute();

const { toast } = useToast();
const invoiceNumber = computed(() => route.params.invoiceNumber as string);

const detail = ref<TransactionDetailResponse | null>(null);
const isLoading = ref(true);
const errorMessage = ref<string | null>(null);
const isRefreshing = ref(false);
const copiedBank = ref<string | null>(null);
const previousStatus = ref<string | null>(null);

// Re-upload confirmation state if rejected or pending
const isSubmittingProof = ref(false);
const showReuploadForm = ref(false);
const showProofPreview = ref(false);
const submitError = ref<string | null>(null);
const submitSuccess = ref<string | null>(null);

const senderBank = ref('BCA');
const senderAccountNumber = ref('');
const senderAccountName = ref('');
const transferDate = ref(new Date().toISOString().slice(0, 16));
const selectedDestinationBank = ref('BCA');
const proofFile = ref<File | null>(null);
const proofPreviewUrl = ref<string | null>(null);

let pollInterval: any = null;

onMounted(async () => {
  await loadTransactionDetail();

  // If in 'processing' state, poll every 10 seconds for real-time admin approval
  pollInterval = setInterval(async () => {
    if (detail.value?.transaction.status === 'processing') {
      await refreshStatus();
    }
  }, 10000);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});

async function loadTransactionDetail() {
  if (!invoiceNumber.value) return;

  isLoading.value = true;
  errorMessage.value = null;

  try {
    const data = await transactionService.getTransactionByInvoice(invoiceNumber.value);
    previousStatus.value = data.transaction.status;
    detail.value = data;
  } catch (err: any) {
    console.error('Failed to load transaction:', err);
    errorMessage.value = err?.message || 'Invoice tidak ditemukan atau Anda tidak memiliki akses.';
  } finally {
    isLoading.value = false;
  }
}

async function refreshStatus() {
  if (!invoiceNumber.value) return;
  isRefreshing.value = true;
  try {
    const data = await transactionService.getTransactionByInvoice(invoiceNumber.value);
    if (
      previousStatus.value &&
      previousStatus.value !== 'paid' &&
      data.transaction.status === 'paid'
    ) {
      toast.success(
        'Pembayaran Berhasil Diverifikasi!',
        `Invoice ${data.transaction.invoiceNumber} telah terverifikasi. Seluruh aset digital Anda kini aktif dan siap diunduh!`
      );
    } else if (
      previousStatus.value &&
      previousStatus.value !== 'failed' &&
      data.transaction.status === 'failed'
    ) {
      const reason = data.paymentConfirmation?.rejectionReason;
      toast.error(
        'Pembayaran Ditolak',
        reason ? `Alasan penolakan kurator: "${reason}".` : 'Konfirmasi transfer tidak dapat diverifikasi.'
      );
    }
    previousStatus.value = data.transaction.status;
    detail.value = data;
  } catch (err: any) {
    console.warn('Auto-refresh error:', err);
  } finally {
    isRefreshing.value = false;
  }
}

async function copyText(text: string, id: string) {
  try {
    await navigator.clipboard.writeText(text);
    copiedBank.value = id;
    setTimeout(() => {
      copiedBank.value = null;
    }, 2000);
    toast.success('Disalin ke Clipboard', `Nomor rekening ${text} berhasil disalin.`);
  } catch {
    toast.info('Nomor Rekening', `Nomor rekening: ${text}`);
  }
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    proofFile.value = file;
    proofPreviewUrl.value = URL.createObjectURL(file);
  }
}

async function handleReuploadProof() {
  if (!detail.value || isSubmittingProof.value) return;

  submitError.value = null;
  submitSuccess.value = null;

  if (!senderBank.value || !senderAccountNumber.value || !senderAccountName.value) {
    submitError.value = 'Harap lengkapi semua informasi rekening pengirim.';
    return;
  }

  if (!proofFile.value) {
    submitError.value = 'Silakan unggah foto/screenshot bukti transfer.';
    return;
  }

  isSubmittingProof.value = true;

  try {
    const formData = new FormData();
    formData.append('invoiceNumber', detail.value.transaction.invoiceNumber);
    formData.append('senderBank', senderBank.value);
    formData.append('senderAccountNumber', senderAccountNumber.value);
    formData.append('senderAccountName', senderAccountName.value);
    formData.append('destinationBank', selectedDestinationBank.value);
    formData.append('transferAmount', detail.value.transaction.totalAmount.toString());
    formData.append('transferDate', transferDate.value);
    formData.append('proofImage', proofFile.value);

    await transactionService.submitPaymentConfirmation(formData);

    submitSuccess.value = 'Bukti pembayaran berhasil dikirim!';
    showReuploadForm.value = false;
    toast.success(
      'Bukti Pembayaran Terkirim!',
      'Bukti transfer Anda telah diterima dan masuk ke antrean verifikasi kurator.'
    );
    await refreshStatus();
  } catch (err: any) {
    console.error('Submission failed:', err);
    const errorText = err?.message || 'Gagal mengirim bukti pembayaran.';
    submitError.value = errorText;
    toast.error('Gagal Mengunggah Bukti', errorText);
  } finally {
    isSubmittingProof.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    <!-- Breadcrumb -->
    <nav class="mb-6 flex items-center gap-2 text-xs text-text-secondary">
      <router-link to="/" class="hover:text-text-primary transition">Home</router-link>
      <span>/</span>
      <router-link to="/cart" class="hover:text-text-primary transition">Cart</router-link>
      <span>/</span>
      <span class="text-text-primary font-medium">Status Pembayaran</span>
    </nav>

    <!-- LOADING STATE -->
    <div v-if="isLoading" class="py-24 text-center">
      <div class="inline-flex items-center justify-center p-4 rounded-3xl bg-elevated border border-border text-primary animate-spin mb-4">
        <Loader2 class="h-8 w-8" />
      </div>
      <h2 class="font-heading text-2xl font-bold text-text-primary">
        Memuat Status Pembayaran...
      </h2>
      <p class="text-xs text-text-secondary mt-1">Mengambil data tagihan dari server.</p>
    </div>

    <!-- ERROR STATE -->
    <div
      v-else-if="errorMessage || !detail"
      class="rounded-3xl border border-primary/30 bg-primary/10 p-12 text-center"
    >
      <AlertCircle class="mx-auto h-12 w-12 text-primary mb-3" />
      <h2 class="font-heading text-2xl font-bold text-text-primary mb-2">
        Tagihan Tidak Ditemukan
      </h2>
      <p class="max-w-md mx-auto text-xs text-text-secondary mb-6 leading-relaxed">
        {{ errorMessage }}
      </p>
      <div class="flex items-center justify-center gap-3">
        <button
          type="button"
          @click="loadTransactionDetail"
          class="inline-flex items-center gap-2 rounded-xl border border-border bg-elevated px-5 py-2.5 text-xs font-semibold text-text-primary hover:border-border-hover transition"
        >
          <span>Coba Lagi</span>
        </button>
        <router-link
          to="/explore"
          class="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-semibold text-white hover:bg-primary-hover transition"
        >
          <span>Jelajahi Katalog Aset</span>
        </router-link>
      </div>
    </div>

    <!-- MAIN STATUS VIEW -->
    <div v-else class="space-y-8">
      <!-- Top Invoice & Status Bar -->
      <div class="overflow-hidden rounded-3xl border border-border bg-elevated/80 p-6 backdrop-blur-md">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs text-text-secondary">Nomor Tagihan:</span>
              <span class="font-mono text-xs font-bold text-text-primary">
                {{ detail.transaction.invoiceNumber }}
              </span>
              <span>•</span>
              <span class="text-[11px] text-text-secondary">
                {{ new Date(detail.transaction.createdAt).toLocaleDateString('id-ID', { dateStyle: 'long' }) }}
              </span>
            </div>

            <h1 class="font-heading text-3xl sm:text-4xl font-bold text-text-primary">
              Status Tagihan Pembayaran
            </h1>
          </div>

          <!-- Status Badge & Refresh -->
          <div class="flex items-center gap-3">
            <!-- PENDING BADGE -->
            <span
              v-if="detail.transaction.status === 'pending'"
              class="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-bold text-amber-400"
            >
              <Clock class="h-3.5 w-3.5" />
              <span>Menunggu Pembayaran</span>
            </span>

            <!-- PROCESSING BADGE -->
            <span
              v-else-if="detail.transaction.status === 'processing'"
              class="inline-flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/10 px-4 py-1.5 text-xs font-bold text-secondary"
            >
              <FileCheck class="h-3.5 w-3.5" />
              <span>Menunggu Verifikasi Admin</span>
            </span>

            <!-- PAID BADGE -->
            <span
              v-else-if="detail.transaction.status === 'paid'"
              class="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-4 py-1.5 text-xs font-bold text-success"
            >
              <CheckCircle2 class="h-3.5 w-3.5" />
              <span>Pembayaran Berhasil</span>
            </span>

            <!-- REJECTED BADGE -->
            <span
              v-else-if="detail.paymentConfirmation?.status === 'rejected'"
              class="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-1.5 text-xs font-bold text-red-400"
            >
              <AlertCircle class="h-3.5 w-3.5" />
              <span>Bukti Ditolak</span>
            </span>

            <!-- Manual Refresh Button -->
            <button
              class="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-text-secondary hover:text-text-primary hover:border-border-hover transition"
              title="Perbarui status"
              @click="refreshStatus"
            >
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isRefreshing }" />
            </button>
          </div>
        </div>

        <!-- Progress Flow Stepper -->
        <div class="mt-8 border-t border-border pt-6">
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <!-- Step 1: Order Created -->
            <div class="flex items-center gap-3">
              <div class="flex h-8 w-8 items-center justify-center rounded-full bg-success text-white font-bold">
                ✓
              </div>
              <div>
                <p class="font-bold text-text-primary">1. Tagihan Dibuat</p>
                <p class="text-[10px] text-text-secondary">Selesai</p>
              </div>
            </div>

            <!-- Step 2: Transfer -->
            <div class="flex items-center gap-3">
              <div
                class="flex h-8 w-8 items-center justify-center rounded-full font-bold"
                :class="
                  detail.transaction.status !== 'pending'
                    ? 'bg-success text-white'
                    : 'bg-primary text-white animate-pulse ring-4 ring-primary/20'
                "
              >
                {{ detail.transaction.status !== 'pending' ? '✓' : '2' }}
              </div>
              <div>
                <p class="font-bold text-text-primary">2. Transfer Bank</p>
                <p class="text-[10px] text-text-secondary">
                  {{ detail.transaction.status === 'pending' ? 'Menunggu Transfer' : 'Sudah Transfer' }}
                </p>
              </div>
            </div>

            <!-- Step 3: Admin Verification -->
            <div class="flex items-center gap-3">
              <div
                class="flex h-8 w-8 items-center justify-center rounded-full font-bold"
                :class="
                  detail.transaction.status === 'paid'
                    ? 'bg-success text-white'
                    : detail.transaction.status === 'processing'
                    ? 'bg-secondary text-background font-bold animate-pulse'
                    : 'bg-elevated border border-border text-text-secondary'
                "
              >
                {{ detail.transaction.status === 'paid' ? '✓' : '3' }}
              </div>
              <div>
                <p class="font-bold text-text-primary">3. Verifikasi Admin</p>
                <p class="text-[10px] text-text-secondary">
                  {{ detail.transaction.status === 'paid' ? 'Terverifikasi' : 'Pengecekan Resi' }}
                </p>
              </div>
            </div>

            <!-- Step 4: Asset Unlocked -->
            <div class="flex items-center gap-3">
              <div
                class="flex h-8 w-8 items-center justify-center rounded-full font-bold"
                :class="
                  detail.transaction.status === 'paid'
                    ? 'bg-success text-white'
                    : 'bg-elevated border border-border text-text-secondary'
                "
              >
                {{ detail.transaction.status === 'paid' ? '✓' : '4' }}
              </div>
              <div>
                <p class="font-bold text-text-primary">4. Aset Terbuka</p>
                <p class="text-[10px] text-text-secondary">
                  {{ detail.transaction.status === 'paid' ? 'Siap Diunduh' : 'Terkunci' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- STATE 1: PAID (SUCCESS CELEBRATION & DOWNLOAD ACCESS) -->
      <div
        v-if="detail.transaction.status === 'paid'"
        class="rounded-3xl border border-success/30 bg-success/10 p-8 space-y-6"
      >
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-start gap-4">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-success text-white">
              <CheckCircle2 class="h-7 w-7" />
            </div>
            <div>
              <h2 class="font-heading text-2xl font-bold text-text-primary">
                Pembayaran Anda Telah Berhasil Diverifikasi!
              </h2>
              <p class="text-xs text-text-secondary mt-1">
                Aset digital telah ditambahkan ke koleksi Anda dan bagi hasil 60% telah disalurkan kepada kreator.
              </p>
            </div>
          </div>

          <!-- Go to My Purchases Button -->
          <router-link
            to="/purchases"
            class="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-xs font-semibold text-white shadow-xl shadow-primary/20 hover:bg-primary-hover transition shrink-0"
          >
            <FolderOpen class="h-4 w-4" />
            <span>Koleksi Aset Saya</span>
          </router-link>
        </div>
      </div>

      <!-- STATE 2: PROCESSING (CONFIRMATION UNDER REVIEW) -->
      <div
        v-else-if="detail.transaction.status === 'processing'"
        class="rounded-3xl border border-secondary/30 bg-secondary/5 p-8 space-y-4"
      >
        <div class="flex items-start gap-4">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
            <Clock class="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h2 class="font-heading text-2xl font-bold text-text-primary">
              Bukti Transfer Diterima — Sedang Diverifikasi Admin
            </h2>
            <p class="text-xs text-text-secondary mt-1 leading-relaxed">
              Admin Asset Market sedang memeriksa bukti transfer Anda. Verifikasi manual biasanya berlangsung dalam waktu <strong>15–60 menit</strong> pada jam kerja operasional.
            </p>
          </div>
        </div>

        <div v-if="detail.paymentConfirmation" class="rounded-2xl border border-border bg-elevated/70 p-4 space-y-3 text-xs">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="text-text-secondary">Ditransfer ke:</span>
              <span class="font-bold text-text-primary ml-1">{{ detail.paymentConfirmation.destinationBank }}</span>
              <span class="text-text-secondary ml-3">Dari:</span>
              <span class="font-bold text-text-primary ml-1">{{ detail.paymentConfirmation.senderAccountName }} ({{ detail.paymentConfirmation.senderBank }})</span>
            </div>

            <button
              v-if="detail.paymentConfirmation.proofImageUrl"
              type="button"
              class="inline-flex items-center gap-1.5 text-secondary hover:text-secondary-hover font-semibold transition cursor-pointer"
              @click="showProofPreview = !showProofPreview"
            >
              <Eye class="h-3.5 w-3.5" />
              <span>{{ showProofPreview ? 'Sembunyikan Bukti' : 'Lihat Bukti yang Dikirim' }}</span>
            </button>
          </div>

          <div v-if="showProofPreview && detail.paymentConfirmation.proofImageUrl" class="mt-3 pt-3 border-t border-border/60">
            <div class="max-w-md rounded-xl overflow-hidden border border-border bg-background/80 p-2">
              <img
                :src="getAssetImageUrl(detail.paymentConfirmation.proofImageUrl)"
                alt="Bukti Transfer"
                class="w-full max-h-72 object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- STATE 3: REJECTED (REJECTION REASON & RE-UPLOAD PROMPT) -->
      <div
        v-else-if="detail.paymentConfirmation?.status === 'rejected'"
        class="rounded-3xl border border-red-500/30 bg-red-500/10 p-8 space-y-4"
      >
        <div class="flex items-start gap-4">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/20 text-red-400">
            <AlertCircle class="h-6 w-6" />
          </div>
          <div class="space-y-2">
            <h2 class="font-heading text-2xl font-bold text-text-primary">
              Bukti Pembayaran Ditolak oleh Admin
            </h2>
            <div class="rounded-xl bg-background/80 border border-red-500/20 p-3 text-xs text-red-300">
              <strong>Alasan Penolakan:</strong>
              {{ detail.paymentConfirmation.rejectionReason || 'Bukti transfer tidak valid atau dana belum masuk rekening.' }}
            </div>
            <p class="text-xs text-text-secondary">
              Jangan khawatir, silakan periksa mutasi rekening Anda dan unggah kembali bukti transfer yang jelas di bawah.
            </p>

            <button
              class="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-white shadow hover:bg-primary-hover transition mt-2"
              @click="showReuploadForm = !showReuploadForm"
            >
              <UploadCloud class="h-4 w-4" />
              <span>Unggah Ulang Bukti Pembayaran</span>
            </button>
          </div>
        </div>
      </div>

      <!-- STATE 4: PENDING (INSTRUCTIONS & BANK DESTINATIONS) -->
      <div
        v-if="detail.transaction.status === 'pending' || showReuploadForm"
        class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
      >
        <!-- Left: Destination Accounts & Form (8 Cols) -->
        <div class="lg:col-span-8 space-y-6">
          <!-- Destination Banks Card -->
          <div class="rounded-3xl border border-border bg-elevated/70 p-6 space-y-5">
            <h3 class="font-heading text-xl font-bold text-text-primary flex items-center gap-2">
              <Building2 class="h-5 w-5 text-secondary" />
              <span>Rekening Resmi Tujuan Transfer</span>
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                v-for="acc in detail.destinationAccounts"
                :key="acc.bank"
                class="rounded-2xl border border-border bg-elevated p-4 flex flex-col justify-between"
              >
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="font-bold text-sm text-text-primary font-mono">{{ acc.bank }}</span>
                    <span class="rounded bg-secondary/15 px-2 py-0.5 text-[9px] font-bold text-secondary">Escrow</span>
                  </div>
                  <div class="font-mono text-base font-bold text-text-primary mb-1">
                    {{ acc.formattedAccountNumber }}
                  </div>
                  <div class="text-[10px] text-text-secondary mb-4 truncate">
                    a.n. {{ acc.accountHolder }}
                  </div>
                </div>

                <button
                  class="flex items-center justify-center gap-1.5 w-full rounded-xl border border-border bg-background py-1.5 text-xs font-semibold text-text-primary hover:border-primary transition"
                  @click="copyText(acc.accountNumber, acc.bank)"
                >
                  <template v-if="copiedBank === acc.bank">
                    <Check class="h-3.5 w-3.5 text-success" />
                    <span class="text-success font-bold">Tersalin</span>
                  </template>
                  <template v-else>
                    <Copy class="h-3.5 w-3.5 text-text-secondary" />
                    <span>Salin Rekening</span>
                  </template>
                </button>
              </div>
            </div>

            <!-- Total Amount Card -->
            <div class="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p class="text-xs text-text-secondary">Jumlah yang Harus Ditransfer (Tepat):</p>
                <div class="font-mono text-2xl font-bold text-primary mt-0.5">
                  {{ formatCurrency(detail.transaction.totalAmount) }}
                </div>
              </div>

              <button
                class="inline-flex items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition"
                @click="copyText(detail.transaction.totalAmount.toString(), 'amount')"
              >
                <template v-if="copiedBank === 'amount'">
                  <Check class="h-3.5 w-3.5 text-success" />
                  <span>Jumlah Tersalin</span>
                </template>
                <template v-else>
                  <Copy class="h-3.5 w-3.5" />
                  <span>Salin Jumlah</span>
                </template>
              </button>
            </div>
          </div>

          <!-- Payment Proof Submission Form -->
          <div class="rounded-3xl border border-border bg-elevated/90 p-6 space-y-6">
            <h3 class="font-heading text-2xl font-bold text-text-primary flex items-center gap-2 border-b border-border pb-4">
              <FileCheck class="h-6 w-6 text-primary" />
              <span>Formulir Konfirmasi Pembayaran</span>
            </h3>

            <div
              v-if="submitError"
              class="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400"
            >
              {{ submitError }}
            </div>

            <form class="space-y-4" @submit.prevent="handleReuploadProof">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-text-secondary mb-1.5">Bank Pengirim</label>
                  <input
                    v-model="senderBank"
                    type="text"
                    required
                    placeholder="Contoh: BCA, Mandiri..."
                    class="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-text-secondary mb-1.5">Bank Tujuan</label>
                  <select
                    v-model="selectedDestinationBank"
                    class="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option v-for="a in detail.destinationAccounts" :key="a.bank" :value="a.bank">
                      {{ a.bank }} — PT ASSET MARKET INDONESIA
                    </option>
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-text-secondary mb-1.5">No. Rekening Pengirim</label>
                  <input
                    v-model="senderAccountNumber"
                    type="text"
                    required
                    placeholder="Nomor rekening pengirim"
                    class="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-text-secondary mb-1.5">Nama Pemilik Rekening</label>
                  <input
                    v-model="senderAccountName"
                    type="text"
                    required
                    placeholder="Nama di rekening Anda"
                    class="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <!-- Upload File -->
              <div>
                <label class="block text-xs font-semibold text-text-secondary mb-1.5">Unggah Foto / Screenshot Resi Transfer</label>
                <div
                  class="relative rounded-2xl border-2 border-dashed border-border p-6 text-center hover:border-primary transition cursor-pointer bg-background/50"
                  @click="($refs.fileInput2 as HTMLInputElement).click()"
                >
                  <input
                    ref="fileInput2"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    class="hidden"
                    @change="handleFileSelect"
                  />

                  <div v-if="proofPreviewUrl" class="space-y-3">
                    <img
                      :src="proofPreviewUrl"
                      alt="Receipt Preview"
                      class="mx-auto max-h-48 rounded-xl object-contain border border-border shadow"
                    />
                    <p class="text-xs text-secondary font-medium">Klik untuk mengganti foto</p>
                  </div>

                  <div v-else class="space-y-2">
                    <UploadCloud class="mx-auto h-8 w-8 text-text-secondary" />
                    <p class="text-xs font-semibold text-text-primary">Pilih berkas bukti transfer</p>
                    <p class="text-[11px] text-text-secondary">JPG, PNG, WEBP (Maksimal 10MB)</p>
                  </div>
                </div>
              </div>

              <!-- Submit Button -->
              <button
                type="submit"
                :disabled="isSubmittingProof"
                class="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-xs font-semibold text-white shadow-xl shadow-primary/25 hover:bg-primary-hover transition disabled:opacity-50"
              >
                <Loader2 v-if="isSubmittingProof" class="h-4 w-4 animate-spin" />
                <template v-else>
                  <span>Kirim Bukti Pembayaran</span>
                  <ArrowRight class="h-4 w-4" />
                </template>
              </button>
            </form>
          </div>
        </div>

        <!-- Right: Ordered Assets Review (4 Cols) -->
        <div class="lg:col-span-4 space-y-4">
          <div class="rounded-3xl border border-border bg-elevated/90 p-6 space-y-4 shadow-xl">
            <h4 class="font-heading text-xl font-bold text-text-primary border-b border-border pb-3">
              Rincian Item ({{ detail.items.length }})
            </h4>

            <div class="space-y-3 max-h-80 overflow-y-auto pr-1">
              <div
                v-for="item in detail.items"
                :key="item.id"
                class="flex items-center gap-3 rounded-2xl border border-border bg-background p-3"
              >
                <img
                  :src="getAssetImageUrl(item.asset.thumbnailUrl)"
                  :alt="item.asset.title"
                  class="h-12 w-12 rounded-xl object-cover border border-border"
                  @error="handleImageFallback($event, item.asset.title, item.asset.assetType)"
                />
                <div class="flex-1 min-w-0">
                  <p class="font-heading text-sm font-bold text-text-primary truncate">
                    {{ item.asset.title }}
                  </p>
                  <p class="text-[11px] text-text-secondary">By {{ item.seller.name }}</p>
                  <p class="font-mono text-xs font-bold text-primary mt-0.5">
                    {{ formatCurrency(item.price) }}
                  </p>
                </div>
              </div>
            </div>

            <div class="border-t border-border pt-4 flex justify-between items-baseline">
              <span class="text-xs text-text-secondary">Total Tagihan</span>
              <span class="font-mono text-xl font-bold text-primary">
                {{ formatCurrency(detail.transaction.totalAmount) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- LIST OF ASSETS IN TRANSACTION (Shown in all states) -->
      <div v-if="detail.transaction.status === 'paid'" class="space-y-4">
        <h3 class="font-heading text-2xl font-bold text-text-primary">
          Aset Digital yang Anda Dapatkan
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="item in detail.items"
            :key="item.id"
            class="rounded-3xl border border-border bg-elevated/80 p-5 flex items-center gap-4 shadow-lg"
          >
            <img
              :src="getAssetImageUrl(item.asset.thumbnailUrl)"
              :alt="item.asset.title"
              class="h-20 w-20 rounded-2xl object-cover border border-border"
              @error="handleImageFallback($event, item.asset.title, item.asset.assetType)"
            />
            <div class="flex-1 min-w-0 space-y-1">
              <span class="rounded bg-secondary/15 px-2 py-0.5 text-[9px] font-bold uppercase text-secondary">
                {{ item.asset.assetType?.replace('_', ' ') }}
              </span>
              <h4 class="font-heading text-lg font-bold text-text-primary truncate">
                {{ item.asset.title }}
              </h4>
              <p class="text-[11px] text-text-secondary">Kreator: {{ item.seller.name }}</p>
              <div class="pt-2">
                <router-link
                  to="/purchases"
                  class="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover transition"
                >
                  <Download class="h-3.5 w-3.5" />
                  <span>Unduh di My Assets</span>
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
