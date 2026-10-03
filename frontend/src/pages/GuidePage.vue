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
  Coins,
  ArrowRight,
  HelpCircle,
  Lock,
  ChevronDown,
} from 'lucide-vue-next';

const route = useRoute();

// Active guide topic
type GuideTab = 'registrasi' | 'login' | 'jual' | 'kelola';
const activeTab = ref<GuideTab>((route.query.tab as GuideTab) || 'registrasi');

// Guide tabs configuration
const guideTabs = [
  {
    id: 'registrasi' as GuideTab,
    title: '1. Registrasi Akun',
    shortDesc: 'Cara membuat akun pembeli & kreator baru',
    icon: UserPlus,
    badge: 'Dasar',
  },
  {
    id: 'login' as GuideTab,
    title: '2. Login & Keamanan',
    shortDesc: 'Autentikasi JWT, session, & proteksi',
    icon: LogIn,
    badge: 'Keamanan',
  },
  {
    id: 'jual' as GuideTab,
    title: '3. Jual & Upload Aset',
    shortDesc: 'Format ZIP, penetapan harga, & bagi hasil 60%',
    icon: UploadCloud,
    badge: 'Kreator 60/40',
  },
  {
    id: 'kelola' as GuideTab,
    title: '4. Kelola & Edit Aset',
    shortDesc: 'Revisi listing, status moderasi, & pencairan',
    icon: Edit3,
    badge: 'Manajemen',
  },
];

// FAQ Accordion State
const openFaqIndex = ref<number | null>(0);
function toggleFaq(index: number) {
  openFaqIndex.value = openFaqIndex.value === index ? null : index;
}

const faqs = [
  {
    q: 'Berapa lama proses persetujuan (approval) aset oleh Admin?',
    a: 'Proses moderasi admin biasanya memakan waktu maksimal 1x24 jam pada hari kerja. Admin memeriksa kelengkapan file arsip (.zip), tidak adanya script berbahaya atau malware, serta kesesuaian gambar thumbnail dan deskripsi dengan konten sebenarnya.',
  },
  {
    q: 'Bagaimana cara kerja pembagian pendapatan 60% bagi kreator?',
    a: 'Setiap aset yang terjual langsung dihitung dengan formula 60% untuk penjual (kreator) dan 40% untuk komisi platform. Sebagai contoh, jika aset Anda terjual Rp 350.000, maka saldo Anda akan bertambah Rp 210.000 secara otomatis ke dalam buku besar (revenue ledger).',
  },
  {
    q: 'Bagaimana proses pembayaran manual bekerja?',
    a: 'Pembeli melakukan transfer manual ke salah satu nomor rekening resmi platform (BCA, Mandiri, BNI, BRI) sesuai nominal yang tertera pada invoice. Pembeli kemudian mengunggah bukti transfer. Admin memverifikasi dana masuk, lalu aset otomatis dapat diunduh oleh pembeli.',
  },
  {
    q: 'Apakah saya bisa mengedit aset yang sudah disetujui (Approved)?',
    a: 'Tentu saja. Anda dapat mengedit judul, deskripsi, harga diskon, demo URL, dan tag kapan saja melalui halaman My Listings. Jika Anda memperbarui file arsip (.zip), aset dapat melalui proses re-verifikasi singkat demi menjaga keamanan pembeli.',
  },
  {
    q: 'Kapan saya dapat menarik saldo pendapatan (Payout)?',
    a: 'Anda dapat mengajukan penarikan dana kapan saja selama saldo Anda mencapai batas minimum penarikan (Rp 50.000) dan telah melengkapi informasi rekening bank di menu Payment Settings.',
  },
];
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
    <!-- Breadcrumb -->
    <nav class="mb-4 flex items-center gap-2 text-xs text-text-secondary">
      <router-link to="/" class="hover:text-text-primary transition">Home</router-link>
      <span>/</span>
      <span class="text-text-primary font-medium">Panduan Pengguna & Kreator</span>
    </nav>

    <!-- Header Section (Luxury Editorial) -->
    <div class="mb-12 border-b border-border pb-8">
      <div class="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary mb-3">
        <BookOpen class="h-3.5 w-3.5" />
        <span>Pusat Panduan & Dokumentasi Resmi</span>
      </div>
      <h1 class="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-text-primary max-w-4xl leading-[1.1]">
        Panduan Lengkap <span class="italic text-primary">Pengguna & Kreator</span>
      </h1>
      <p class="text-sm text-text-secondary mt-3 max-w-2xl leading-relaxed">
        Pelajari setiap langkah mulai dari mendaftar akun, menjaga keamanan sesi, mengunggah aset digital berkualitas tinggi untuk bagi hasil 60%, hingga mengelola listing dan mencairkan pendapatan.
      </p>
    </div>

    <!-- MAIN TWO-COLUMN LAYOUT -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <!-- SIDEBAR TOPIC NAVIGATION (Desktop sticky / Mobile horizontal) -->
      <aside class="lg:col-span-4 sticky top-24 space-y-3">
        <h3 class="text-xs font-bold uppercase tracking-wider text-text-secondary px-1">
          Daftar Topik Panduan
        </h3>

        <div class="space-y-2">
          <button
            v-for="tab in guideTabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'w-full text-left p-4 rounded-2xl border transition flex items-start gap-3.5 cursor-pointer',
              activeTab === tab.id
                ? 'bg-elevated border-primary text-text-primary shadow-lg shadow-primary/10 ring-1 ring-primary/40'
                : 'bg-elevated/40 border-border text-text-secondary hover:bg-elevated hover:text-text-primary'
            ]"
          >
            <div
              :class="[
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition',
                activeTab === tab.id
                  ? 'bg-primary text-white'
                  : 'bg-surface border border-border text-text-secondary'
              ]"
            >
              <component :is="tab.icon" class="h-5 w-5" />
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-1 mb-0.5">
                <span class="text-xs font-bold truncate text-text-primary">{{ tab.title }}</span>
                <span class="text-[9px] font-mono px-2 py-0.5 rounded-full bg-surface border border-border text-text-secondary">
                  {{ tab.badge }}
                </span>
              </div>
              <p class="text-[11px] text-text-secondary leading-snug line-clamp-1">
                {{ tab.shortDesc }}
              </p>
            </div>
          </button>
        </div>

        <!-- Quick Help Card -->
        <div class="mt-6 rounded-2xl border border-secondary/30 bg-secondary/10 p-4 text-xs text-text-primary">
          <div class="flex items-center gap-2 font-bold text-secondary mb-1">
            <Coins class="h-4 w-4" />
            <span>Skema Bagi Hasil 60/40</span>
          </div>
          <p class="text-[11px] text-text-secondary leading-relaxed">
            Kreator di Asset Market berhak atas <strong>60%</strong> dari seluruh transaksi penjualan tanpa potongan tersembunyi.
          </p>
          <router-link
            to="/upload"
            class="inline-flex items-center gap-1 text-[11px] font-bold text-secondary hover:underline mt-2.5"
          >
            <span>Mulai Jual Aset Anda</span>
            <ArrowRight class="h-3 w-3" />
          </router-link>
        </div>
      </aside>

      <!-- CONTENT DISPLAY (Editorial Rich Guide) -->
      <main class="lg:col-span-8 space-y-8">
        <!-- ================================================================= -->
        <!-- TOPIK 1: PANDUAN REGISTRASI AKUN -->
        <!-- ================================================================= -->
        <section v-if="activeTab === 'registrasi'" class="space-y-6">
          <div class="rounded-3xl border border-border bg-elevated/50 p-6 sm:p-8 backdrop-blur-md">
            <div class="flex items-center gap-3 mb-4">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary border border-primary/30">
                <UserPlus class="h-6 w-6" />
              </div>
              <div>
                <h2 class="font-heading text-2xl sm:text-3xl font-bold text-text-primary">
                  Panduan Registrasi Akun Baru
                </h2>
                <p class="text-xs text-text-secondary">
                  Satu akun terpadu untuk menjelajah, membeli, dan menjual aset digital.
                </p>
              </div>
            </div>

            <!-- Summary callout -->
            <div class="my-6 rounded-2xl border border-border bg-surface/60 p-4 text-xs text-text-secondary leading-relaxed">
              <strong class="text-text-primary font-semibold">Akun Universal:</strong> Di Asset Market, Anda tidak memerlukan akun terpisah untuk menjadi pembeli dan penjual. Setiap pengguna terdaftar dapat langsung membeli aset digital berlisensi, sekaligus mempublikasikan karya digital untuk mendapatkan penghasilan 60% bagi hasil.
            </div>

            <!-- Step by step -->
            <div class="space-y-6">
              <!-- Step 1 -->
              <div class="flex items-start gap-4">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-xs font-bold text-white shadow">
                  1
                </div>
                <div>
                  <h3 class="text-sm font-bold text-text-primary mb-1">Buka Halaman Registrasi</h3>
                  <p class="text-xs text-text-secondary leading-relaxed">
                    Klik tombol <strong>"Sign In"</strong> di bilah navigasi atas, lalu pilih opsi <strong>"Create an Account"</strong> atau langsung kunjungi tautan
                    <router-link to="/register" class="text-primary font-semibold hover:underline">/register</router-link>.
                  </p>
                </div>
              </div>

              <!-- Step 2 -->
              <div class="flex items-start gap-4">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-xs font-bold text-white shadow">
                  2
                </div>
                <div>
                  <h3 class="text-sm font-bold text-text-primary mb-1">Lengkapi Formulir Pendaftaran</h3>
                  <p class="text-xs text-text-secondary leading-relaxed mb-2">
                    Isi informasi identitas akun Anda dengan teliti:
                  </p>
                  <ul class="list-disc list-inside space-y-1 text-xs text-text-secondary pl-2">
                    <li><strong class="text-text-primary">Nama Lengkap:</strong> Nama tampilan publik Anda di marketplace (misalnya: nama kreator atau studio).</li>
                    <li><strong class="text-text-primary">Alamat Email:</strong> Gunakan email aktif karena notifikasi transaksi dan tautan verifikasi akan dikirimkan ke email ini.</li>
                    <li><strong class="text-text-primary">Kata Sandi (Password):</strong> Minimal 8 karakter kombinasi huruf dan angka demi keamanan akun Anda.</li>
                    <li><strong class="text-text-primary">Nomor WhatsApp / Telepon (Opsional):</strong> Membantu tim verifikasi menghubungi Anda terkait pencairan dana.</li>
                  </ul>
                </div>
              </div>

              <!-- Step 3 -->
              <div class="flex items-start gap-4">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-xs font-bold text-white shadow">
                  3
                </div>
                <div>
                  <h3 class="text-sm font-bold text-text-primary mb-1">Konfirmasi & Mulai Gunakan</h3>
                  <p class="text-xs text-text-secondary leading-relaxed">
                    Setelah mengklik tombol <strong>"Buat Akun Sekarang"</strong>, sesi login Anda langsung diaktifkan secara instan. Anda dapat langsung menjelajahi katalog atau mengakses Dashboard User Anda.
                  </p>
                </div>
              </div>
            </div>

            <!-- Call to Action Banner -->
            <div class="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-primary/10 p-4">
              <div>
                <h4 class="text-xs font-bold text-text-primary">Belum memiliki akun di Asset Market?</h4>
                <p class="text-[11px] text-text-secondary">Daftar sekarang dalam waktu kurang dari 1 menit.</p>
              </div>
              <router-link
                to="/register"
                class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow hover:bg-primary-hover transition"
              >
                <span>Daftar Akun Gratis</span>
                <ArrowRight class="h-3.5 w-3.5" />
              </router-link>
            </div>
          </div>
        </section>

        <!-- ================================================================= -->
        <!-- TOPIK 2: PANDUAN LOGIN & KEAMANAN -->
        <!-- ================================================================= -->
        <section v-if="activeTab === 'login'" class="space-y-6">
          <div class="rounded-3xl border border-border bg-elevated/50 p-6 sm:p-8 backdrop-blur-md">
            <div class="flex items-center gap-3 mb-4">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/20 text-secondary border border-secondary/30">
                <LogIn class="h-6 w-6" />
              </div>
              <div>
                <h2 class="font-heading text-2xl sm:text-3xl font-bold text-text-primary">
                  Panduan Login & Protokol Keamanan
                </h2>
                <p class="text-xs text-text-secondary">
                  Autentikasi terenkripsi berbasis JWT dan sesi aman anti-pembajakan.
                </p>
              </div>
            </div>

            <!-- Step by step -->
            <div class="space-y-6 my-6">
              <div class="flex items-start gap-4">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs font-bold text-background shadow">
                  1
                </div>
                <div>
                  <h3 class="text-sm font-bold text-text-primary mb-1">Akses Portal Masuk (/login)</h3>
                  <p class="text-xs text-text-secondary leading-relaxed">
                    Kunjungi tautan <router-link to="/login" class="text-secondary font-semibold hover:underline">/login</router-link>. Masukkan alamat email terdaftar dan kata sandi yang telah Anda buat saat pendaftaran.
                  </p>
                </div>
              </div>

              <div class="flex items-start gap-4">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs font-bold text-background shadow">
                  2
                </div>
                <div>
                  <h3 class="text-sm font-bold text-text-primary mb-1">Verifikasi Token JWT & Cookie HttpOnly</h3>
                  <p class="text-xs text-text-secondary leading-relaxed">
                    Sistem akan memvalidasi kredensial Anda dan menerbitkan Access Token bertipe JWT yang disimpan di memori aman, didukung dengan Cookie Refresh Token HttpOnly yang tidak dapat dibaca oleh script pihak ketiga (proteksi XSS).
                  </p>
                </div>
              </div>

              <div class="flex items-start gap-4">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs font-bold text-background shadow">
                  3
                </div>
                <div>
                  <h3 class="text-sm font-bold text-text-primary mb-1">Akses Area Dashboard Sesuai Peran (RBAC)</h3>
                  <p class="text-xs text-text-secondary leading-relaxed">
                    Setelah berhasil masuk, Anda memiliki akses penuh ke Dashboard Pengguna, Keranjang, Aset yang Dibeli, dan Riwayat Transaksi. Pengguna dengan hak akses khusus (Admin/Superadmin) akan melihat panel kendali Admin Center.
                  </p>
                </div>
              </div>
            </div>

            <!-- Security Best Practices -->
            <div class="rounded-2xl border border-border bg-surface p-5 space-y-3">
              <div class="flex items-center gap-2 text-xs font-bold text-text-primary">
                <Lock class="h-4 w-4 text-secondary" />
                <span>Tips Keamanan Akun Anda:</span>
              </div>
              <ul class="space-y-2 text-xs text-text-secondary">
                <li class="flex items-start gap-2">
                  <CheckCircle2 class="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                  <span>Jangan pernah membagikan kata sandi Anda kepada siapa pun, termasuk staf Asset Market.</span>
                </li>
                <li class="flex items-start gap-2">
                  <CheckCircle2 class="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                  <span>Selalu gunakan kata sandi unik yang berbeda dari akun email pribadi Anda.</span>
                </li>
                <li class="flex items-start gap-2">
                  <CheckCircle2 class="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                  <span>Gunakan tombol Sign Out di pojok kanan atas setelah selesai menggunakan komputer umum atau perangkat bersama.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <!-- ================================================================= -->
        <!-- TOPIK 3: PANDUAN JUAL & UPLOAD ASET -->
        <!-- ================================================================= -->
        <section v-if="activeTab === 'jual'" class="space-y-6">
          <div class="rounded-3xl border border-border bg-elevated/50 p-6 sm:p-8 backdrop-blur-md">
            <div class="flex items-center gap-3 mb-4">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-success/20 text-success border border-success/30">
                <UploadCloud class="h-6 w-6" />
              </div>
              <div>
                <h2 class="font-heading text-2xl sm:text-3xl font-bold text-text-primary">
                  Panduan Jual & Upload Aset Digital
                </h2>
                <p class="text-xs text-text-secondary">
                  Dapatkan 60% bagi hasil dari setiap penjualan dengan alur moderasi profesional.
                </p>
              </div>
            </div>

            <!-- Formula Box -->
            <div class="my-6 rounded-2xl border border-success/30 bg-success/10 p-5">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold uppercase tracking-wider text-success">Skema Pembagian 60/40</span>
                <span class="font-mono text-xs font-bold text-success">Transparan & Otomatis</span>
              </div>
              <div class="grid grid-cols-2 gap-4 text-xs mt-3">
                <div class="rounded-xl bg-surface/70 p-3">
                  <span class="text-text-secondary block mb-1">Hak Kreator (Penjual):</span>
                  <span class="font-heading text-2xl font-bold text-success">60%</span>
                  <p class="text-[10px] text-text-secondary mt-1">Langsung masuk ke saldo akun Anda saat transaksi berstatus 'Paid'.</p>
                </div>
                <div class="rounded-xl bg-surface/70 p-3">
                  <span class="text-text-secondary block mb-1">Biaya Platform:</span>
                  <span class="font-heading text-2xl font-bold text-text-primary">40%</span>
                  <p class="text-[10px] text-text-secondary mt-1">Pemeliharaan server, verifikasi manual admin, & garansi pembeli.</p>
                </div>
              </div>
            </div>

            <!-- Steps for Upload -->
            <div class="space-y-6 my-6">
              <div class="flex items-start gap-4">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success font-mono text-xs font-bold text-background shadow">
                  1
                </div>
                <div>
                  <h3 class="text-sm font-bold text-text-primary mb-1">Siapkan Berkas & Format yang Didukung</h3>
                  <p class="text-xs text-text-secondary leading-relaxed mb-2">
                    Pastikan materi digital Anda rapi dan siap didistribusikan:
                  </p>
                  <ul class="list-disc list-inside space-y-1 text-xs text-text-secondary pl-2">
                    <li><strong class="text-text-primary">File Arsip (.zip, .rar, .7z):</strong> Maksimal ukuran 500 MB. Berisi source code, model 3D (FBX/OBJ/Blend), UI kit (Figma/Vue), atau aset grafis lengkap dengan file panduan README.</li>
                    <li><strong class="text-text-primary">Gambar Thumbnail:</strong> Rasio 16:9 atau 3:2 (rekomendasi 1200x800 px), format PNG/JPG/WebP, maksimal 5 MB. Thumbnail yang tajam meningkatkan konversi penjualan hingga 4x lipat.</li>
                    <li><strong class="text-text-primary">Preview Tambahan:</strong> Unggah hingga 5 gambar tangkapan layar untuk meyakinkan calon pembeli.</li>
                  </ul>
                </div>
              </div>

              <div class="flex items-start gap-4">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success font-mono text-xs font-bold text-background shadow">
                  2
                </div>
                <div>
                  <h3 class="text-sm font-bold text-text-primary mb-1">Buka Form Upload Aset (/upload)</h3>
                  <p class="text-xs text-text-secondary leading-relaxed">
                    Masuk ke halaman <router-link to="/upload" class="text-success font-semibold hover:underline">/upload</router-link>. Pilih Kategori yang tepat (UI Template, Source Code, 3D Model, Graphic, Audio, Document), isi Judul, Deskripsi Lengkap dengan fitur unggulan, dan tentukan harga dalam Rupiah (IDR).
                  </p>
                </div>
              </div>

              <div class="flex items-start gap-4">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success font-mono text-xs font-bold text-background shadow">
                  3
                </div>
                <div>
                  <h3 class="text-sm font-bold text-text-primary mb-1">Proses Moderasi & Approval Admin</h3>
                  <p class="text-xs text-text-secondary leading-relaxed">
                    Setelah submit, status aset Anda adalah <span class="rounded bg-yellow-500/20 text-yellow-400 px-2 py-0.5 text-[10px] font-bold">Pending</span>. Tim admin akan memverifikasi integritas file dalam antrean moderasi. Setelah disetujui, status berubah menjadi <span class="rounded bg-success/20 text-success px-2 py-0.5 text-[10px] font-bold">Approved</span> dan langsung tampil di etalase publik!
                  </p>
                </div>
              </div>
            </div>

            <!-- Upload CTA -->
            <div class="mt-8 text-center">
              <router-link
                to="/upload"
                class="inline-flex items-center gap-2 rounded-2xl bg-success px-6 py-3 text-xs font-bold text-background shadow-lg hover:bg-success-hover transition"
              >
                <UploadCloud class="h-4 w-4" />
                <span>Mulai Unggah Aset Digital Anda</span>
              </router-link>
            </div>
          </div>
        </section>

        <!-- ================================================================= -->
        <!-- TOPIK 4: PANDUAN KELOLA & EDIT ASET -->
        <!-- ================================================================= -->
        <section v-if="activeTab === 'kelola'" class="space-y-6">
          <div class="rounded-3xl border border-border bg-elevated/50 p-6 sm:p-8 backdrop-blur-md">
            <div class="flex items-center gap-3 mb-4">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary border border-primary/30">
                <Edit3 class="h-6 w-6" />
              </div>
              <div>
                <h2 class="font-heading text-2xl sm:text-3xl font-bold text-text-primary">
                  Panduan Kelola Listing & Pencairan Pendapatan
                </h2>
                <p class="text-xs text-text-secondary">
                  Pantau metrik penjualan, perbarui deskripsi, dan tarik dana ke rekening bank Anda.
                </p>
              </div>
            </div>

            <!-- Steps for Manage -->
            <div class="space-y-6 my-6">
              <div class="flex items-start gap-4">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-xs font-bold text-white shadow">
                  1
                </div>
                <div>
                  <h3 class="text-sm font-bold text-text-primary mb-1">Halaman My Listings (/listings)</h3>
                  <p class="text-xs text-text-secondary leading-relaxed">
                    Kunjungi <router-link to="/listings" class="text-primary font-semibold hover:underline">/listings</router-link> untuk melihat seluruh portofolio aset yang pernah Anda unggah. Anda dapat memfilter aset berdasarkan status: <strong>Approved</strong>, <strong>Pending</strong>, atau <strong>Rejected</strong>.
                  </p>
                </div>
              </div>

              <div class="flex items-start gap-4">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-xs font-bold text-white shadow">
                  2
                </div>
                <div>
                  <h3 class="text-sm font-bold text-text-primary mb-1">Menangani Aset yang Ditolak (Rejected)</h3>
                  <p class="text-xs text-text-secondary leading-relaxed">
                    Jika aset Anda ditolak, admin akan menyertakan alasan spesifik (misalnya: file ZIP korup, kurang dokumentasi, atau gambar thumbnail tidak jelas). Anda dapat memperbaiki berkas tersebut dan mengajukan kembali.
                  </p>
                </div>
              </div>

              <div class="flex items-start gap-4">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-xs font-bold text-white shadow">
                  3
                </div>
                <div>
                  <h3 class="text-sm font-bold text-text-primary mb-1">Konfigurasi Rekening Bank (/settings/payment)</h3>
                  <p class="text-xs text-text-secondary leading-relaxed">
                    Sebelum melakukan penarikan saldo, lengkapi data rekening bank Anda di halaman <router-link to="/settings/payment" class="text-primary font-semibold hover:underline">Pengaturan Pembayaran</router-link> (Nama Bank, Nomor Rekening, dan Nama Pemilik Rekening sesuai KTP/buku tabungan).
                  </p>
                </div>
              </div>

              <div class="flex items-start gap-4">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-xs font-bold text-white shadow">
                  4
                </div>
                <div>
                  <h3 class="text-sm font-bold text-text-primary mb-1">Penarikan Dana / Payout (/revenue)</h3>
                  <p class="text-xs text-text-secondary leading-relaxed">
                    Buka halaman <router-link to="/revenue" class="text-primary font-semibold hover:underline">Revenue & Payout</router-link> untuk memantau ringkasan total pendapatan, komisi 60%, rincian ledger append-only, dan tombol pengajuan penarikan dana.
                  </p>
                </div>
              </div>
            </div>

            <!-- Quick Link Buttons -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 pt-6 border-t border-border">
              <router-link
                to="/listings"
                class="flex items-center justify-between p-4 rounded-2xl border border-border bg-surface hover:border-primary transition"
              >
                <div>
                  <h4 class="text-xs font-bold text-text-primary">Buka My Listings</h4>
                  <p class="text-[11px] text-text-secondary">Kelola daftar aset & status moderasi</p>
                </div>
                <ArrowRight class="h-4 w-4 text-primary" />
              </router-link>

              <router-link
                to="/revenue"
                class="flex items-center justify-between p-4 rounded-2xl border border-border bg-surface hover:border-secondary transition"
              >
                <div>
                  <h4 class="text-xs font-bold text-text-primary">Buka Revenue & Payout</h4>
                  <p class="text-[11px] text-text-secondary">Lihat mutasi saldo & ajukan penarikan</p>
                </div>
                <ArrowRight class="h-4 w-4 text-secondary" />
              </router-link>
            </div>
          </div>
        </section>

        <!-- ================================================================= -->
        <!-- FAQ ACCORDION SECTION -->
        <!-- ================================================================= -->
        <section class="rounded-3xl border border-border bg-elevated/40 p-6 sm:p-8 backdrop-blur-md">
          <div class="flex items-center gap-2 text-xs font-bold text-secondary uppercase tracking-wider mb-2">
            <HelpCircle class="h-4 w-4" />
            <span>Pertanyaan yang Sering Diajukan</span>
          </div>
          <h2 class="font-heading text-2xl sm:text-3xl font-bold text-text-primary mb-6">
            Frequently Asked Questions (FAQ)
          </h2>

          <div class="space-y-3">
            <div
              v-for="(faq, idx) in faqs"
              :key="idx"
              class="rounded-2xl border border-border bg-surface/70 overflow-hidden transition"
            >
              <button
                @click="toggleFaq(idx)"
                class="w-full flex items-center justify-between p-4 text-left text-xs font-bold text-text-primary hover:text-primary transition cursor-pointer"
              >
                <span>{{ faq.q }}</span>
                <ChevronDown
                  :class="[
                    'h-4 w-4 text-text-secondary transition-transform duration-200 shrink-0 ml-2',
                    openFaqIndex === idx ? 'rotate-180 text-primary' : ''
                  ]"
                />
              </button>

              <div
                v-if="openFaqIndex === idx"
                class="px-4 pb-4 pt-1 text-xs text-text-secondary leading-relaxed border-t border-border/50"
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
