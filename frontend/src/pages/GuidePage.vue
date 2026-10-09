<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import {
  BookOpen,
  UserPlus,
  LogIn,
  UploadCloud,
  Edit3,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
  Lock,
  ChevronDown,
} from 'lucide-vue-next';

const route = useRoute();

type GuideTab = 'registrasi' | 'login' | 'jual' | 'kelola';
const activeTab = ref<GuideTab>((route.query.tab as GuideTab) || 'registrasi');

const guideTabs = [
  {
    id: 'registrasi' as GuideTab,
    title: 'Registrasi Akun',
    icon: UserPlus,
  },
  {
    id: 'login' as GuideTab,
    title: 'Login & Keamanan',
    icon: LogIn,
  },
  {
    id: 'jual' as GuideTab,
    title: 'Jual & Upload Aset',
    icon: UploadCloud,
  },
  {
    id: 'kelola' as GuideTab,
    title: 'Kelola & Cairkan',
    icon: Edit3,
  },
];

const openFaqIndex = ref<number | null>(0);
function toggleFaq(index: number) {
  openFaqIndex.value = openFaqIndex.value === index ? null : index;
}

const faqs = [
  {
    q: 'Berapa lama proses persetujuan aset oleh Admin?',
    a: 'Maksimal 1×24 jam kerja. Admin memverifikasi kelengkapan file (.zip), keamanan konten, dan kesesuaian thumbnail dengan produk.',
  },
  {
    q: 'Bagaimana skema bagi hasil 60% bekerja?',
    a: '60% langsung masuk saldo kreator saat transaksi berstatus Paid. Contoh: jual Rp350.000 → saldo bertambah Rp210.000 secara otomatis.',
  },
  {
    q: 'Bagaimana proses pembayaran manual?',
    a: 'Pembeli transfer ke rekening resmi platform (BCA/Mandiri/BNI/BRI), lalu upload bukti. Admin verifikasi dana masuk, lalu aset bisa diunduh.',
  },
  {
    q: 'Bisakah saya edit aset yang sudah Approved?',
    a: 'Ya. Judul, deskripsi, harga, demo URL, dan tag bisa diubah kapan saja dari halaman My Listings. Update file .zip akan memicu re-verifikasi singkat.',
  },
  {
    q: 'Kapan bisa tarik saldo pendapatan?',
    a: 'Kapan saja jika saldo sudah mencapai minimum Rp50.000 dan data rekening bank sudah terisi di Payment Settings.',
  },
];
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
    <!-- Breadcrumb -->
    <nav class="mb-6 flex items-center gap-2 text-xs text-text-secondary">
      <router-link to="/" class="hover:text-text-primary transition-colors">Home</router-link>
      <span>/</span>
      <span class="text-text-primary font-medium">Panduan</span>
    </nav>

    <!-- Page Header -->
    <div class="mb-10 border-b border-border pb-8">
      <div class="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
        <BookOpen class="h-3.5 w-3.5" />
        <span>Pusat Panduan Resmi</span>
      </div>
      <h1 class="font-heading text-4xl sm:text-5xl font-bold tracking-tight text-text-primary max-w-3xl leading-[1.1]">
        Panduan <span class="italic text-primary">Pengguna & Kreator</span>
      </h1>
      <p class="mt-2 text-sm text-text-secondary max-w-xl leading-relaxed">
        Dari mendaftar, mengunggah aset digital, hingga mencairkan pendapatan 60% bagi hasil.
      </p>
    </div>

    <!-- Two-column layout -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

      <!-- SIDEBAR -->
      <aside class="lg:col-span-4 lg:sticky lg:top-24 space-y-3">
        <h2 class="text-[10px] font-bold uppercase tracking-widest text-text-secondary px-1">
          Daftar Topik
        </h2>

        <div class="space-y-1.5">
          <button
            v-for="tab in guideTabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'w-full text-left p-3.5 rounded-xl border transition-all duration-150 flex items-center gap-3 cursor-pointer',
              activeTab === tab.id
                ? 'bg-elevated border-primary text-text-primary shadow-sm shadow-primary/10 ring-1 ring-primary/30'
                : 'bg-elevated/40 border-border text-text-secondary hover:bg-elevated hover:text-text-primary'
            ]"
          >
            <div
              :class="[
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-150',
                activeTab === tab.id
                  ? 'bg-primary text-white'
                  : 'bg-surface border border-border text-text-secondary'
              ]"
            >
              <component :is="tab.icon" class="h-4 w-4" />
            </div>
            <span class="text-xs font-semibold">{{ tab.title }}</span>
          </button>
        </div>

        <!-- Revenue reminder card -->
        <div class="mt-4 rounded-xl border border-secondary/30 bg-secondary/10 p-4 space-y-2">
          <p class="text-xs font-bold text-secondary">Skema Bagi Hasil</p>
          <div class="flex items-center gap-3">
            <span class="font-heading text-2xl font-bold text-secondary">60%</span>
            <span class="text-[11px] text-text-secondary leading-snug">untuk kreator,<br>tanpa potongan tersembunyi</span>
          </div>
          <router-link
            to="/upload"
            class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-secondary hover:underline"
          >
            Mulai Jual Aset
            <ArrowRight class="h-3 w-3" />
          </router-link>
        </div>
      </aside>

      <!-- MAIN CONTENT -->
      <main class="lg:col-span-8 space-y-6">

        <!-- ===================== TOPIC 1: REGISTRASI ===================== -->
        <section v-if="activeTab === 'registrasi'" class="space-y-4">
          <div class="rounded-2xl border border-border bg-elevated/50 p-6 sm:p-7 backdrop-blur-sm">
            <h2 class="font-heading text-2xl font-bold text-text-primary mb-5">
              Registrasi Akun Baru
            </h2>

            <!-- Summary callout -->
            <div class="mb-6 rounded-xl border border-border/70 bg-surface/60 p-4 text-xs text-text-secondary leading-relaxed">
              Satu akun untuk menjelajah katalog, membeli, dan menjual aset digital — tanpa akun terpisah.
            </div>

            <!-- Steps -->
            <div class="space-y-5">
              <div class="flex items-start gap-3.5">
                <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-[11px] font-bold text-white">
                  1
                </div>
                <div>
                  <h3 class="text-xs font-bold text-text-primary mb-0.5">Buka Halaman Registrasi</h3>
                  <p class="text-xs text-text-secondary leading-relaxed">
                    Klik <strong>"Sign In"</strong> di navbar, pilih <strong>"Create an Account"</strong>, atau langsung ke
                    <router-link to="/register" class="text-primary font-semibold hover:underline">/register</router-link>.
                  </p>
                </div>
              </div>

              <div class="flex items-start gap-3.5">
                <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-[11px] font-bold text-white">
                  2
                </div>
                <div>
                  <h3 class="text-xs font-bold text-text-primary mb-0.5">Lengkapi Formulir</h3>
                  <ul class="mt-1.5 space-y-1 text-xs text-text-secondary list-disc list-inside pl-1">
                    <li><strong class="text-text-primary">Nama Lengkap</strong> — nama publik di marketplace</li>
                    <li><strong class="text-text-primary">Email Aktif</strong> — untuk verifikasi & notifikasi transaksi</li>
                    <li><strong class="text-text-primary">Kata Sandi</strong> — minimal 8 karakter huruf & angka</li>
                    <li><strong class="text-text-primary">No. WhatsApp</strong> <span class="text-text-secondary/60">(opsional)</span> — untuk koordinasi pencairan</li>
                  </ul>
                </div>
              </div>

              <div class="flex items-start gap-3.5">
                <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-[11px] font-bold text-white">
                  3
                </div>
                <div>
                  <h3 class="text-xs font-bold text-text-primary mb-0.5">Konfirmasi & Mulai</h3>
                  <p class="text-xs text-text-secondary leading-relaxed">
                    Klik <strong>"Buat Akun Sekarang"</strong> — login langsung aktif. Anda bisa langsung menjelajah katalog atau ke Dashboard.
                  </p>
                </div>
              </div>
            </div>

            <!-- CTA -->
            <div class="mt-7 flex items-center justify-between gap-4 rounded-xl border border-primary/25 bg-primary/8 p-4">
              <p class="text-xs text-text-secondary">
                Belum punya akun? <strong class="text-text-primary">Daftar dalam &lt;1 menit.</strong>
              </p>
              <router-link
                to="/register"
                class="shrink-0 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-hover transition-colors"
              >
                Daftar Gratis
                <ArrowRight class="h-3.5 w-3.5" />
              </router-link>
            </div>
          </div>
        </section>

        <!-- ===================== TOPIC 2: LOGIN & KEAMANAN ===================== -->
        <section v-if="activeTab === 'login'" class="space-y-4">
          <div class="rounded-2xl border border-border bg-elevated/50 p-6 sm:p-7 backdrop-blur-sm">
            <h2 class="font-heading text-2xl font-bold text-text-primary mb-5">
              Login & Keamanan Akun
            </h2>

            <div class="mb-6 rounded-xl border border-border/70 bg-surface/60 p-4 text-xs text-text-secondary leading-relaxed">
              Autentikasi terenkripsi JWT dengan refresh token HttpOnly — anti-pembajakan & XSS.
            </div>

            <div class="space-y-5">
              <div class="flex items-start gap-3.5">
                <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-[11px] font-bold text-background">
                  1
                </div>
                <div>
                  <h3 class="text-xs font-bold text-text-primary mb-0.5">Masuk ke /login</h3>
                  <p class="text-xs text-text-secondary leading-relaxed">
                    Kunjungi <router-link to="/login" class="text-secondary font-semibold hover:underline">/login</router-link>,
                    masukkan email dan kata sandi terdaftar.
                  </p>
                </div>
              </div>

              <div class="flex items-start gap-3.5">
                <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-[11px] font-bold text-background">
                  2
                </div>
                <div>
                  <h3 class="text-xs font-bold text-text-primary mb-0.5">Validasi JWT & HttpOnly Cookie</h3>
                  <p class="text-xs text-text-secondary leading-relaxed">
                    Sistem memvalidasi kredensial dan menerbitkan Access Token (JWT) + Refresh Token HttpOnly yang tidak bisa dibaca pihak ketiga.
                  </p>
                </div>
              </div>

              <div class="flex items-start gap-3.5">
                <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-[11px] font-bold text-background">
                  3
                </div>
                <div>
                  <h3 class="text-xs font-bold text-text-primary mb-0.5">Akses Dashboard (RBAC)</h3>
                  <p class="text-xs text-text-secondary leading-relaxed">
                    Login berhasil → akses penuh ke Dashboard, Keranjang, Riwayat Transaksi. Admin/Superadmin mendapat panel kendali tambahan.
                  </p>
                </div>
              </div>
            </div>

            <!-- Security tips -->
            <div class="mt-7 rounded-xl border border-border bg-surface p-4 space-y-2">
              <div class="flex items-center gap-2 text-xs font-bold text-text-primary mb-1">
                <Lock class="h-3.5 w-3.5 text-secondary" />
                Tips Keamanan
              </div>
              <ul class="space-y-1.5 text-xs text-text-secondary">
                <li class="flex items-start gap-2">
                  <CheckCircle2 class="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                  Jangan pernah bagikan kata sandi, termasuk ke staf Asset Market.
                </li>
                <li class="flex items-start gap-2">
                  <CheckCircle2 class="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                  Gunakan kata sandi unik, berbeda dari akun email Anda.
                </li>
                <li class="flex items-start gap-2">
                  <CheckCircle2 class="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                  Selalu Sign Out di perangkat umum atau bersama.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <!-- ===================== TOPIC 3: JUAL & UPLOAD ===================== -->
        <section v-if="activeTab === 'jual'" class="space-y-4">
          <div class="rounded-2xl border border-border bg-elevated/50 p-6 sm:p-7 backdrop-blur-sm">
            <h2 class="font-heading text-2xl font-bold text-text-primary mb-5">
              Jual & Upload Aset Digital
            </h2>

            <div class="mb-6 rounded-xl border border-success/30 bg-success/10 p-4">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold uppercase tracking-wider text-success">Skema 60/40</span>
                <span class="font-mono text-[10px] text-success">Otomatis saat transaksi Paid</span>
              </div>
              <div class="grid grid-cols-2 gap-3 mt-3">
                <div class="rounded-lg bg-surface/70 p-3">
                  <p class="text-[10px] text-text-secondary mb-0.5">Kreator</p>
                  <p class="font-heading text-xl font-bold text-success">60%</p>
                </div>
                <div class="rounded-lg bg-surface/70 p-3">
                  <p class="text-[10px] text-text-secondary mb-0.5">Platform</p>
                  <p class="font-heading text-xl font-bold text-text-primary">40%</p>
                </div>
              </div>
            </div>

            <div class="space-y-5">
              <div class="flex items-start gap-3.5">
                <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success font-mono text-[11px] font-bold text-background">
                  1
                </div>
                <div>
                  <h3 class="text-xs font-bold text-text-primary mb-0.5">Siapkan Berkas</h3>
                  <ul class="mt-1.5 space-y-1 text-xs text-text-secondary list-disc list-inside pl-1">
                    <li><strong class="text-text-primary">Arsip (.zip/.rar/.7z)</strong> — maks 500 MB</li>
                    <li><strong class="text-text-primary">Thumbnail</strong> — rasio 16:9 atau 3:2, maks 5 MB</li>
                    <li><strong class="text-text-primary">Preview</strong> — hingga 5 screenshot tambahan</li>
                  </ul>
                </div>
              </div>

              <div class="flex items-start gap-3.5">
                <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success font-mono text-[11px] font-bold text-background">
                  2
                </div>
                <div>
                  <h3 class="text-xs font-bold text-text-primary mb-0.5">Isi Form Upload</h3>
                  <p class="text-xs text-text-secondary leading-relaxed">
                    Buka <router-link to="/upload" class="text-success font-semibold hover:underline">/upload</router-link> —
                    pilih kategori, isi judul, deskripsi, tag, dan harga dalam Rupiah (IDR).
                  </p>
                </div>
              </div>

              <div class="flex items-start gap-3.5">
                <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success font-mono text-[11px] font-bold text-background">
                  3
                </div>
                <div>
                  <h3 class="text-xs font-bold text-text-primary mb-0.5">Moderasi Admin</h3>
                  <p class="text-xs text-text-secondary leading-relaxed">
                    Status berubah dari
                    <span class="rounded bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 text-[10px] font-bold align-middle">Pending</span>
                    → admin memverifikasi dalam maks 1×24 jam kerja →
                    <span class="rounded bg-success/20 text-success px-1.5 py-0.5 text-[10px] font-bold align-middle">Approved</span>
                    dan langsung tampil di publik.
                  </p>
                </div>
              </div>
            </div>

            <!-- CTA -->
            <div class="mt-7 text-center">
              <router-link
                to="/upload"
                class="inline-flex items-center gap-2 rounded-xl bg-success px-5 py-2.5 text-xs font-bold text-background hover:bg-success-hover transition-colors"
              >
                <UploadCloud class="h-4 w-4" />
                Unggah Aset Digital
              </router-link>
            </div>
          </div>
        </section>

        <!-- ===================== TOPIC 4: KELOLA & CAIRKAN ===================== -->
        <section v-if="activeTab === 'kelola'" class="space-y-4">
          <div class="rounded-2xl border border-border bg-elevated/50 p-6 sm:p-7 backdrop-blur-sm">
            <h2 class="font-heading text-2xl font-bold text-text-primary mb-5">
              Kelola Listing & Pencairan
            </h2>

            <div class="mb-6 rounded-xl border border-border/70 bg-surface/60 p-4 text-xs text-text-secondary leading-relaxed">
              Pantau performa, perbarui konten, dan tarik saldo ke rekening bank kapan saja.
            </div>

            <div class="space-y-5">
              <div class="flex items-start gap-3.5">
                <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-[11px] font-bold text-white">
                  1
                </div>
                <div>
                  <h3 class="text-xs font-bold text-text-primary mb-0.5">My Listings <span class="font-normal text-text-secondary">( /listings )</span></h3>
                  <p class="text-xs text-text-secondary leading-relaxed">
                    Lihat seluruh portofolio aset Anda. Filter berdasarkan status:
                    <span class="rounded bg-success/20 text-success px-1.5 py-0.5 text-[10px] font-bold align-middle">Approved</span>,
                    <span class="rounded bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 text-[10px] font-bold align-middle">Pending</span>, atau
                    <span class="rounded bg-red-500/20 text-red-400 px-1.5 py-0.5 text-[10px] font-bold align-middle">Rejected</span>.
                    Jika ditolak, admin menyertakan alasan — perbaiki dan ajukan ulang.
                  </p>
                </div>
              </div>

              <div class="flex items-start gap-3.5">
                <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-[11px] font-bold text-white">
                  2
                </div>
                <div>
                  <h3 class="text-xs font-bold text-text-primary mb-0.5">Payment Settings <span class="font-normal text-text-secondary">( /settings/payment )</span></h3>
                  <p class="text-xs text-text-secondary leading-relaxed">
                    Lengkapi data rekening bank (Nama Bank, Nomor Rekening, Nama Pemilik) sebelum bisa menarik saldo.
                  </p>
                </div>
              </div>

              <div class="flex items-start gap-3.5">
                <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-[11px] font-bold text-white">
                  3
                </div>
                <div>
                  <h3 class="text-xs font-bold text-text-primary mb-0.5">Revenue & Payout <span class="font-normal text-text-secondary">( /revenue )</span></h3>
                  <p class="text-xs text-text-secondary leading-relaxed">
                    Pantau ringkasan pendapatan, lihat ledger transaksi, dan ajukan penarikan jika saldo ≥ Rp50.000.
                  </p>
                </div>
              </div>
            </div>

            <!-- Quick links -->
            <div class="mt-7 grid grid-cols-2 gap-3">
              <router-link
                to="/listings"
                class="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface p-3.5 hover:border-primary transition-colors"
              >
                <span class="text-xs font-semibold text-text-primary">My Listings</span>
                <ArrowRight class="h-3.5 w-3.5 text-primary shrink-0" />
              </router-link>
              <router-link
                to="/revenue"
                class="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface p-3.5 hover:border-secondary transition-colors"
              >
                <span class="text-xs font-semibold text-text-primary">Revenue</span>
                <ArrowRight class="h-3.5 w-3.5 text-secondary shrink-0" />
              </router-link>
            </div>
          </div>
        </section>

        <!-- ===================== FAQ ===================== -->
        <section class="rounded-2xl border border-border bg-elevated/40 p-6 sm:p-7 backdrop-blur-sm">
          <div class="flex items-center gap-2 mb-1">
            <HelpCircle class="h-3.5 w-3.5 text-secondary" />
            <span class="text-[10px] font-bold uppercase tracking-widest text-secondary">Pertanyaan Umum</span>
          </div>
          <h2 class="font-heading text-2xl font-bold text-text-primary mb-5">
            FAQ
          </h2>

          <div class="space-y-2">
            <div
              v-for="(faq, idx) in faqs"
              :key="idx"
              class="rounded-xl border border-border bg-surface/70 overflow-hidden"
            >
              <button
                @click="toggleFaq(idx)"
                class="w-full flex items-center justify-between p-3.5 text-left text-xs font-semibold text-text-primary hover:text-primary transition-colors cursor-pointer gap-3"
              >
                <span>{{ faq.q }}</span>
                <ChevronDown
                  :class="[
                    'h-3.5 w-3.5 text-text-secondary transition-transform duration-150 shrink-0',
                    openFaqIndex === idx ? 'rotate-180 text-primary' : ''
                  ]"
                />
              </button>

              <div
                v-if="openFaqIndex === idx"
                class="px-3.5 pb-3.5 pt-0 text-xs text-text-secondary leading-relaxed border-t border-border/50"
              >
                {{ faq.a }}
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  </div>
</template>
