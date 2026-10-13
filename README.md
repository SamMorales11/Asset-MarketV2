# Asset Market — Curated Digital Asset Marketplace

![Asset Market Architecture & Platform](frontend/src/assets/hero.png)

> **Asset Market** adalah platform marketplace aset digital berkinerja tinggi untuk desainer, pengembang, dan kreator visual (UI template, source code, model 3D, grafis, dan audio). Platform ini dibangun dengan model **bagi hasil 60/40** (60% untuk kreator, 40% komisi platform), alur pembayaran escrow transfer manual terverifikasi, perlindungan unduhan berkas digital biner, serta log audit administrator permanen.

---

## 📸 Tampilan Antarmuka Aplikasi

| Beranda & Hero Showcase | Portofolio & Katalog Produk |
| :---: | :---: |
| ![Hero Showcase](frontend/src/assets/hero.png) | ![Lumina SaaS Dashboard](backend/uploads/thumbnails/lumina-saas-dashboard-thumb.png) |

| Model 3D & Aset Interaktif | UI Kit & Source Code |
| :---: | :---: |
| ![Cyberpunk Humanoid 3D](backend/uploads/thumbnails/cyberpunk-humanoid-rigged-3d-thumb.png) | ![Zenith Mobile Banking](backend/uploads/thumbnails/zenith-mobile-banking-ui-kit-thumb.png) |

---

## 🏛️ Arsitektur Sistem

Platform ini dirancang dengan pola monorepo terpisah antara klien SPA (*Single Page Application*) dan server API modular:

```mermaid
graph TD
    User["Pembeli & Kreator"] -->|Browser / HTTPS| FE["Frontend (Vue 3 + Vite) :5173"]
    Admin["Administrator"] -->|Dashboard Moderasi| FE

    FE -->|Axios REST API / HttpOnly Cookie| BE["Backend (Hono.js) :3001"]

    subgraph Backend Core
        BE --> Auth["Auth & RBAC (jose JWT + bcryptjs)"]
        BE --> Limiter["Rate Limiter (Sliding Window)"]
        BE --> FileSec["Secure File Delivery Guard"]
        BE --> Drizzle["Drizzle ORM"]
    end

    subgraph Data & Storage
        Drizzle --> DB[(Neon Serverless PostgreSQL)]
        FileSec --> Storage["Local Storage / S3 Protected Deliverables"]
    end
```

### Tech Stack

| Layer | Teknologi Utama | Deskripsi |
| :--- | :--- | :--- |
| **Frontend** | Vue 3, Vite, TypeScript | SPA reaktif dengan Composition API dan `<script setup>` |
| **State & Routing**| Pinia, Vue Router | State store tersinkronisasi (auth, cart) & RBAC navigation guards |
| **Styling & UI** | Tailwind CSS, Lucide Icons | Dark editorial luxury aesthetics dengan typography-led design |
| **Backend** | Hono.js, Node.js (v20+) | Framework serverless/edge-ready ultra cepat dan hemat memori |
| **ORM & Database**| Drizzle ORM, Neon PostgreSQL | Type-safe schema builder dan serverless cloud PostgreSQL |
| **Keamanan** | Jose (JWT), bcryptjs | Access token rotatif + Refresh token aman via HttpOnly cookies |
| **Validasi** | Zod v4 | Validasi skema runtime pada HTTP request dan multipart data |
| **Testing** | Vitest, Happy-DOM | 186 unit & integration tests dengan pass-rate 100% |

---

## 🌐 Pemetaan Jaringan & Port (Port Mapping)

Secara default, service lokal berjalan pada port berikut:

| Layanan | Protokol / URL | Deskripsi |
| :--- | :--- | :--- |
| **Frontend SPA** | `http://localhost:5173` | Portal publik, dashboard kreator, dan konsol admin |
| **Backend API** | `http://localhost:3001` | Root backend server & health check (`/health`) |
| **REST API Base** | `http://localhost:3001/api` | Endpoint utama transaksi, aset, autentikasi, & admin |
| **Public Uploads** | `http://localhost:3001/uploads/*` | Penyajian thumbnail publik & slip bukti transfer |

---

## 📁 Struktur Direktori Monorepo

```
Asset-Market/
├── package.json              # Workspace root runner (build & test)
├── README.md                 # Dokumentasi utama proyek
├── backend/                  # Layanan backend (Hono + Drizzle)
│   ├── .env.example          # Template environment variable backend
│   ├── drizzle.config.ts     # Konfigurasi Drizzle Kit
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── src/
│       ├── app.ts            # Definisi route Hono & static uploads guard
│       ├── index.ts          # Entry point HTTP server Node.js
│       ├── db/               # Skema PostgreSQL (schema.ts), client, & seeder
│       ├── lib/              # Enkripsi, token JWT, dan validasi Zod v4
│       ├── middleware/       # Autentikasi, otorisasi RBAC, rate limiter
│       ├── routes/           # Handler route (auth, assets, cart, admin, users)
│       ├── services/         # Layanan pengiriman berkas aman (assetFileService)
│       ├── storage/          # Storage abstraction (local disk / AWS S3)
│       └── __tests__/        # 120 unit dan integration tests Vitest
└── frontend/                 # Aplikasi frontend (Vue 3 + Tailwind)
    ├── .env.example          # Template environment variable frontend
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── vitest.config.ts
    └── src/
        ├── App.vue           # Root component
        ├── main.ts           # Vue initialization
        ├── components/       # Komponen reusable (AssetCard, Navbar, Skeletons)
        ├── composables/      # Hooks (useToast, useConfirm, useTheme)
        ├── pages/            # View halaman (Catalog, Detail, Checkout, Admin)
        ├── router/           # Client-side router & role navigation guards
        ├── services/         # Axios API clients & interceptors
        ├── stores/           # Pinia stores (auth, cart)
        └── __tests__/        # 66 unit dan component tests Vitest
```

---

## ⚙️ Panduan Instalasi & Menjalankan Aplikasi

### 1. Prasyarat Sistem
- **Node.js**: Versi `>= 20.x`
- **npm**: Versi `>= 10.x`
- **PostgreSQL Database**: Akses PostgreSQL aktif (disarankan [Neon Serverless Postgres](https://neon.tech))

### 2. Kloning & Pemasangan Dependensi
Pasang seluruh dependensi pada level root, backend, dan frontend:

```bash
# Klon repositori
git clone https://github.com/username/Asset-Market.git
cd Asset-Market

# Pasang dependensi backend & frontend
npm install --prefix backend
npm install --prefix frontend
```

### 3. Konfigurasi Environment Variables
Salin template konfigurasi resmi **tanpa mengekspos kredensial asli ke git**:

#### Backend (`backend/.env`)
Salin dari `backend/.env.example`:
```bash
cp backend/.env.example backend/.env
```

Pastikan variabel terisi sesuai format berikut:
```env
# Server Configuration
PORT=3001
NODE_ENV=development
APP_URL=http://localhost:3001

# Database Configuration (Neon Serverless PostgreSQL)
DATABASE_URL=postgresql://user:password@ep-example-123456.us-east-2.aws.neon.tech/neondb?sslmode=require

# JWT Authentication Secrets (minimal 32 karakter untuk keamanan)
JWT_ACCESS_SECRET=your_super_secret_access_jwt_key_min_32_chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_super_secret_refresh_jwt_key_min_32_chars
JWT_REFRESH_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

#### Frontend (`frontend/.env`)
Salin dari `frontend/.env.example`:
```bash
cp frontend/.env.example frontend/.env
```

Isi konfigurasi URL API backend:
```env
# Frontend Environment Variables
VITE_API_BASE_URL=http://localhost:3001/api
```

---

## 🗄️ Database: Migrasi & Seeding

Jalankan perintah Drizzle berikut dari direktori `backend/`:

```bash
# Push skema tabel ke database PostgreSQL
npm run db:push --prefix backend

# (Opsional) Jalankan migrasi jika menggunakan file migrasi
npm run db:migrate --prefix backend

# Jalankan database seed (membuat kategori awal, akun admin, kreator, dan aset demo)
npm run db:seed --prefix backend
```

---

## 🚀 Menjalankan Server Pengembangan (Dev Mode)

Jalankan backend dan frontend secara berdampingan:

```bash
# Terminal 1: Jalankan Backend (Hono dev server dengan hot reload)
npm run dev --prefix backend

# Terminal 2: Jalankan Frontend (Vite dev server)
npm run dev --prefix frontend
```

Buka peramban di `http://localhost:5173`.

---

## 🔨 Perintah Build Monorepo

Seluruh service dapat di-build untuk kebutuhan produksi langsung dari root workspace:

```bash
# Build seluruh workspace (Backend TypeScript tsc + Frontend Vite bundle)
npm run build

# Build spesifik backend
npm run build:backend

# Build spesifik frontend
npm run build:frontend
```

---

## 🧪 Pengujian Otomatis (Testing Suite)

Proyek ini dilengkapi dengan **186 automated tests** yang menguji unit utilitas, state management, alur pembayaran, dan endpoint integrasi API:

```bash
# Menjalankan seluruh pengujian (Backend + Frontend)
npm test

# Menjalankan pengujian backend saja (120 tests)
npm run test:backend

# Menjalankan pengujian frontend saja (66 tests)
npm run test:frontend

# Menjalankan pengujian beserta laporan code coverage
npm run test:coverage
```

### Ringkasan Cakupan Pengujian:
- **Backend (120 tests)**: Autentikasi JWT, rotasi refresh token, kalkulasi bagi hasil 60/40, validasi multipart file, perizinan unduh aset digital, flow checkout, dan audit logging admin.
- **Frontend (66 tests)**: Pinia `useCartStore` (optimistic update & rollback), `useAuthStore`, `useToast`, `useConfirm`, guard navigasi RBAC, rendering kartu aset, dan fallback gambar editorial.

---

## 🔒 Standar Keamanan & Perlindungan Data

1. **Perlindungan Unduhan Berkas Digital (Deliverables Guard)**:
   - Berkas biner aset digital (source code, 3D archive, template) **tidak dapat diakses melalui URL statis publik** (`/uploads/*`). Akses langsung ke folder `/files/` dan `/deliverables/` diblokir dengan respon `403 Forbidden`.
   - Unduhan hanya dilayani via streaming endpoint terenkripsi setelah diverifikasi hak kepemilikannya oleh `AssetFileService`.
2. **Keamanan Autentikasi**:
   - Refresh token disimpan secara eksklusif dalam cookie bertanda `HttpOnly`, `SameSite`, dan `Secure` (saat production).
   - Akses token jangka pendek (15 menit) diverifikasi melalui header `Authorization: Bearer <token>`.
3. **Pencegahan Brute-Force & Rate Limiting**:
   - Algoritma *sliding-window in-memory* membatasi percobaan login dan registrasi maksimal 30 permintaan per 15 menit per alamat IP.
4. **Audit Trail Permanen**:
   - Seluruh mutasi persetujuan (*approval*), penolakan (*rejection*), dan perubahan status diverifikasi ke tabel `admin_actions` yang bersifat append-only.

---

## 📄 Lisensi
Proyek ini dilisensikan di bawah lisensi [ISC](LICENSE).
