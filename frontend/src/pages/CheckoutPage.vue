<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCartStore } from '../stores/cart';
import { useAuthStore } from '../stores/auth';
import { assetService } from '../services/assets';
import { transactionService, type CheckoutResponse } from '../services/transactions';
import { formatCurrency } from '../utils/formatters';
import { useToast } from '../composables/useToast';
import type { Asset, DestinationBankAccount } from '../types';
import {
  Building2,
  Copy,
  Check,
  Clock,
  AlertCircle,
  ShieldCheck,
  UploadCloud,
  FileCheck,
  ArrowRight,
  Loader2,
  ExternalLink,
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const { toast } = useToast();
const cartStore = useCartStore();
const authStore = useAuthStore();

const isInitializing = ref(true);
const initError = ref<string | null>(null);

// Order state
const checkoutData = ref<CheckoutResponse | null>(null);
const buyNowAsset = ref<Asset | null>(null);
const selectedBank = ref<string>('BCA');
const copiedBank = ref<string | null>(null);

// Confirmation form state
const isSubmittingProof = ref(false);
const confirmError = ref<string | null>(null);
const confirmSuccess = ref<string | null>(null);

const senderBank = ref('BCA');
const senderAccountNumber = ref('');
const senderAccountName = ref('');
const transferDate = ref(new Date().toISOString().slice(0, 16));
const proofFile = ref<File | null>(null);
const proofPreviewUrl = ref<string | null>(null);

const destinationAccounts = computed<DestinationBankAccount[]>(() => {
  return (
    checkoutData.value?.destinationAccounts || [
      {
        bank: 'BCA',
        bankName: 'Bank Central Asia',
        accountNumber: '8271992011',
        formattedAccountNumber: '8271-9920-11',
        accountHolder: 'PT ASSET MARKET INDONESIA',
        badge: 'Verifikasi Cepat',
        instructions: 'Gunakan fitur Transfer Antar Rekening BCA atau Realtime Online.',
      },
      {
        bank: 'Mandiri',
        bankName: 'Bank Mandiri',
        accountNumber: '1370098213321',
        formattedAccountNumber: '137-00-9821-3321',
        accountHolder: 'PT ASSET MARKET INDONESIA',
        badge: 'BI-FAST Ready',
        instructions: 'Pilih Transfer Antar Rekening Mandiri atau BI-FAST.',
      },
      {
        bank: 'BRI',
        bankName: 'Bank Rakyat Indonesia',
        accountNumber: '034101002931508',
        formattedAccountNumber: '0341-01-002931-50-8',
        accountHolder: 'PT ASSET MARKET INDONESIA',
        badge: 'BRIMO',
        instructions: 'Pilih Transfer Rekening BRI melalui BRIMO atau ATM.',
      },
    ]
  );
});

onMounted(async () => {
  await initializeOrder();
});

async function initializeOrder() {
  isInitializing.value = true;
  initError.value = null;

  try {
    const assetIdParam = route.query.assetId as string | undefined;

    if (assetIdParam) {
      // 1. Direct Buy Now Flow
      buyNowAsset.value = await assetService.getAssetByIdOrSlug(assetIdParam);
      const res = await transactionService.checkout('buy_now', assetIdParam);
      checkoutData.value = res;
    } else {
      // 2. Cart Checkout Flow
      if (cartStore.itemCount === 0) {
        // Try fetching cart from backend
        await cartStore.fetchCart();
      }

      if (cartStore.itemCount === 0) {
        initError.value = 'Your shopping cart is currently empty.';
        return;
      }

      const res = await transactionService.checkout('cart');
      checkoutData.value = res;
      // Empty the local cart store
      cartStore.clearCart();
    }

    // Prefill account name from auth user
    if (authStore.user?.name) {
      senderAccountName.value = authStore.user.name;
    }
  } catch (err: any) {
    console.error('Failed to initialize checkout:', err);
    initError.value = err?.message || 'Failed to initialize invoice. Please try again.';
  } finally {
    isInitializing.value = false;
  }
}

async function copyAccountNumber(accountNumber: string, bank: string) {
  try {
    await navigator.clipboard.writeText(accountNumber);
    copiedBank.value = bank;
    setTimeout(() => {
      copiedBank.value = null;
    }, 2500);
    toast.success('Disalin ke Clipboard', `Nomor rekening ${bank} (${accountNumber}) berhasil disalin.`);
  } catch {
    toast.info('Nomor Rekening', `Nomor rekening: ${accountNumber}`);
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

async function submitConfirmation() {
  if (!checkoutData.value || isSubmittingProof.value) return;

  confirmError.value = null;
  confirmSuccess.value = null;

  if (!senderBank.value || !senderAccountNumber.value || !senderAccountName.value) {
    confirmError.value = 'Harap lengkapi semua informasi rekening pengirim.';
    return;
  }

  if (!proofFile.value) {
    confirmError.value = 'Silakan unggah foto/screenshot bukti transfer.';
    return;
  }

  isSubmittingProof.value = true;

  try {
    const formData = new FormData();
    formData.append('invoiceNumber', checkoutData.value.invoiceNumber);
    formData.append('senderBank', senderBank.value);
    formData.append('senderAccountNumber', senderAccountNumber.value);
    formData.append('senderAccountName', senderAccountName.value);
    formData.append('destinationBank', selectedBank.value);
    formData.append('transferAmount', checkoutData.value.totalAmount.toString());
    formData.append('transferDate', transferDate.value);
    formData.append('proofImage', proofFile.value);

    await transactionService.submitPaymentConfirmation(formData);

    confirmSuccess.value = 'Bukti pembayaran berhasil dikirim!';
    setTimeout(() => {
      router.push(`/transactions/${checkoutData.value?.invoiceNumber}`);
    }, 1500);
  } catch (err: any) {
    console.error('Submission failed:', err);
    confirmError.value = err?.message || 'Gagal mengirim konfirmasi pembayaran. Coba lagi.';
  } finally {
    isSubmittingProof.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <!-- Breadcrumb -->
    <nav class="mb-6 flex items-center gap-2 text-xs text-text-secondary">
      <router-link to="/" class="hover:text-text-primary transition">Home</router-link>
      <span>/</span>
      <router-link to="/cart" class="hover:text-text-primary transition">Cart</router-link>
      <span>/</span>
      <span class="text-text-primary font-medium">Checkout & Manual Transfer</span>
    </nav>

    <!-- LOADING STATE -->
    <div v-if="isInitializing" class="py-24 text-center">
      <div class="inline-flex items-center justify-center p-4 rounded-3xl bg-elevated border border-border text-primary animate-spin mb-4">
        <Loader2 class="h-8 w-8" />
      </div>
      <h2 class="font-heading text-2xl font-bold text-text-primary">
        Generating Secure Transfer Invoice...
      </h2>
      <p class="text-xs text-text-secondary mt-1">
        Calculating 60/40 creator split and escrow parameters.
      </p>
    </div>

    <!-- ERROR INITIALIZING -->
    <div
      v-else-if="initError || !checkoutData"
      class="rounded-3xl border border-primary/30 bg-primary/10 p-12 text-center"
    >
      <AlertCircle class="mx-auto h-12 w-12 text-primary mb-3" />
      <h2 class="font-heading text-2xl font-bold text-text-primary mb-2">
        Checkout Initialization Failed
      </h2>
      <p class="max-w-md mx-auto text-xs text-text-secondary mb-6 leading-relaxed">
        {{ initError || 'Unable to create an invoice for this checkout session.' }}
      </p>
      <div class="flex items-center justify-center gap-3">
        <button
          type="button"
          @click="initializeOrder"
          class="rounded-xl border border-primary/50 bg-primary/20 px-5 py-2.5 text-xs font-semibold text-primary hover:bg-primary/30 transition"
        >
          Coba Lagi
        </button>
        <router-link
          to="/cart"
          class="rounded-xl border border-border bg-elevated px-5 py-2.5 text-xs font-semibold text-text-primary hover:border-border-hover transition"
        >
          Return to Cart
        </router-link>
        <router-link
          to="/explore"
          class="rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-white hover:bg-primary-hover transition"
        >
          Explore Assets
        </router-link>
      </div>
    </div>

    <!-- ACTIVE CHECKOUT VIEW -->
    <div v-else class="space-y-8">
      <!-- Order Banner -->
      <div class="rounded-3xl border border-border bg-elevated/80 p-6 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="rounded bg-secondary/15 border border-secondary/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-secondary">
              Manual Bank Transfer
            </span>
            <span class="text-xs text-text-secondary">Invoice:</span>
            <span class="font-mono text-xs font-bold text-text-primary">{{ checkoutData.invoiceNumber }}</span>
          </div>
          <h1 class="font-heading text-3xl sm:text-4xl font-bold text-text-primary">
            Instruksi Pembayaran Manual
          </h1>
        </div>

        <!-- 24h Countdown Reminder -->
        <div class="flex items-center gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-amber-400 text-xs">
          <Clock class="h-4 w-4 shrink-0" />
          <div>
            <p class="font-bold">Batas Waktu Transfer</p>
            <p class="text-[11px] text-amber-400/80">Selesaikan transfer dalam 24 jam</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <!-- LEFT COLUMN: Transfer Instructions & Bank Accounts (8 Cols) -->
        <div class="lg:col-span-8 space-y-6">
          <!-- Step 1: Destination Bank Selection -->
          <div class="rounded-3xl border border-border bg-elevated/70 p-6 space-y-5">
            <div class="flex items-center justify-between">
              <h3 class="font-heading text-xl font-bold text-text-primary flex items-center gap-2">
                <Building2 class="h-5 w-5 text-secondary" />
                <span>1. Pilih Rekening Bank Tujuan Transfer</span>
              </h3>
              <span class="text-xs text-text-secondary">Rekening Resmi Escrow</span>
            </div>

            <!-- Destination Bank Cards Grid -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                v-for="account in destinationAccounts"
                :key="account.bank"
                class="relative rounded-2xl border p-4 cursor-pointer transition flex flex-col justify-between"
                :class="
                  selectedBank === account.bank
                    ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10 ring-1 ring-primary'
                    : 'border-border bg-elevated hover:border-border-hover'
                "
                @click="selectedBank = account.bank"
              >
                <!-- Badge -->
                <div class="flex items-center justify-between mb-3">
                  <span class="font-bold text-sm text-text-primary font-mono tracking-wider">
                    {{ account.bank }}
                  </span>
                  <span
                    v-if="account.badge"
                    class="rounded-full bg-secondary/15 px-2 py-0.5 text-[9px] font-bold text-secondary"
                  >
                    {{ account.badge }}
                  </span>
                </div>

                <!-- Account Number -->
                <div class="space-y-1 mb-4">
                  <div class="text-[11px] text-text-secondary">Nomor Rekening:</div>
                  <div class="font-mono text-base font-bold text-text-primary tracking-wide">
                    {{ account.formattedAccountNumber }}
                  </div>
                  <div class="text-[10px] text-text-secondary truncate">
                    a.n. {{ account.accountHolder }}
                  </div>
                </div>

                <!-- Copy Button -->
                <button
                  class="flex items-center justify-center gap-1.5 w-full rounded-xl border border-border bg-background py-1.5 text-xs font-semibold text-text-primary hover:border-primary transition"
                  @click.stop="copyAccountNumber(account.accountNumber, account.bank)"
                >
                  <template v-if="copiedBank === account.bank">
                    <Check class="h-3.5 w-3.5 text-success" />
                    <span class="text-success font-bold">Tersalin!</span>
                  </template>
                  <template v-else>
                    <Copy class="h-3.5 w-3.5 text-text-secondary" />
                    <span>Salin No. Rekening</span>
                  </template>
                </button>
              </div>
            </div>

            <!-- Transfer Amount Callout -->
            <div class="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p class="text-xs text-text-secondary">Total yang Harus Ditransfer (Tepat):</p>
                <div class="font-mono text-2xl font-bold text-primary mt-0.5">
                  {{ formatCurrency(checkoutData.totalAmount) }}
                </div>
              </div>

              <button
                class="inline-flex items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition"
                @click="copyAccountNumber(checkoutData.totalAmount.toString(), 'amount')"
              >
                <template v-if="copiedBank === 'amount'">
                  <Check class="h-3.5 w-3.5 text-success" />
                  <span>Jumlah Tersalin</span>
                </template>
                <template v-else>
                  <Copy class="h-3.5 w-3.5" />
                  <span>Salin Jumlah Transfer</span>
                </template>
              </button>
            </div>
          </div>

          <!-- Step 2: Step-by-Step Instructions -->
          <div class="rounded-3xl border border-border bg-elevated/70 p-6 space-y-4">
            <h3 class="font-heading text-xl font-bold text-text-primary">
              2. Panduan Langkah Transfer
            </h3>

            <ol class="space-y-3 text-xs text-text-secondary list-decimal pl-5 leading-relaxed">
              <li>
                Buka aplikasi Mobile Banking pilihan Anda (misalnya <strong>BCA Mobile / myBCA</strong>, <strong>Livin by Mandiri</strong>, atau <strong>BRIMO</strong>) atau gunakan mesin ATM terdekat.
              </li>
              <li>
                Pilih menu <strong>Transfer Antar Rekening</strong> atau <strong>Transfer Antar Bank</strong> (bisa menggunakan metode Realtime Online atau BI-FAST).
              </li>
              <li>
                Masukkan nomor rekening tujuan yang Anda pilih di atas atas nama <strong>PT ASSET MARKET INDONESIA</strong>.
              </li>
              <li>
                Masukkan nominal transfer secara tepat sejumlah <strong class="text-text-primary font-mono">{{ formatCurrency(checkoutData.totalAmount) }}</strong>.
              </li>
              <li>
                Periksa kembali nama penerima dan jumlah transfer, lalu selesaikan transaksi.
              </li>
              <li>
                <strong>Simpan bukti transfer</strong> (berupa screenshot resi atau foto slip transfer) untuk diunggah pada formulir di bawah ini.
              </li>
            </ol>
          </div>

          <!-- Step 3: Payment Confirmation Form -->
          <div
            id="confirmation-form"
            class="rounded-3xl border border-border bg-elevated/90 p-6 shadow-xl backdrop-blur-md space-y-6"
          >
            <div class="flex items-center justify-between border-b border-border pb-4">
              <h3 class="font-heading text-2xl font-bold text-text-primary flex items-center gap-2">
                <FileCheck class="h-6 w-6 text-primary" />
                <span>3. Konfirmasi & Kirim Bukti Transfer</span>
              </h3>
              <span class="text-xs text-text-secondary">Wajib setelah transfer</span>
            </div>

            <!-- Alerts -->
            <div
              v-if="confirmError"
              class="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400 flex items-center gap-2"
            >
              <AlertCircle class="h-4 w-4 shrink-0" />
              <span>{{ confirmError }}</span>
            </div>

            <div
              v-if="confirmSuccess"
              class="rounded-2xl border border-success/30 bg-success/10 p-4 text-xs text-success flex items-center gap-2"
            >
              <Check class="h-4 w-4 shrink-0" />
              <span>{{ confirmSuccess }} Dialihkan ke halaman status...</span>
            </div>

            <!-- Form Fields -->
            <form class="space-y-4" @submit.prevent="submitConfirmation">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <!-- Sender Bank -->
                <div>
                  <label class="block text-xs font-semibold text-text-secondary mb-1.5">
                    Bank Pengirim
                  </label>
                  <input
                    v-model="senderBank"
                    type="text"
                    required
                    placeholder="Contoh: BCA, Mandiri, BNI, Jago..."
                    class="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-text-primary placeholder-text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition"
                  />
                </div>

                <!-- Destination Bank Selected -->
                <div>
                  <label class="block text-xs font-semibold text-text-secondary mb-1.5">
                    Bank Tujuan Transfer
                  </label>
                  <select
                    v-model="selectedBank"
                    class="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition"
                  >
                    <option v-for="acc in destinationAccounts" :key="acc.bank" :value="acc.bank">
                      {{ acc.bank }} — {{ acc.formattedAccountNumber }} (PT ASSET MARKET)
                    </option>
                  </select>
                </div>

                <!-- Sender Account Number -->
                <div>
                  <label class="block text-xs font-semibold text-text-secondary mb-1.5">
                    Nomor Rekening Pengirim
                  </label>
                  <input
                    v-model="senderAccountNumber"
                    type="text"
                    required
                    placeholder="Nomor rekening yang Anda gunakan"
                    class="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-text-primary placeholder-text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition"
                  />
                </div>

                <!-- Sender Account Name -->
                <div>
                  <label class="block text-xs font-semibold text-text-secondary mb-1.5">
                    Nama Pemilik Rekening Pengirim
                  </label>
                  <input
                    v-model="senderAccountName"
                    type="text"
                    required
                    placeholder="Nama lengkap di rekening Anda"
                    class="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-text-primary placeholder-text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition"
                  />
                </div>
              </div>

              <!-- Proof Receipt Image Upload -->
              <div>
                <label class="block text-xs font-semibold text-text-secondary mb-1.5">
                  Unggah Bukti Transfer (Foto / Screenshot Resi)
                </label>

                <div
                  class="relative rounded-2xl border-2 border-dashed border-border p-6 text-center hover:border-primary transition cursor-pointer bg-background/50"
                  @click="($refs.fileInput as HTMLInputElement).click()"
                >
                  <input
                    ref="fileInput"
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
                    <p class="text-xs text-secondary font-medium">
                      {{ proofFile?.name }} (Klik untuk mengganti)
                    </p>
                  </div>

                  <div v-else class="space-y-2">
                    <UploadCloud class="mx-auto h-8 w-8 text-text-secondary" />
                    <p class="text-xs font-semibold text-text-primary">
                      Klik untuk memilih file resi transfer
                    </p>
                    <p class="text-[11px] text-text-secondary">
                      Format didukung: JPG, PNG, WEBP (Maksimal 10MB)
                    </p>
                  </div>
                </div>
              </div>

              <!-- SUBMIT CTA BUTTON with #D93A0F -->
              <button
                type="submit"
                :disabled="isSubmittingProof"
                class="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-xs font-semibold text-white shadow-xl shadow-primary/25 hover:bg-primary-hover transition transform active:scale-[0.98] disabled:opacity-50"
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

        <!-- RIGHT COLUMN: Sticky Order Summary & Direct Status Link (4 Cols) -->
        <aside class="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
          <div class="overflow-hidden rounded-3xl border border-border bg-elevated/90 p-6 shadow-2xl backdrop-blur-xl space-y-6">
            <h3 class="font-heading text-2xl font-bold text-text-primary border-b border-border pb-4">
              Ringkasan Tagihan
            </h3>

            <!-- Price Breakdown -->
            <div class="space-y-3 text-xs">
              <div class="flex justify-between text-text-secondary">
                <span>Nomor Tagihan</span>
                <span class="font-mono text-text-primary font-bold">
                  {{ checkoutData.invoiceNumber }}
                </span>
              </div>

              <div class="flex justify-between text-text-secondary">
                <span>Subtotal Aset</span>
                <span class="font-mono text-text-primary font-medium">
                  {{ formatCurrency(checkoutData.subtotal) }}
                </span>
              </div>

              <div class="flex justify-between text-text-secondary">
                <span>Biaya Platform</span>
                <span class="font-mono text-success font-medium">Rp 0 (Gratis)</span>
              </div>

              <div class="border-t border-border pt-4 flex items-baseline justify-between">
                <span class="text-sm font-bold text-text-primary">Total Transfer</span>
                <span class="font-mono text-2xl font-bold text-primary">
                  {{ formatCurrency(checkoutData.totalAmount) }}
                </span>
              </div>
            </div>

            <!-- Shortcut Button to scroll to confirmation form -->
            <a
              href="#confirmation-form"
              class="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-xs font-semibold text-white shadow-xl shadow-primary/20 hover:bg-primary-hover transition transform active:scale-[0.98]"
            >
              <span>Saya Sudah Transfer</span>
              <ArrowRight class="h-4 w-4" />
            </a>

            <!-- View Transaction Status Page -->
            <router-link
              :to="`/transactions/${checkoutData.invoiceNumber}`"
              class="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-border bg-background py-2.5 text-xs font-semibold text-text-secondary hover:text-text-primary hover:border-border-hover transition"
            >
              <ExternalLink class="h-3.5 w-3.5" />
              <span>Buka Halaman Status Tagihan</span>
            </router-link>

            <!-- 60/40 Guarantee -->
            <div class="rounded-2xl border border-secondary/20 bg-secondary/5 p-4 flex items-start gap-3">
              <ShieldCheck class="h-5 w-5 text-secondary shrink-0 mt-0.5" />
              <div class="text-[11px] text-text-secondary leading-relaxed">
                <strong class="text-text-primary">Bagi Hasil 60/40 Transparan:</strong>
                Dana disimpan secara aman dalam rekening escrow resmi hingga diverifikasi oleh admin.
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>
