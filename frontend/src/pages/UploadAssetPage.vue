<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { assetService } from '../services/assets';
import { formatCurrency, formatFileSize } from '../utils/formatters';
import { useToast } from '../composables/useToast';
import type { Category, AssetType } from '../types';
import {
  UploadCloud,
  FileArchive,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  X,
  Plus,
  Loader2,
} from 'lucide-vue-next';

const { toast } = useToast();

const categories = ref<Category[]>([]);
const isCategoriesLoading = ref(true);

const form = reactive({
  title: '',
  shortDescription: '',
  description: '',
  categoryId: '',
  assetType: 'ui_template' as AssetType,
  price: 150000,
  discountPrice: null as number | null,
  demoUrl: '',
  tags: ['Vue 3', 'Tailwind', 'SaaS'] as string[],
});

const tagInput = ref('');

// Files state
const thumbnailFile = ref<File | null>(null);
const thumbnailPreview = ref<string | null>(null);
const assetFile = ref<File | null>(null);

// Validation & Error state
const fieldErrors = reactive<Record<string, string>>({});

// Upload progress & states
const isSubmitting = ref(false);
const uploadProgress = ref(0);
const errorMessage = ref<string | null>(null);
const isSuccess = ref(false);
const createdAssetId = ref<string | null>(null);

// 60/40 Creator Share Calculation
const effectivePrice = computed(() => form.discountPrice ?? form.price);
const creatorEarnings = computed(() => Math.round(effectivePrice.value * 0.6));
const platformFee = computed(() => Math.round(effectivePrice.value * 0.4));

const assetTypes: { id: AssetType; label: string }[] = [
  { id: 'ui_template', label: 'UI Template' },
  { id: 'source_code', label: 'Source Code' },
  { id: '3d_model', label: '3D Model' },
  { id: 'graphic', label: 'Graphic / Icons' },
  { id: 'audio', label: 'Audio / SFX' },
  { id: 'video', label: 'Video Asset' },
  { id: 'document', label: 'Documentation' },
  { id: 'other', label: 'Other' },
];

onMounted(async () => {
  try {
    categories.value = await assetService.getCategories();
    if (categories.value.length > 0 && categories.value[0]?.id) {
      form.categoryId = categories.value[0].id;
    }
  } catch (err) {
    console.error('Failed to load categories', err);
  } finally {
    isCategoriesLoading.value = false;
  }
});

const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.bash', '.php', '.phtml', '.py', '.js', '.jar',
  '.vbs', '.msi', '.dll', '.com', '.scr', '.ps1', '.hta', '.wsf',
];

const ALLOWED_THUMBNAIL_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];

function handleThumbnailSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    const fileName = file.name.toLowerCase();
    const ext = fileName.slice(fileName.lastIndexOf('.'));

    if (DANGEROUS_EXTENSIONS.some((bad) => fileName.endsWith(bad))) {
      errorMessage.value = 'File berbahaya ditolak demi keamanan server.';
      fieldErrors.thumbnail = 'Format file berbahaya ditolak.';
      target.value = '';
      return;
    }

    if (!ALLOWED_THUMBNAIL_EXTS.includes(ext) || !file.type.startsWith('image/')) {
      errorMessage.value = 'Cover thumbnail harus berupa gambar (JPG, PNG, WEBP).';
      fieldErrors.thumbnail = 'Format gambar yang diperbolehkan: JPG, PNG, WEBP.';
      target.value = '';
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      errorMessage.value = 'Thumbnail must not exceed 15MB.';
      fieldErrors.thumbnail = 'Ukuran thumbnail maksimal 15MB.';
      target.value = '';
      return;
    }

    thumbnailFile.value = file;
    thumbnailPreview.value = URL.createObjectURL(file);
    errorMessage.value = null;
    delete fieldErrors.thumbnail;
  }
}

function handleAssetFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    const fileName = file.name.toLowerCase();

    // Dangerous extension check
    if (DANGEROUS_EXTENSIONS.some((bad) => fileName.endsWith(bad))) {
      errorMessage.value = 'Format file berbahaya ditolak demi keamanan sistem.';
      fieldErrors.file = 'Format file berbahaya ditolak oleh sistem pengamanan.';
      target.value = '';
      return;
    }

    // Double extension check (e.g. evil.php.zip)
    const parts = fileName.split('.');
    if (parts.length > 2) {
      for (let i = 1; i < parts.length - 1; i++) {
        if (DANGEROUS_EXTENSIONS.includes(`.${parts[i]}`)) {
          errorMessage.value = 'Double extension terindikasi berisiko.';
          fieldErrors.file = 'File dengan nama berisiko ditolak.';
          target.value = '';
          return;
        }
      }
    }

    if (file.size > 500 * 1024 * 1024) {
      errorMessage.value = 'Main asset file must not exceed 500MB.';
      fieldErrors.file = 'Ukuran berkas utama maksimal 500MB.';
      target.value = '';
      return;
    }

    assetFile.value = file;
    errorMessage.value = null;
    delete fieldErrors.file;
  }
}

function addTag() {
  const t = tagInput.value.trim();
  if (t && !form.tags.includes(t)) {
    form.tags.push(t);
    tagInput.value = '';
  }
}

function removeTag(index: number) {
  form.tags.splice(index, 1);
}

const isFormValid = computed(() => {
  const isTitleOk = form.title.trim().length >= 3;
  const isDescOk = form.description.trim().length >= 10;
  const isCategoryOk = Boolean(form.categoryId);
  const isPriceOk = form.price >= 0;
  const isDiscountOk = form.discountPrice === null || form.discountPrice < form.price;
  const isThumbOk = thumbnailFile.value !== null && !fieldErrors.thumbnail;
  const isFileOk = assetFile.value !== null && !fieldErrors.file;

  return isTitleOk && isDescOk && isCategoryOk && isPriceOk && isDiscountOk && isThumbOk && isFileOk;
});

async function handleSubmit() {
  if (isSubmitting.value) return;

  // Reset previous errors
  Object.keys(fieldErrors).forEach((k) => delete fieldErrors[k]);
  let hasErrors = false;

  if (!form.title.trim() || form.title.trim().length < 3) {
    fieldErrors.title = 'Asset title must be at least 3 characters.';
    hasErrors = true;
  }
  if (!form.description.trim() || form.description.trim().length < 10) {
    fieldErrors.description = 'Asset description must be at least 10 characters.';
    hasErrors = true;
  }
  if (!form.categoryId) {
    fieldErrors.category = 'Please select a valid category.';
    hasErrors = true;
  }
  if (form.price < 0) {
    fieldErrors.price = 'Price must be a non-negative number.';
    hasErrors = true;
  }
  if (form.discountPrice !== null && form.discountPrice >= form.price) {
    fieldErrors.discountPrice = 'Discount price must be lower than base price.';
    hasErrors = true;
  }
  if (!thumbnailFile.value) {
    fieldErrors.thumbnail = 'Please select a cover thumbnail image.';
    hasErrors = true;
  }
  if (!assetFile.value) {
    fieldErrors.file = 'Please select the main digital asset archive (.zip).';
    hasErrors = true;
  }

  if (hasErrors) {
    errorMessage.value = 'Please correct the highlighted fields before submitting.';
    toast.error('Validasi Gagal', 'Harap lengkapi semua kolom yang wajib diisi.');
    return;
  }

  isSubmitting.value = true;
  uploadProgress.value = 0;
  errorMessage.value = null;

  try {
    const data = new FormData();
    data.append('title', form.title.trim());
    data.append('shortDescription', form.shortDescription.trim());
    data.append('description', form.description.trim());
    data.append('categoryId', form.categoryId);
    data.append('assetType', form.assetType);
    data.append('price', String(form.price));
    if (form.discountPrice) {
      data.append('discountPrice', String(form.discountPrice));
    }
    data.append('demoUrl', form.demoUrl.trim());
    data.append('tags', JSON.stringify(form.tags));
    data.append('thumbnail', thumbnailFile.value!);
    data.append('file', assetFile.value!);

    const asset = await assetService.uploadAsset(data, (percent) => {
      uploadProgress.value = percent;
    });

    createdAssetId.value = asset.id;
    isSuccess.value = true;

    toast.success(
      'Aset Berhasil Diunggah!',
      `Aset "${form.title}" telah masuk ke antrean kurasi. Tim kurator akan meninjau kelayakan aset Anda dalam 1x24 jam.`
    );
  } catch (err: any) {
    if (err?.fieldErrors) {
      for (const [key, msgs] of Object.entries(err.fieldErrors)) {
        if (Array.isArray(msgs) && msgs.length > 0) {
          fieldErrors[key] = (msgs as string[])[0];
        }
      }
    }

    const isTimeoutOrNetwork =
      err?.code === 'NETWORK_ERROR' ||
      err?.code === 'TIMEOUT' ||
      err?.message?.toLowerCase().includes('timeout') ||
      err?.message?.toLowerCase().includes('koneksi');

    let errorText = err?.message || 'Failed to upload asset. Please try again.';
    if (isTimeoutOrNetwork) {
      errorText =
        'Koneksi terputus atau batas waktu unggah terlampaui. Berkas dan isian formulir Anda tetap tersimpan dengan aman — silakan coba kembali.';
    }

    errorMessage.value = errorText;
    toast.error('Gagal Mengunggah Aset', errorText);
  } finally {
    isSubmitting.value = false;
  }
}

function resetForm() {
  form.title = '';
  form.shortDescription = '';
  form.description = '';
  form.price = 150000;
  form.discountPrice = null;
  form.demoUrl = '';
  form.tags = ['Vue 3'];
  thumbnailFile.value = null;
  thumbnailPreview.value = null;
  assetFile.value = null;
  isSuccess.value = false;
  uploadProgress.value = 0;
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
    <!-- Success State View -->
    <div
      v-if="isSuccess"
      class="overflow-hidden rounded-3xl border border-success/30 bg-elevated/90 p-8 sm:p-12 text-center shadow-2xl backdrop-blur-xl"
    >
      <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-success/20 text-success mb-6 border border-success/30">
        <CheckCircle2 class="h-10 w-10" />
      </div>

      <span class="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary mb-3">
        Submission Received
      </span>

      <h2 class="font-heading text-4xl sm:text-5xl font-bold text-text-primary">
        Asset Submitted for Review!
      </h2>

      <p class="mt-4 text-sm text-text-secondary max-w-xl mx-auto leading-relaxed">
        Your asset has been securely stored and sent to the administrator moderation queue. You will be notified once reviewed.
      </p>

      <div class="mt-8 flex flex-wrap items-center justify-center gap-4">
        <router-link
          to="/listings"
          class="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-semibold text-white shadow hover:bg-primary-hover transition"
        >
          <span>Manage My Listings</span>
          <ArrowRight class="h-4 w-4" />
        </router-link>

        <button
          class="rounded-xl border border-border bg-elevated px-6 py-2.5 text-xs font-semibold text-text-primary hover:bg-elevated-subtle hover:border-border-hover transition"
          @click="resetForm"
        >
          Upload Another Asset
        </button>
      </div>
    </div>

    <!-- Upload Form View -->
    <div v-else>
      <!-- Page Header -->
      <div class="mb-8">
        <div class="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
          <Sparkles class="h-3.5 w-3.5" />
          <span>Creator Portal</span>
        </div>
        <h1 class="font-heading text-4xl sm:text-5xl font-bold text-text-primary">
          Publish New Digital Asset
        </h1>
        <p class="mt-2 text-xs sm:text-sm text-text-secondary">
          Upload your project, set your pricing, and keep 60% of all gross sales with automatic payout logging.
        </p>
      </div>

      <!-- Error Alert -->
      <div
        v-if="errorMessage"
        class="mb-6 flex items-start gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4 text-xs text-primary"
      >
        <AlertCircle class="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <span class="font-semibold">Upload Error:</span>
          <p class="mt-0.5">{{ errorMessage }}</p>
        </div>
      </div>

      <form class="space-y-8" @submit.prevent="handleSubmit">
        <!-- Section 1: General Details -->
        <div class="rounded-3xl border border-border bg-elevated/70 p-6 sm:p-8 backdrop-blur-sm space-y-5">
          <h2 class="font-heading text-2xl font-bold text-text-primary border-b border-border pb-3">
            General Information
          </h2>

          <!-- Title -->
          <div>
            <label class="block text-xs font-medium text-text-secondary mb-1.5">Asset Title *</label>
            <input
              v-model="form.title"
              type="text"
              required
              placeholder="e.g. Apex SaaS UI Kit & Dashboard Template"
              :class="[
                'w-full rounded-xl border bg-background py-2.5 px-4 text-xs text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 transition',
                fieldErrors.title ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-border focus:border-primary focus:ring-primary'
              ]"
            />
            <p v-if="fieldErrors.title" class="mt-1 text-[11px] text-red-400 font-medium">{{ fieldErrors.title }}</p>
          </div>

          <!-- Type & Category Selection Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1.5">Asset Type *</label>
              <select
                v-model="form.assetType"
                class="w-full rounded-xl border border-border bg-background py-2.5 px-4 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition"
              >
                <option v-for="t in assetTypes" :key="t.id" :value="t.id">
                  {{ t.label }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1.5">Category *</label>
              <select
                v-model="form.categoryId"
                :class="[
                  'w-full rounded-xl border bg-background py-2.5 px-4 text-xs text-text-primary focus:outline-none focus:ring-1 transition',
                  fieldErrors.category ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-border focus:border-primary focus:ring-primary'
                ]"
                :disabled="isCategoriesLoading"
              >
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                  {{ cat.name }}
                </option>
              </select>
              <p v-if="fieldErrors.category" class="mt-1 text-[11px] text-red-400 font-medium">{{ fieldErrors.category }}</p>
            </div>
          </div>

          <!-- Short Description -->
          <div>
            <label class="block text-xs font-medium text-text-secondary mb-1.5">Short Summary</label>
            <input
              v-model="form.shortDescription"
              type="text"
              placeholder="Brief tagline shown on listing cards (max 120 chars)"
              class="w-full rounded-xl border border-border bg-background py-2.5 px-4 text-xs text-text-primary placeholder-text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition"
            />
          </div>

          <!-- Full Description -->
          <div>
            <label class="block text-xs font-medium text-text-secondary mb-1.5">Full Description *</label>
            <textarea
              v-model="form.description"
              rows="5"
              required
              placeholder="Describe your asset features, tech stack, installation steps, and license scope..."
              :class="[
                'w-full rounded-xl border bg-background py-2.5 px-4 text-xs text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 transition',
                fieldErrors.description ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-border focus:border-primary focus:ring-primary'
              ]"
            ></textarea>
            <p v-if="fieldErrors.description" class="mt-1 text-[11px] text-red-400 font-medium">{{ fieldErrors.description }}</p>
          </div>

          <!-- Live Preview Demo URL -->
          <div>
            <label class="block text-xs font-medium text-text-secondary mb-1.5">Live Demo URL (Optional)</label>
            <input
              v-model="form.demoUrl"
              type="url"
              placeholder="https://demo.example.com"
              class="w-full rounded-xl border border-border bg-background py-2.5 px-4 text-xs text-text-primary placeholder-text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition"
            />
          </div>

          <!-- Tags -->
          <div>
            <label class="block text-xs font-medium text-text-secondary mb-1.5">Tags & Keywords</label>
            <div class="flex items-center gap-2 mb-2">
              <input
                v-model="tagInput"
                type="text"
                placeholder="Type tag and press Add"
                class="flex-1 rounded-xl border border-border bg-background py-2 px-3 text-xs text-text-primary placeholder-text-secondary focus:border-primary focus:outline-none"
                @keyup.enter.prevent="addTag"
              />
              <button
                type="button"
                class="rounded-xl border border-border bg-elevated px-3 py-2 text-xs font-medium text-text-primary hover:border-border-hover transition"
                @click="addTag"
              >
                <Plus class="h-3.5 w-3.5" />
              </button>
            </div>

            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="(tag, idx) in form.tags"
                :key="tag"
                class="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] text-text-secondary"
              >
                <span>{{ tag }}</span>
                <button type="button" class="hover:text-primary" @click="removeTag(idx)">
                  <X class="h-3 w-3" />
                </button>
              </span>
            </div>
          </div>
        </div>

        <!-- Section 2: Pricing & 60/40 Split Calculation -->
        <div class="rounded-3xl border border-border bg-elevated/70 p-6 sm:p-8 backdrop-blur-sm space-y-5">
          <div class="flex items-center justify-between border-b border-border pb-3">
            <h2 class="font-heading text-2xl font-bold text-text-primary">
              Pricing & Revenue Split
            </h2>
            <span class="rounded-full bg-secondary/15 px-3 py-0.5 text-xs font-bold text-secondary">
              60% Creator Share
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1.5">Base Price (IDR) *</label>
              <input
                v-model.number="form.price"
                type="number"
                min="0"
                step="5000"
                required
                class="w-full rounded-xl border border-border bg-background py-2.5 px-4 text-xs text-text-primary focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1.5">Discount Price (IDR, Optional)</label>
              <input
                v-model.number="form.discountPrice"
                type="number"
                min="0"
                step="5000"
                placeholder="Leave blank if no promo"
                class="w-full rounded-xl border border-border bg-background py-2.5 px-4 text-xs text-text-primary focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <!-- Revenue Split Breakdown Box -->
          <div class="rounded-2xl border border-secondary/30 bg-secondary/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/20 text-secondary">
                <TrendingUp class="h-5 w-5" />
              </div>
              <div>
                <div class="text-xs font-bold text-text-primary">
                  Estimated Take-Home per Sale (60%)
                </div>
                <div class="text-[11px] text-text-secondary">
                  Platform fee 40% ({{ formatCurrency(platformFee) }}) covers hosting, payment gateway & marketing.
                </div>
              </div>
            </div>

            <div class="text-right">
              <div class="text-lg font-bold text-secondary font-mono">
                {{ formatCurrency(creatorEarnings) }}
              </div>
              <div class="text-[10px] text-text-secondary">Net to your bank</div>
            </div>
          </div>
        </div>

        <!-- Section 3: File Uploads -->
        <div class="rounded-3xl border border-border bg-elevated/70 p-6 sm:p-8 backdrop-blur-sm space-y-6">
          <h2 class="font-heading text-2xl font-bold text-text-primary border-b border-border pb-3">
            Digital Asset Deliverables
          </h2>

          <!-- Thumbnail Dropzone -->
          <div>
            <label class="block text-xs font-medium text-text-secondary mb-2">Cover Thumbnail Image * (Max 10MB)</label>
            <div
              class="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-background/50 p-6 text-center hover:border-primary/50 transition cursor-pointer"
            >
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                class="absolute inset-0 opacity-0 cursor-pointer"
                @change="handleThumbnailSelect"
              />

              <div v-if="thumbnailPreview" class="relative max-h-48 overflow-hidden rounded-xl">
                <img :src="thumbnailPreview" alt="Thumbnail Preview" class="h-44 object-cover rounded-xl" />
                <div class="mt-2 text-xs font-medium text-secondary">Click or drop to replace</div>
              </div>

              <div v-else class="space-y-2">
                <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-elevated text-text-secondary">
                  <ImageIcon class="h-6 w-6 text-primary" />
                </div>
                <div class="text-xs font-semibold text-text-primary">Drop cover thumbnail here or browse</div>
                <p class="text-[11px] text-text-secondary">16:9 ratio recommended (JPEG, PNG, WEBP)</p>
              </div>
            </div>
            <p v-if="thumbnailFile" class="mt-2 text-[11px] text-text-secondary font-mono">
              Selected: {{ thumbnailFile.name }} ({{ formatFileSize(thumbnailFile.size) }})
            </p>
            <p v-if="fieldErrors.thumbnail" class="mt-1 text-[11px] text-red-400 font-medium">{{ fieldErrors.thumbnail }}</p>
          </div>

          <!-- Main Asset Archive Dropzone -->
          <div>
            <label class="block text-xs font-medium text-text-secondary mb-2">Asset Package File * (ZIP/TAR, Max 250MB)</label>
            <div
              class="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-background/50 p-6 text-center hover:border-secondary/50 transition cursor-pointer"
            >
              <input
                type="file"
                accept=".zip, .tar, .gz, .rar"
                class="absolute inset-0 opacity-0 cursor-pointer"
                @change="handleAssetFileSelect"
              />

              <div v-if="assetFile" class="space-y-2">
                <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
                  <FileArchive class="h-6 w-6" />
                </div>
                <div class="text-xs font-bold text-text-primary font-mono">{{ assetFile.name }}</div>
                <div class="text-[11px] text-text-secondary">{{ formatFileSize(assetFile.size) }}</div>
                <div class="text-[11px] text-secondary font-medium">Click to change package file</div>
              </div>

              <div v-else class="space-y-2">
                <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-elevated text-text-secondary">
                  <UploadCloud class="h-6 w-6 text-secondary" />
                </div>
                <div class="text-xs font-semibold text-text-primary">Upload main archive file</div>
                <p class="text-[11px] text-text-secondary">Contain source files, documentation, and assets (.zip)</p>
              </div>
            </div>
            <p v-if="fieldErrors.file" class="mt-1 text-[11px] text-red-400 font-medium">{{ fieldErrors.file }}</p>
          </div>
        </div>

        <!-- Upload Progress Indicator Bar -->
        <div v-if="isSubmitting" class="rounded-2xl border border-border bg-elevated p-4 space-y-2">
          <div class="flex items-center justify-between text-xs font-medium">
            <span class="text-text-primary">Uploading & verifying SHA-256 checksum...</span>
            <span class="font-mono text-primary font-bold">{{ uploadProgress }}%</span>
          </div>
          <div class="h-2 w-full bg-background rounded-full overflow-hidden">
            <div
              class="h-full bg-primary transition-all duration-200"
              :style="{ width: `${uploadProgress}%` }"
            ></div>
          </div>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          id="submit-asset-moderation-btn"
          :disabled="!isFormValid || isSubmitting"
          class="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-white shadow-xl shadow-primary/25 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 transition transform active:scale-[0.99]"
        >
          <Loader2 v-if="isSubmitting" class="h-5 w-5 animate-spin" />
          <UploadCloud v-else class="h-5 w-5" />
          <span>{{ isSubmitting ? `Submitting (${uploadProgress}%)...` : errorMessage ? 'Coba Unggah Lagi' : 'Submit for Admin Moderation' }}</span>
        </button>
      </form>
    </div>
  </div>
</template>
