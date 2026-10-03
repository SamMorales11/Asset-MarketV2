<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { userService } from '../services/users';
import { useAuthStore } from '../stores/auth';
import type { User } from '../types';
import UserNav from '../components/UserNav.vue';
import {
  User as UserIcon,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Camera,
  Save,
  Loader2,
  X,
  ExternalLink,
  FileText,
} from 'lucide-vue-next';

const authStore = useAuthStore();

const profileData = ref<User | null>(null);
const isLoading = ref(true);
const isSaving = ref(false);
const feedbackMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null);

// Form Fields
const name = ref('');
const bio = ref('');
const phone = ref('');
const avatarUrl = ref('');

// Preset luxury avatars for quick selection
const presetAvatars = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80',
];

onMounted(async () => {
  await loadProfile();
});

async function loadProfile() {
  isLoading.value = true;
  feedbackMessage.value = null;
  try {
    const data = await userService.getProfile();
    profileData.value = data;
    name.value = data.name || '';
    bio.value = data.bio || '';
    phone.value = data.phone || '';
    avatarUrl.value = data.avatarUrl || '';
  } catch (err: any) {
    feedbackMessage.value = {
      type: 'error',
      text: err?.message || 'Gagal memuat profil pengguna.',
    };
  } finally {
    isLoading.value = false;
  }
}

function selectPresetAvatar(url: string) {
  avatarUrl.value = url;
}

async function handleSaveProfile() {
  feedbackMessage.value = null;

  if (!name.value.trim() || name.value.trim().length < 2) {
    feedbackMessage.value = { type: 'error', text: 'Nama lengkap minimal 2 karakter.' };
    return;
  }

  isSaving.value = true;
  try {
    const updated = await userService.updateProfile({
      name: name.value.trim(),
      bio: bio.value.trim() || null,
      phone: phone.value.trim() || null,
      avatarUrl: avatarUrl.value.trim() || null,
    });

    profileData.value = updated;
    authStore.updateUser({
      name: updated.name,
      bio: updated.bio,
      phone: updated.phone,
      avatarUrl: updated.avatarUrl,
    });

    feedbackMessage.value = {
      type: 'success',
      text: 'Profil akun Anda berhasil diperbarui.',
    };
  } catch (err: any) {
    feedbackMessage.value = {
      type: 'error',
      text: err?.message || 'Gagal menyimpan perubahan profil.',
    };
  } finally {
    isSaving.value = false;
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
      <span class="text-text-primary font-medium">Edit Profile</span>
    </nav>

    <!-- User Nav Sub-Header -->
    <UserNav />

    <!-- Page Header -->
    <div class="mb-8 border-b border-border pb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
          <UserIcon class="h-4 w-4" />
          <span>Personal & Creator Identity</span>
        </div>
        <h1 class="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-text-primary">
          Pengaturan Profil Akun
        </h1>
        <p class="text-xs text-text-secondary mt-1 max-w-2xl leading-relaxed">
          Kelola nama tampilan, bio kreator, foto profil, dan informasi kontak publik Anda.
        </p>
      </div>

      <!-- Quick Status -->
      <div v-if="profileData">
        <span
          class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
          :class="
            profileData.isVerifiedSeller
              ? 'bg-secondary/15 text-secondary border border-secondary/30'
              : 'bg-elevated-subtle text-text-secondary border border-border'
          "
        >
          <CheckCircle2 v-if="profileData.isVerifiedSeller" class="h-3.5 w-3.5" />
          <span>{{ profileData.isVerifiedSeller ? 'Verified Creator' : 'Standard Member' }}</span>
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
      <p class="text-xs text-text-secondary">Memuat profil akun...</p>
    </div>

    <!-- MAIN PROFILE GRID (F-PATTERN) -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <!-- LEFT COLUMN: 8 COLS (PROFILE FORM) -->
      <div class="lg:col-span-8 rounded-3xl border border-border bg-elevated/80 p-6 sm:p-8 backdrop-blur-md shadow-2xl space-y-6">
        <div class="border-b border-border pb-4">
          <h2 class="font-heading text-2xl font-bold text-text-primary">
            Biodata & Identitas Kreator
          </h2>
          <p class="text-xs text-text-secondary mt-1">
            Informasi profil ini akan ditampilkan pada halaman aset digital yang Anda jual di katalog.
          </p>
        </div>

        <form class="space-y-6" @submit.prevent="handleSaveProfile">
          <!-- 1. Avatar Section -->
          <div class="space-y-3">
            <label class="block text-xs font-semibold text-text-primary">
              Foto Profil / Avatar
            </label>
            <div class="flex flex-wrap items-center gap-5">
              <!-- Live Avatar Preview -->
              <div class="relative h-20 w-20 shrink-0 rounded-3xl bg-elevated border-2 border-primary/40 overflow-hidden shadow-xl flex items-center justify-center text-3xl font-bold text-primary font-heading">
                <img
                  v-if="avatarUrl"
                  :src="avatarUrl"
                  alt="Avatar Preview"
                  class="h-full w-full object-cover"
                />
                <span v-else>{{ name.charAt(0).toUpperCase() || 'U' }}</span>
              </div>

              <!-- Avatar URL Input & Preset Selector -->
              <div class="flex-1 min-w-[240px] space-y-2">
                <div class="relative">
                  <input
                    v-model="avatarUrl"
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    class="w-full rounded-xl border border-border bg-background px-4 py-2 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <Camera class="absolute right-3 top-2.5 h-4 w-4 text-text-secondary" />
                </div>

                <!-- Presets -->
                <div class="flex items-center gap-2 pt-1">
                  <span class="text-[10px] text-text-secondary">Pilihan Cepat:</span>
                  <div class="flex items-center gap-1.5">
                    <button
                      v-for="(preset, index) in presetAvatars"
                      :key="index"
                      type="button"
                      class="h-6 w-6 rounded-full border border-border overflow-hidden hover:scale-110 transition shrink-0"
                      @click="selectPresetAvatar(preset)"
                    >
                      <img :src="preset" class="h-full w-full object-cover" alt="preset" />
                    </button>
                    <button
                      v-if="avatarUrl"
                      type="button"
                      class="text-[10px] text-red-400 hover:underline ml-1"
                      @click="avatarUrl = ''"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. Full Name -->
          <div class="space-y-2">
            <label class="block text-xs font-semibold text-text-primary">
              Nama Lengkap / Studio Kreator <span class="text-primary">*</span>
            </label>
            <div class="relative">
              <input
                v-model="name"
                type="text"
                placeholder="Contoh: Alex Rivers Studio"
                class="w-full rounded-xl border border-border bg-background px-4 py-2.5 pl-10 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
              <UserIcon class="absolute left-3 top-3 h-4 w-4 text-text-secondary" />
            </div>
          </div>

          <!-- 3. Email (Read-only) -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-semibold text-text-primary">
                Alamat Email Terdaftar
              </label>
              <span class="inline-flex items-center gap-1 text-[10px] text-success font-semibold">
                <CheckCircle2 class="h-3 w-3" />
                <span>Terverifikasi</span>
              </span>
            </div>
            <div class="relative">
              <input
                :value="profileData?.email"
                type="email"
                disabled
                class="w-full rounded-xl border border-border bg-background/50 px-4 py-2.5 pl-10 text-xs font-mono text-text-secondary cursor-not-allowed"
              />
              <Mail class="absolute left-3 top-3 h-4 w-4 text-text-secondary" />
            </div>
            <p class="text-[10px] text-text-secondary">Email akun digunakan untuk konfirmasi pembelian dan invoice.</p>
          </div>

          <!-- 4. Phone Number -->
          <div class="space-y-2">
            <label class="block text-xs font-semibold text-text-primary">
              Nomor WhatsApp / Telepon
            </label>
            <div class="relative">
              <input
                v-model="phone"
                type="tel"
                placeholder="Contoh: 081234567890"
                class="w-full rounded-xl border border-border bg-background px-4 py-2.5 pl-10 text-xs font-mono text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Phone class="absolute left-3 top-3 h-4 w-4 text-text-secondary" />
            </div>
            <p class="text-[10px] text-text-secondary">Digunakan oleh admin untuk konfirmasi penarikan dana mendesak.</p>
          </div>

          <!-- 5. Bio / Creator Statement -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-semibold text-text-primary">
                Bio / Ringkasan Profil Kreator
              </label>
              <span class="text-[10px] font-mono text-text-secondary">
                {{ bio.length }} / 500
              </span>
            </div>
            <div class="relative">
              <textarea
                v-model="bio"
                rows="4"
                maxlength="500"
                placeholder="Ceritakan tentang keahlian desain, rekayasa software, atau pengalaman 3D modeling Anda..."
                class="w-full rounded-xl border border-border bg-background p-3 pl-9 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
              <FileText class="absolute left-3 top-3 h-4 w-4 text-text-secondary" />
            </div>
          </div>

          <!-- Submit CTA -->
          <div class="pt-4 border-t border-border flex items-center justify-end">
            <button
              type="submit"
              :disabled="isSaving"
              class="inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-3 text-xs font-semibold text-white shadow-xl shadow-primary/20 hover:bg-primary-hover transition disabled:opacity-50"
            >
              <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
              <Save v-else class="h-4 w-4" />
              <span>{{ isSaving ? 'Menyimpan...' : 'Simpan Perubahan Profil' }}</span>
            </button>
          </div>
        </form>
      </div>

      <!-- RIGHT COLUMN: 4 COLS (STATUS & QUICK SHORTCUTS) -->
      <div class="lg:col-span-4 space-y-6">
        <!-- 1. ACCOUNT VERIFICATION CARD -->
        <div class="rounded-3xl border border-border bg-elevated/80 p-6 backdrop-blur-md shadow-xl space-y-4 text-xs">
          <div class="flex items-center gap-2 border-b border-border pb-3 text-text-primary font-bold">
            <ShieldCheck class="h-4 w-4 text-secondary" />
            <h3 class="font-heading text-lg">Status & Tingkat Akun</h3>
          </div>

          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-text-secondary">Peran Akses:</span>
              <span class="font-bold text-text-primary uppercase font-mono">{{ profileData?.role }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-text-secondary">Status Kreator:</span>
              <span class="font-bold text-secondary">
                {{ profileData?.isVerifiedSeller ? 'Penjual Terverifikasi (60%)' : 'Pembeli Standar' }}
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-text-secondary">Bergabung Sejak:</span>
              <span class="font-mono text-text-primary">
                {{ profileData ? new Date(profileData.createdAt).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '—' }}
              </span>
            </div>
          </div>

          <p class="text-[11px] text-text-secondary pt-2 border-t border-border leading-relaxed">
            Sebagai penjual terverifikasi, setiap produk digital yang disetujui akan dipublikasikan ke marketplace dengan bagi hasil 60% langsung ke buku besar Anda.
          </p>
        </div>

        <!-- 2. QUICK SETTINGS CARDS -->
        <div class="rounded-3xl border border-border bg-elevated/60 p-5 space-y-3">
          <h4 class="text-xs font-bold text-text-secondary uppercase tracking-wider">
            Pengaturan Terkait
          </h4>

          <router-link
            to="/settings/payment"
            class="flex items-center justify-between rounded-xl bg-background border border-border p-3 text-xs text-text-primary hover:border-secondary transition shadow-sm"
          >
            <div>
              <p class="font-bold">Rekening Bank Payout</p>
              <p class="text-[10px] text-text-secondary">Kelola rekening tujuan penarikan 60%</p>
            </div>
            <ExternalLink class="h-4 w-4 text-secondary" />
          </router-link>

          <router-link
            to="/revenue"
            class="flex items-center justify-between rounded-xl bg-background border border-border p-3 text-xs text-text-primary hover:border-primary transition shadow-sm"
          >
            <div>
              <p class="font-bold">Buku Besar Revenue</p>
              <p class="text-[10px] text-text-secondary">Cek saldo dan mutasi dana</p>
            </div>
            <ExternalLink class="h-4 w-4 text-primary" />
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>
