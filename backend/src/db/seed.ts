import bcrypt from 'bcryptjs';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import * as crypto from 'crypto';
import { eq, inArray, notInArray, count, and, isNull } from 'drizzle-orm';
import { db } from './index.js';
import {
  users,
  categories,
  assets,
  assetFiles,
  transactions,
  transactionItems,
  paymentConfirmations,
  revenueLedger,
  carts,
  cartItems,
  adminActions,
} from './schema.js';
import { getUploadsRootDir, ensureUploadDirs } from '../utils/paths.js';

// =========================================================================
// 1. PROCEDURAL GENERATORS (PNG & ZIP)
// =========================================================================

const crcTable: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i] ?? 0;
    const tableVal = crcTable[(crc ^ b) & 0xff] ?? 0;
    crc = tableVal ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function createLuxuryEditorialPng(width = 800, height = 500, variant = 0): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);
  ihdrData.writeUInt8(2, 9);
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  const rawRowSize = 1 + width * 3;
  const rawBuffer = Buffer.alloc(height * rawRowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rawRowSize;
    rawBuffer[rowOffset] = 0;
    const yRatio = y / height;

    for (let x = 0; x < width; x++) {
      const xRatio = x / width;
      const pxOffset = rowOffset + 1 + x * 3;
      const distFromCenter = Math.hypot(xRatio - 0.5, yRatio - 0.5);

      let r = 18, g = 18, b = 24;
      const mod = variant % 6;

      if (mod === 0) {
        // Luxury Ember & Obsidian
        r = Math.floor(18 + Math.max(0, 1 - distFromCenter * 1.5) * 190);
        g = Math.floor(18 + Math.max(0, 1 - distFromCenter * 1.8) * 55);
        b = Math.floor(24 + Math.max(0, 1 - distFromCenter * 1.6) * 20 + yRatio * 15);
      } else if (mod === 1) {
        // Cosmic Teal & Midnight
        r = Math.floor(14 + Math.max(0, 1 - distFromCenter * 1.8) * 20);
        g = Math.floor(20 + Math.max(0, 1 - distFromCenter * 1.5) * 165);
        b = Math.floor(26 + Math.max(0, 1 - distFromCenter * 1.4) * 180);
      } else if (mod === 2) {
        // Royal Violet & Amethyst
        r = Math.floor(22 + Math.max(0, 1 - distFromCenter * 1.6) * 140);
        g = Math.floor(14 + Math.max(0, 1 - distFromCenter * 1.9) * 40);
        b = Math.floor(30 + Math.max(0, 1 - distFromCenter * 1.4) * 190);
      } else if (mod === 3) {
        // Warm Gold & Champagne
        r = Math.floor(22 + Math.max(0, 1 - distFromCenter * 1.6) * 180);
        g = Math.floor(20 + Math.max(0, 1 - distFromCenter * 1.5) * 150);
        b = Math.floor(24 + Math.max(0, 1 - distFromCenter * 1.8) * 35);
      } else if (mod === 4) {
        // Emerald & Dark Sage
        r = Math.floor(16 + Math.max(0, 1 - distFromCenter * 1.7) * 30);
        g = Math.floor(24 + Math.max(0, 1 - distFromCenter * 1.5) * 160);
        b = Math.floor(22 + Math.max(0, 1 - distFromCenter * 1.6) * 90);
      } else {
        // Cyber Neon Magenta & Deep Blue
        r = Math.floor(24 + Math.max(0, 1 - distFromCenter * 1.5) * 170);
        g = Math.floor(16 + Math.max(0, 1 - distFromCenter * 1.8) * 35);
        b = Math.floor(32 + Math.max(0, 1 - distFromCenter * 1.4) * 180);
      }

      rawBuffer[pxOffset] = Math.min(255, Math.max(0, r));
      rawBuffer[pxOffset + 1] = Math.min(255, Math.max(0, g));
      rawBuffer[pxOffset + 2] = Math.min(255, Math.max(0, b));
    }
  }

  const compressedData = zlib.deflateSync(rawBuffer);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createSampleZip(assetTitle: string, assetType: string, sellerName: string): Buffer {
  const readmeContent = `# ${assetTitle}
Thank you for acquiring ${assetTitle} from Asset Market Indonesia.

## Asset Information
- Title: ${assetTitle}
- Creator: ${sellerName}
- Category: ${assetType}
- License: Standard Commercial License (Perpetual, Royalty-Free)
- Verification ID: ${crypto.randomBytes(8).toString('hex').toUpperCase()}

## Package Manifest
1. /dist/ - Production-ready distribution bundles and assets
2. /src/  - Uncompressed source files and layered designs
3. /docs/ - Integration guide, architecture diagrams, and changelog
4. LICENSE.md - Legal license terms and attribution requirements

## Support & Updates
- Platform: Asset Market Indonesia (https://assetmarket.com)
- Help Center: support@assetmarket.com
`;

  const licenseContent = `COMMERCIAL ASSET LICENSE AGREEMENT
========================================
Asset: ${assetTitle}
Authorized Licensee: Verified Asset Market Account
Grant of Rights: Worldwide, non-exclusive, perpetual right to use, modify, and incorporate this asset into commercial and personal end products.
Restrictions: You may not resell, redistribute, sub-license, or share the source files as standalone stock items.
Asset Market © 2026. All rights reserved.
`;

  const manifestJson = JSON.stringify(
    {
      name: assetTitle,
      version: '1.2.0',
      type: assetType,
      creator: sellerName,
      created_at: new Date().toISOString(),
      checksum: crypto.randomBytes(16).toString('hex'),
      files: ['README.md', 'LICENSE.txt', 'MANIFEST.json', 'source/main_bundle.bin'],
    },
    null,
    2
  );

  const entries = [
    { name: 'README.md', data: Buffer.from(readmeContent, 'utf-8') },
    { name: 'LICENSE.txt', data: Buffer.from(licenseContent, 'utf-8') },
    { name: 'MANIFEST.json', data: Buffer.from(manifestJson, 'utf-8') },
  ];

  const now = new Date();
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  const localHeaders: Buffer[] = [];
  const cdHeaders: Buffer[] = [];
  let currentOffset = 0;

  for (const entry of entries) {
    const nameBytes = Buffer.from(entry.name, 'utf-8');
    const fileBytes = entry.data;
    const crc = crc32(fileBytes);

    const lh = Buffer.alloc(30 + nameBytes.length);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(0, 8);
    lh.writeUInt16LE(time, 10);
    lh.writeUInt16LE(date, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(fileBytes.length, 18);
    lh.writeUInt32LE(fileBytes.length, 22);
    lh.writeUInt16LE(nameBytes.length, 26);
    lh.writeUInt16LE(0, 28);
    nameBytes.copy(lh, 30);

    const cdh = Buffer.alloc(46 + nameBytes.length);
    cdh.writeUInt32LE(0x02014b50, 0);
    cdh.writeUInt16LE(20, 4);
    cdh.writeUInt16LE(20, 6);
    cdh.writeUInt16LE(0, 8);
    cdh.writeUInt16LE(0, 10);
    cdh.writeUInt16LE(time, 12);
    cdh.writeUInt16LE(date, 14);
    cdh.writeUInt32LE(crc, 16);
    cdh.writeUInt32LE(fileBytes.length, 20);
    cdh.writeUInt32LE(fileBytes.length, 24);
    cdh.writeUInt16LE(nameBytes.length, 28);
    cdh.writeUInt16LE(0, 30);
    cdh.writeUInt16LE(0, 32);
    cdh.writeUInt16LE(0, 34);
    cdh.writeUInt16LE(0, 36);
    cdh.writeUInt32LE(0, 38);
    cdh.writeUInt32LE(currentOffset, 42);
    nameBytes.copy(cdh, 46);

    localHeaders.push(lh, fileBytes);
    cdHeaders.push(cdh);
    currentOffset += lh.length + fileBytes.length;
  }

  const cdBuffer = Buffer.concat(cdHeaders);
  const cdOffset = currentOffset;
  const cdSize = cdBuffer.length;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localHeaders, cdBuffer, eocd]);
}

async function ensureLocalFile(
  targetPath: string,
  externalUrl: string,
  width = 800,
  height = 500,
  variant = 0
): Promise<void> {
  if (fsSync.existsSync(targetPath)) {
    const stats = fsSync.statSync(targetPath);
    if (stats.size > 2000) return;
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });

  let buffer: Buffer | null = null;
  try {
    const res = await fetch(externalUrl, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const arrayBuf = await res.arrayBuffer();
      if (arrayBuf.byteLength > 2000) {
        buffer = Buffer.from(arrayBuf);
      }
    }
  } catch {
    // Network fallback to procedural luxury PNG
  }

  if (!buffer) {
    buffer = createLuxuryEditorialPng(width, height, variant);
  }

  await fs.writeFile(targetPath, buffer);
}

// =========================================================================
// 2. SEED DATA DEFINITIONS
// =========================================================================

interface SeedAccount {
  name: string;
  email: string;
  passwordRaw: string;
  role: 'superadmin' | 'admin' | 'user';
  isVerifiedSeller: boolean;
  avatarUrl?: string;
  phone?: string;
  bio?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  bankBranch?: string;
}

// 1. Official Core Demo Accounts (MUST NOT BE DELETED OR BROKEN)
const CORE_DEMO_ACCOUNTS: SeedAccount[] = [
  {
    name: 'Super Admin',
    email: 'superadmin@assetmarket.com',
    passwordRaw: 'SuperAdmin123!',
    role: 'superadmin',
    isVerifiedSeller: true,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    phone: '+628110000001',
    bio: 'Platform Owner & Super Administrator with full system control and access audit rights.',
    bankName: 'Bank Central Asia (BCA)',
    bankAccountNumber: '8001122334',
    bankAccountHolder: 'Super Admin Asset Market',
    bankBranch: 'Jakarta Pusat',
  },
  {
    name: 'Admin Asset Market',
    email: 'admin@assetmarket.com',
    passwordRaw: 'Admin123!',
    role: 'admin',
    isVerifiedSeller: true,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    phone: '+628110000002',
    bio: 'Asset Reviewer, Verification Moderator, and Platform Support Specialist.',
    bankName: 'Bank Mandiri',
    bankAccountNumber: '102003040506',
    bankAccountHolder: 'Admin Asset Market',
    bankBranch: 'Thamrin Jakarta',
  },
  {
    name: 'Demo User',
    email: 'user@assetmarket.com',
    passwordRaw: 'User123!',
    role: 'user',
    isVerifiedSeller: true,
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80',
    phone: '+6281234567890',
    bio: 'Enthusiastic buyer and digital asset collector passionate about high-craft templates & codebases.',
    bankName: 'Bank Central Asia (BCA)',
    bankAccountNumber: '5270918234',
    bankAccountHolder: 'Demo User',
    bankBranch: 'Surabaya Gubeng',
  },
  {
    name: 'Demo Seller',
    email: 'seller@assetmarket.com',
    passwordRaw: 'Seller123!',
    role: 'user',
    isVerifiedSeller: true,
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
    phone: '+6281987654321',
    bio: 'Senior UI/UX Designer & 3D Artist creating award-winning design kits and interactive web systems.',
    bankName: 'Bank Negara Indonesia (BNI)',
    bankAccountNumber: '0388912389',
    bankAccountHolder: 'Demo Seller',
    bankBranch: 'Bandung Dago',
  },
  {
    name: 'Admin Staff',
    email: 'admin2@assetmarket.com',
    passwordRaw: 'AdminStaff123!',
    role: 'admin',
    isVerifiedSeller: true,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    phone: '+628110000003',
    bio: 'Junior Support Moderator assisting with seller onboarding and metadata audits.',
    bankName: 'Bank Mandiri',
    bankAccountNumber: '141009871234',
    bankAccountHolder: 'Admin Staff',
    bankBranch: 'Kuningan Jakarta',
  },
];

// 2. Additional Realistic Sellers (to make marketplace feel alive & diverse)
const ADDITIONAL_SELLERS: SeedAccount[] = [
  {
    name: 'Elena Rostova',
    email: 'elena.rostova@studiovortex.io',
    passwordRaw: 'Vortex2026!',
    role: 'user',
    isVerifiedSeller: true,
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
    phone: '+6281311223344',
    bio: 'Design Systems Architect at Studio Vortex. Specialist in high-converting editorial UI and SaaS dashboards.',
    bankName: 'Bank Central Asia (BCA)',
    bankAccountNumber: '8820194812',
    bankAccountHolder: 'Elena Rostova',
    bankBranch: 'Jakarta Selatan',
  },
  {
    name: 'Marcus Vance',
    email: 'marcus.vance@hyperionlabs.dev',
    passwordRaw: 'Hyperion2026!',
    role: 'user',
    isVerifiedSeller: true,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    phone: '+6281299887766',
    bio: 'Principal Software Architect at Hyperion Labs. Building high-throughput microservices and fintech engines.',
    bankName: 'Bank Mandiri',
    bankAccountNumber: '137001847192',
    bankAccountHolder: 'Marcus Vance',
    bankBranch: 'Jakarta Pusat',
  },
  {
    name: 'Kai Takahashi',
    email: 'kai.takahashi@neoform3d.art',
    passwordRaw: 'Neoform2026!',
    role: 'user',
    isVerifiedSeller: true,
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80',
    phone: '+6281766554433',
    bio: '3D Visual Artist & Technical Director at NeoForm Studio. Specializing in Unreal Engine 5 and PBR assets.',
    bankName: 'Bank Negara Indonesia (BNI)',
    bankAccountNumber: '0891234710',
    bankAccountHolder: 'Kai Takahashi',
    bankBranch: 'Bali Denpasar',
  },
  {
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@monolithaudio.co',
    passwordRaw: 'Monolith2026!',
    role: 'user',
    isVerifiedSeller: true,
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
    phone: '+6281855443322',
    bio: 'Sound Designer & Composer at Monolith Audio. Creator of cinematic soundscapes and UI micro-interactions.',
    bankName: 'Bank Permata',
    bankAccountNumber: '4108821934',
    bankAccountHolder: 'Sarah Jenkins',
    bankBranch: 'Bandung Dago',
  },
  {
    name: 'David Chen',
    email: 'david.chen@typovault.com',
    passwordRaw: 'Typovault2026!',
    role: 'user',
    isVerifiedSeller: true,
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&q=80',
    phone: '+6281944332211',
    bio: 'Type Designer & Vector Illustrator. Foundry principal at TypoVault crafting bespoke branding & icons.',
    bankName: 'Bank CIMB Niaga',
    bankAccountNumber: '7051189234',
    bankAccountHolder: 'David Chen',
    bankBranch: 'Surabaya Darmo',
  },
];

const ALL_SEED_ACCOUNTS = [...CORE_DEMO_ACCOUNTS, ...ADDITIONAL_SELLERS];

const DEFAULT_CATEGORIES = [
  {
    name: 'UI & Web Templates',
    slug: 'ui-templates',
    description: 'Dashboard templates, landing pages, mobile UI kits, and design components.',
    iconUrl: 'layout',
    sortOrder: 1,
  },
  {
    name: 'Source Code & Starters',
    slug: 'source-code',
    description: 'Full-stack applications, microservices, backend starters, and APIs.',
    iconUrl: 'code',
    sortOrder: 2,
  },
  {
    name: '3D Models & Assets',
    slug: '3d-models',
    description: 'High-poly and low-poly 3D models, textures, rigs, and game-ready assets.',
    iconUrl: 'box',
    sortOrder: 3,
  },
  {
    name: 'Graphics & Vector Kits',
    slug: 'graphics-vectors',
    description: 'Vector illustrations, icon packs, typography, and brand assets.',
    iconUrl: 'palette',
    sortOrder: 4,
  },
  {
    name: 'Audio & Sound Effects',
    slug: 'audio-sound',
    description: 'Royalty-free music tracks, cinematic SFX, and ambient soundscapes.',
    iconUrl: 'music',
    sortOrder: 5,
  },
];

interface SeedAssetDef {
  title: string;
  slug: string;
  categorySlug: string;
  assetType: 'ui_template' | 'source_code' | '3d_model' | 'graphic' | 'audio' | 'video' | 'document' | 'other';
  price: string;
  discountPrice?: string | null;
  sellerEmail: string;
  shortDescription: string;
  description: string;
  tags: string[];
  demoUrl?: string;
  ratingAvg: string;
  ratingCount: number;
  downloadCount: number;
  viewCount: number;
  status: 'approved' | 'pending' | 'rejected';
  rejectionReason?: string | null;
  imageUrl: string;
  previewImages: string[];
}

const SEED_ASSETS: SeedAssetDef[] = [
  // ─── 1. UI & Web Templates ──────────────────────────────────────────────
  {
    title: 'Atelier Noir Editorial Design System',
    slug: 'atelier-noir-editorial-design-system',
    categorySlug: 'ui-templates',
    assetType: 'ui_template',
    price: '350000.00',
    discountPrice: '275000.00',
    sellerEmail: 'seller@assetmarket.com',
    shortDescription: 'Sistem desain editorial eksklusif dengan estetika high-fashion, tipografi terkurasi, dan 60+ komponen UI siap pakai.',
    description: `Atelier Noir adalah digital design system yang dirancang khusus untuk brand mewah, media editorial, dan platform digital premium.

### Fitur Utama:
- **Editorial Typography**: Pairing tipografi Fraunces & Plus Jakarta Sans terkurasi dengan proporsi skala modular.
- **Harmonious Dark Theme**: Palet warna HSL berbasis obsidian, ember orange (#D93A0F), dan cosmic teal (#00B8B8).
- **60+ Reusable Components**: Buttons, cards, modals, navigation bars, data tables, dan forms.
- **Figma & Code Tokens**: Sinkronisasi variabel desain untuk Figma dan CSS variables / Vue 3.`,
    tags: ['Design System', 'Editorial', 'Figma', 'Vue 3', 'Luxury'],
    demoUrl: 'https://ateliernoir.design',
    ratingAvg: '4.95',
    ratingCount: 42,
    downloadCount: 156,
    viewCount: 1240,
    status: 'approved',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1558655146-9f40138edfeb?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    title: 'Zenith Mobile Banking & Digital Wallet UI Kit',
    slug: 'zenith-mobile-banking-ui-kit',
    categorySlug: 'ui-templates',
    assetType: 'ui_template',
    price: '380000.00',
    discountPrice: '295000.00',
    sellerEmail: 'seller@assetmarket.com',
    shortDescription: 'Modern mobile banking interface with 100+ screens including crypto wallet, virtual cards, and QRIS integration.',
    description: `Desain aplikasi perbankan masa depan dengan alur navigasi intuitif dan estetika visual modern.

### Layar Unggulan:
- **Biometric Authentication & PIN Pad**: Alur login aman dan verifikasi multi-faktor.
- **Multi-Currency Account & QRIS**: Scanner kode QR cepat dengan konversi kurs instan.
- **Virtual Cards & Expense Tracker**: Rincian pengeluaran berkategori dengan infografis interaktif.
- **100+ Figma Screens**: Auto-layout 5.0, dark & light themes, dan prototype flow siap presentasi.`,
    tags: ['Fintech', 'Mobile', 'iOS', 'Flutter', 'Figma', 'Banking'],
    demoUrl: 'https://zenith-banking.ui',
    ratingAvg: '4.96',
    ratingCount: 39,
    downloadCount: 172,
    viewCount: 980,
    status: 'approved',
    imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    title: 'Lumina SaaS Dashboard & Admin Component Kit',
    slug: 'lumina-saas-dashboard',
    categorySlug: 'ui-templates',
    assetType: 'ui_template',
    price: '480000.00',
    discountPrice: '390000.00',
    sellerEmail: 'elena.rostova@studiovortex.io',
    shortDescription: 'Comprehensive SaaS management dashboard with subscription billing, team management, and dark theme.',
    description: `Lumina adalah dashboard manajemen SaaS modern yang dirancang untuk skala dan produktivitas tinggi.

### Modul Lengkap:
- **Revenue & MRR Analytics**: Visualisasi grafik interaktif, cohort analysis, dan churn prediction.
- **Billing & Subscription**: Invoicing table, payment method management, dan tier upgrade modal.
- **User Roles & Permissions**: Multi-tenant team workspace management dan security audit log.
- **Responsive Layout**: Dukungan penuh mobile drawer dan compact desktop sidebar.`,
    tags: ['SaaS', 'Dashboard', 'Admin Kit', 'Analytics', 'Tailwind', 'Vue 3'],
    demoUrl: 'https://lumina-dashboard.preview',
    ratingAvg: '4.88',
    ratingCount: 56,
    downloadCount: 245,
    viewCount: 1410,
    status: 'approved',
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    title: 'Minimalist Wireframe & Flowchart Starter Kit',
    slug: 'minimalist-wireframe-starter-kit',
    categorySlug: 'ui-templates',
    assetType: 'ui_template',
    price: '0.00',
    discountPrice: null,
    sellerEmail: 'seller@assetmarket.com',
    shortDescription: 'Komponen wireframe cepat dan diagram alur pengguna untuk Figma gratis untuk komunitas desainer.',
    description: `Starter kit wireframe minimalis gratis untuk memvalidasi ide produk dan alur UX dengan cepat.

### Fitur Freebie:
- **80+ Low-Fidelity Layouts**: Header, hero sections, feature grids, pricing tables, dan footers.
- **User Flow Notation**: Simbol panah alur, titik keputusan, dan catatan integrasi pengembang.
- **Kompatibel 100% Figma Auto-Layout 5.0**: Ganti teks dan konten tanpa merusak tata letak.`,
    tags: ['Freebie', 'Wireframe', 'Figma', 'UX Design', 'Flowchart'],
    demoUrl: 'https://wireframe-kit.design',
    ratingAvg: '4.94',
    ratingCount: 68,
    downloadCount: 480,
    viewCount: 1650,
    status: 'approved',
    imageUrl: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1618477247222-acbdb0e159b3?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    title: 'Apex Real Estate & Luxury Architecture Landing',
    slug: 'apex-real-estate-architecture',
    categorySlug: 'ui-templates',
    assetType: 'ui_template',
    price: '290000.00',
    discountPrice: null,
    sellerEmail: 'elena.rostova@studiovortex.io',
    shortDescription: 'High-conversion property landing page template for ultra-luxury residential developments and architects.',
    description: `Template landing page mewah dengan presentasi visual sinematik untuk firma arsitektur dan properti residensial kelas atas.

### Komponen Termasuk:
- **Cinematic Hero Gallery**: Carousel visual imersif dengan rasio layar penuh dan transisi halus.
- **Floor Plan Interactive Viewer**: Modul denah lantai interaktif dengan indikator spesifikasi unit.
- **Virtual Tour Embed Card**: Kompatibel dengan integrasi Matterport 3D dan video walkthrough.
- **Lead Capture Modal**: Formulir penjadwalan temu janji VIP dengan validasi nomor WhatsApp.`,
    tags: ['Real Estate', 'Luxury', 'Architecture', 'Landing Page', 'Tailwind'],
    demoUrl: 'https://apex-luxury.space',
    ratingAvg: '4.91',
    ratingCount: 28,
    downloadCount: 115,
    viewCount: 720,
    status: 'approved',
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    ],
  },

  // ─── 2. Source Code & Starters ──────────────────────────────────────────
  {
    title: 'Chronos High-Frequency Trading Core',
    slug: 'chronos-trading-engine',
    categorySlug: 'source-code',
    assetType: 'source_code',
    price: '750000.00',
    discountPrice: '599000.00',
    sellerEmail: 'seller@assetmarket.com',
    shortDescription: 'High-frequency order-matching engine and market analytics core built with TypeScript, Redis, and WebSocket.',
    description: `Chronos Trading Engine adalah platform order-matching dan distributed market analytics enterprise-ready.

### Spesifikasi Teknis:
- **Low-Latency Orderbook**: Microsecond matching engine dengan struktur data Ring Buffer & AVL tree.
- **WebSocket Streaming**: Real-time market depth, ticker updates, dan candlestick aggregation.
- **Multi-Exchange Adapter**: Integrasi siap pakai ke Binance, OKX, dan custom private exchanges.
- **Full TypeScript**: Didukung unit testing komprehensif dan Docker compose stack.`,
    tags: ['Full Stack', 'TypeScript', 'Node.js', 'Trading', 'WebSocket', 'Fintech'],
    demoUrl: 'https://chronos-engine.dev',
    ratingAvg: '4.89',
    ratingCount: 33,
    downloadCount: 94,
    viewCount: 680,
    status: 'approved',
    imageUrl: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    title: 'Hyperion Headless Microservices E-Commerce Engine',
    slug: 'hyperion-microservices-ecommerce',
    categorySlug: 'source-code',
    assetType: 'source_code',
    price: '890000.00',
    discountPrice: '720000.00',
    sellerEmail: 'marcus.vance@hyperionlabs.dev',
    shortDescription: 'Enterprise-grade headless e-commerce microservices framework supporting multi-vendor transactions.',
    description: `Hyperion adalah arsitektur e-commerce modular tanpa batas (headless) berbasis event-driven architecture.

### Arsitektur Microservices:
- **Catalog & Inventory Service**: Real-time stock reservation dengan Redis distributed lock.
- **Order & Payment Gateway**: Webhook idempotency handler untuk Midtrans, Xendit, dan Stripe.
- **Event Bus**: Kafka messaging broker untuk pemisahan tugas asinkron.
- **GraphQL Gateway**: Apollo Federation untuk komunikasi terpadu frontend-to-backend.`,
    tags: ['Microservices', 'Go', 'Docker', 'PostgreSQL', 'Kafka', 'GraphQL'],
    demoUrl: 'https://hyperion-engine.io',
    ratingAvg: '4.93',
    ratingCount: 45,
    downloadCount: 182,
    viewCount: 1040,
    status: 'approved',
    imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    title: 'Quantum Multi-Tenant Creative Agency Next.js Platform',
    slug: 'quantum-nextjs-agency-platform',
    categorySlug: 'source-code',
    assetType: 'source_code',
    price: '520000.00',
    discountPrice: '420000.00',
    sellerEmail: 'marcus.vance@hyperionlabs.dev',
    shortDescription: 'Production-ready multi-tenant creative agency portfolio with live MDX editor and automated image optimization.',
    description: `Starter kit lengkap untuk agensi kreatif dan studio desain dengan Next.js 15 App Router dan Tailwind CSS.

### Fitur Pengembang:
- **Server-Driven Dynamic Pages**: Static Site Generation (SSG) dengan Incremental Static Regeneration (ISR).
- **Integrated MDX Blog & Case Studies**: Menulis studi kasus kaya interaksi langsung dalam markdown.
- **Lead Capture & Contact Forms**: Resend email integration dan Discord/Slack webhook notifications.`,
    tags: ['Next.js', 'React', 'CMS', 'Tailwind', 'SEO', 'TypeScript'],
    demoUrl: 'https://quantum-agency.preview',
    ratingAvg: '4.90',
    ratingCount: 51,
    downloadCount: 198,
    viewCount: 1180,
    status: 'approved',
    imageUrl: 'https://images.unsplash.com/photo-1522542550221-31fd19575a2d?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    title: 'Essential Developer Utility Scripts & CLI Tools',
    slug: 'essential-developer-cli-tools',
    categorySlug: 'source-code',
    assetType: 'source_code',
    price: '0.00',
    discountPrice: null,
    sellerEmail: 'user@assetmarket.com',
    shortDescription: 'Kumpulan script otomasi DevOps, parser konfigurasi, dan utilitas baris perintah gratis.',
    description: `Koleksi 15 skrip CLI TypeScript siap pakai untuk kompresi aset otomatis, validasi skema JSON, generator slug terenkripsi, dan linter lingkungan pengembang.

### Alat yang Disertakan:
- **Image Optimizer CLI**: Konversi batch WebP/AVIF dengan kompresi lossless otomatis.
- **Git Commit Linter**: Validasi format semantic commit otomatis sebelum push.
- **Database Migrator Hook**: Helper migration audit trail untuk Drizzle dan Prisma.`,
    tags: ['Freebie', 'CLI', 'TypeScript', 'DevTools', 'OpenSource'],
    demoUrl: 'https://devtools-cli.dev',
    ratingAvg: '4.87',
    ratingCount: 44,
    downloadCount: 320,
    viewCount: 960,
    status: 'approved',
    imageUrl: 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
    ],
  },

  // ─── 3. 3D Models & Assets ──────────────────────────────────────────────
  {
    title: 'Vogue & Velvet 3D Spatial Interior Pack',
    slug: 'vogue-velvet-3d-interior',
    categorySlug: '3d-models',
    assetType: '3d_model',
    price: '420000.00',
    discountPrice: '320000.00',
    sellerEmail: 'seller@assetmarket.com',
    shortDescription: 'Koleksi 25+ model 3D furnitur modern minimalis dan interior fotorealistik format Blender & GLTF.',
    description: `Vogue & Velvet menghadirkan koleksi model 3D furnitur kontemporer yang elegan untuk visualisasi arsitektural dan web 3D.

### Isi Paket:
- **25+ Modular Furniture Items**: Kursi lounge, sofa beludru, meja marmer, dan lampu gantung minimalis.
- **PBR 4K Textures**: Albedo, Normal, Roughness, Metallic, dan Ambient Occlusion maps.
- **Cross-Platform Ready**: Format native Blender (.blend), GLTF/GLB (Web 3D), dan FBX.`,
    tags: ['Blender', 'GLTF', 'Interior', 'Photorealistic', 'Architecture', '3D'],
    demoUrl: 'https://spatial-vogue.art',
    ratingAvg: '4.92',
    ratingCount: 48,
    downloadCount: 124,
    viewCount: 810,
    status: 'approved',
    imageUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    title: 'Cyberpunk Humanoid Rigged 3D Character Model',
    slug: 'cyberpunk-humanoid-rigged-3d',
    categorySlug: '3d-models',
    assetType: '3d_model',
    price: '650000.00',
    discountPrice: '499000.00',
    sellerEmail: 'kai.takahashi@neoform3d.art',
    shortDescription: 'Game-ready rigged cyberpunk humanoid with 4K PBR textures and motion capture compatibility.',
    description: `Karakter 3D humanoid sci-fi siap pakai untuk game Unreal Engine 5 dan Unity dengan full bone hierarchy dan facial blendshapes.

### Fitur Karakter:
- **Full IK/FK Rig**: Dioptimalkan untuk Unreal Engine 5 Mannequin skeleton.
- **Facial Blendshapes**: 52 ARKit blendshapes siap untuk facial motion capture via iPhone/Live Link.
- **Cybernetic Augmentations**: Shader emisi neon kustom dengan parameter warna dinamis.`,
    tags: ['Game Ready', 'Rigged', 'Unreal Engine', 'Sci-Fi', 'Character', 'FBX'],
    demoUrl: 'https://cyber-rig.render',
    ratingAvg: '4.82',
    ratingCount: 36,
    downloadCount: 89,
    viewCount: 640,
    status: 'approved',
    imageUrl: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    title: 'Prism Iridescent Abstract 3D Glass Artwork Pack',
    slug: 'prism-iridescent-abstract-3d-glass',
    categorySlug: '3d-models',
    assetType: '3d_model',
    price: '280000.00',
    discountPrice: '210000.00',
    sellerEmail: 'kai.takahashi@neoform3d.art',
    shortDescription: 'Stunning 3D iridescent glass compositions, chromatic materials, and 8K renders for hero sections.',
    description: `Koleksi 18 komposisi abstrak 3D berbahan kaca kromatik dengan pembiasan spektrum cahaya dinamis.

### Format & Spesifikasi:
- **Source Blender Files**: Lengkap dengan material dispersion shader and lighting rig.
- **8K Alpha Renders**: 7680x4320 PNG transparan untuk hero background website tanpa perlu 3D rendering lagi.
- **Optimized WebGL GLB**: Model low-poly dengan baked lighting untuk integrasi Three.js.`,
    tags: ['3D Art', 'Cinema4D', 'Octane', 'Abstract', 'Wallpapers', 'Glass'],
    demoUrl: 'https://prism-glass.art',
    ratingAvg: '4.89',
    ratingCount: 32,
    downloadCount: 104,
    viewCount: 580,
    status: 'approved',
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    title: 'Neo-Tokyo Cyber Hovercraft 3D Vehicle',
    slug: 'neo-tokyo-cyber-hovercraft-3d',
    categorySlug: '3d-models',
    assetType: '3d_model',
    price: '460000.00',
    discountPrice: null,
    sellerEmail: 'kai.takahashi@neoform3d.art',
    shortDescription: 'Futuristic anti-gravity patrol craft with animated thrusters, cockpit interior, and Unreal Engine 5 blueprint.',
    description: `Model 3D hovercraft patroli masa depan bergaya neo-Tokyo cyberpunk dengan interior kokpit berdetail tinggi dan animasi baling-baling magnetik.

### Fitur Spesifikasi:
- **High & Low Poly Meshes**: 45k triangle game mesh dan 450k cinematic hero mesh.
- **PBR Texturing**: 4 set texture UDIM 4K (Cockpit, Body, Engines, Weapons).
- **UE5 & Blender Asset**: Termasuk control rig untuk pintu kokpit dan vector thrusters.`,
    tags: ['Sci-Fi', 'Vehicle', '3D Model', 'Blender', 'Game Asset', 'PBR'],
    demoUrl: 'https://hovercraft-neo.render',
    ratingAvg: '4.95',
    ratingCount: 24,
    downloadCount: 76,
    viewCount: 510,
    status: 'approved',
    imageUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1200&q=80',
    ],
  },

  // ─── 4. Graphics & Vector Kits ──────────────────────────────────────────
  {
    title: 'Aura Modern Serif & Display Typography Kit',
    slug: 'aura-display-typography-kit',
    categorySlug: 'graphics-vectors',
    assetType: 'graphic',
    price: '185000.00',
    discountPrice: null,
    sellerEmail: 'david.chen@typovault.com',
    shortDescription: 'Font display serif kontemporer lengkap dengan ligatur elegan, alternate glyphs, dan brand assets.',
    description: `Aura adalah typeface serif bernuansa haute-couture yang dirancang khusus untuk editorial headline, monogram branding, dan packaging mewah.

### Detail Font:
- **6 Weights**: Thin, Light, Regular, Medium, SemiBold, Bold.
- **OpenType Features**: 90+ custom ligatures, stylistic alternates, old-style numerals.
- **Multilingual Support**: Mendukung lebih dari 80 bahasa beraksara Latin.
- **Bonus Assets**: 12 poster layout templates (Adobe Illustrator & SVG).`,
    tags: ['Typography', 'Fonts', 'Branding', 'Editorial', 'Vectors', 'OTF'],
    demoUrl: 'https://aura-foundry.type',
    ratingAvg: '5.00',
    ratingCount: 27,
    downloadCount: 108,
    viewCount: 490,
    status: 'approved',
    imageUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    title: 'Obsidian Minimalist Vector Iconography (1,200+ Icons)',
    slug: 'obsidian-minimalist-vector-icons',
    categorySlug: 'graphics-vectors',
    assetType: 'graphic',
    price: '150000.00',
    discountPrice: '99000.00',
    sellerEmail: 'david.chen@typovault.com',
    shortDescription: 'Over 1,200 precision pixel-snapped vector icons across 24 categories in outlined and solid variants.',
    description: `Koleksi 1.200+ ikon vektor presisi tinggi dengan grid 24px pixel-perfect.

### Format & Kelengkapan:
- **Dua Gaya**: Stroke 1.5px (Outlined) dan Solid (Filled).
- **Format Lengkap**: Clean SVG, Figma Component Library, React & Vue Icon Components.
- **Kategori Terstruktur**: Finansial, E-Commerce, Navigasi, Interface, Media, dan Keamanan.`,
    tags: ['Icons', 'SVG', 'Figma', 'Vector', 'Design System', 'UI Icons'],
    demoUrl: 'https://obsidian-icons.design',
    ratingAvg: '4.90',
    ratingCount: 72,
    downloadCount: 375,
    viewCount: 1980,
    status: 'approved',
    imageUrl: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    title: 'Solstice Abstract Geometric Vector Patterns & Gradients',
    slug: 'solstice-geometric-vector-patterns',
    categorySlug: 'graphics-vectors',
    assetType: 'graphic',
    price: '175000.00',
    discountPrice: '125000.00',
    sellerEmail: 'david.chen@typovault.com',
    shortDescription: '40 bespoke fluid mesh gradients, iridescent grain textures, and isometric geometric vector badges.',
    description: `Koleksi 40 latar belakang geometris abstrak dan tekstur gradasi iridescent beresolusi tinggi untuk branding dan presentasi produk.

### Isi Paket Desain:
- **40 Scalable Vector Files**: File Adobe Illustrator (.AI) dan SVG murni tanpa pixelation.
- **Ultra-Res Exports**: 6000x4000 JPG & PNG dengan overlay noise film organik.
- **Figma Gradient Palette**: Preset style library yang siap disalin ke proyek desain Anda.`,
    tags: ['Vector', 'Gradients', 'Abstract', 'Textures', 'Backgrounds', 'SVG'],
    demoUrl: 'https://solstice-vectors.art',
    ratingAvg: '4.88',
    ratingCount: 31,
    downloadCount: 95,
    viewCount: 540,
    status: 'approved',
    imageUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1614854262318-831574f15f1f?auto=format&fit=crop&w=1200&q=80',
    ],
  },

  // ─── 5. Audio & Sound Effects ───────────────────────────────────────────
  {
    title: 'Cinematic Ambient Soundscapes & UI Audio Suite',
    slug: 'cinematic-ambient-soundscapes-audio',
    categorySlug: 'audio-sound',
    assetType: 'audio',
    price: '220000.00',
    discountPrice: '175000.00',
    sellerEmail: 'sarah.jenkins@monolithaudio.co',
    shortDescription: 'Royalty-free cinematic atmospheric soundscapes, trailer hits, and UI micro-interaction sound effects.',
    description: `Suite audio premium yang menggabungkan soundscape sinematik atmosferik dengan efek suara mikro-interaksi UI modern.

### Komposisi Paket:
- **40 Atmospheric Soundscapes**: Kualitas rekaman studio 96kHz / 24-bit lossless WAV.
- **120 UI Sound Effects**: Chimes, clicks, success alerts, and subtle hover cues.
- **Royalty-Free Commercial License**: Aman untuk penggunaan aplikasi komersial, game, dan video streaming.`,
    tags: ['Audio', 'SFX', 'Soundtracks', 'Cinematic', 'WAV 96kHz', 'Music'],
    demoUrl: 'https://cinematic-audio.sound',
    ratingAvg: '4.85',
    ratingCount: 29,
    downloadCount: 78,
    viewCount: 440,
    status: 'approved',
    imageUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    title: 'Elysium Orchestral Trailer & Epic Hybrid Sound Pack',
    slug: 'elysium-orchestral-trailer-sound',
    categorySlug: 'audio-sound',
    assetType: 'audio',
    price: '310000.00',
    discountPrice: null,
    sellerEmail: 'sarah.jenkins@monolithaudio.co',
    shortDescription: 'Original epic hybrid orchestral stems, braam hits, risers, and sub drops mixed for film and game trailers.',
    description: `Paket musik orkestra sinematik epik dengan aransemen alat gesek megah berpadu dengan bass synthesizer modular masa kini.

### Komposisi Rekaman:
- **15 Full Trailer Themes**: Disediakan dalam format master track dan individual stem tracks (Strings, Brass, Drums, Synths).
- **60 Cinematic Trailer Impacts**: Sub-booms, heavy braams, metallic risers, dan whoosh transitions.
- **Lossless Audio**: 24-bit 48kHz WAV siap di-import langsung ke DaVinci Resolve, Premiere Pro, dan Unreal Engine.`,
    tags: ['Orchestral', 'Trailer', 'Music', 'Lossless', 'Cinematic', 'Epic'],
    demoUrl: 'https://elysium-sound.media',
    ratingAvg: '4.96',
    ratingCount: 19,
    downloadCount: 54,
    viewCount: 380,
    status: 'approved',
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80',
    ],
  },

  // ─── 6. Special Status Demo Assets (Pending & Rejected for Admin/Seller) ─
  {
    title: 'Velvet Mirage 3D Architectural Scene',
    slug: 'velvet-mirage-3d-scene',
    categorySlug: '3d-models',
    assetType: '3d_model',
    price: '310000.00',
    discountPrice: null,
    sellerEmail: 'seller@assetmarket.com',
    shortDescription: 'Visualisasi arsitektur villa minimalis kontemporer dengan pencahayaan senja dramatis.',
    description: `Adegan visualisasi arsitektur lengkap dengan lanskap kolam renang infinity dan interior modern minimalis. Format Blender Cycles dan GLTF.`,
    tags: ['Architecture', 'Blender', 'Photoreal', 'Needs Revision'],
    demoUrl: 'https://velvet-mirage.render',
    ratingAvg: '0.00',
    ratingCount: 0,
    downloadCount: 0,
    viewCount: 15,
    status: 'rejected',
    rejectionReason: 'Berkas deliverable belum menyertakan file lisensi komersial dan format dokumentasi lisensi perlu diperbaiki.',
    imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    title: 'Nebula Real-Time Audio Reactive Shaders',
    slug: 'nebula-audio-reactive-shaders',
    categorySlug: 'source-code',
    assetType: 'source_code',
    price: '260000.00',
    discountPrice: '195000.00',
    sellerEmail: 'seller@assetmarket.com',
    shortDescription: 'GLSL / WebGL audio-reactive visualizers with Bloom, chromatic aberration, and MIDI controller inputs.',
    description: `Shader visualisasi audio waktu nyata dengan komputasi GPU cepat menggunakan Three.js dan GLSL post-processing effects. Menunggu persetujuan tim kurator admin.`,
    tags: ['WebGL', 'GLSL', 'Shaders', 'Three.js', 'Audio Reactive'],
    demoUrl: 'https://nebula-shaders.dev',
    ratingAvg: '0.00',
    ratingCount: 0,
    downloadCount: 0,
    viewCount: 22,
    status: 'pending',
    imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80',
    ],
  },
];

// =========================================================================
// 3. MAIN SEED RUNNER
// =========================================================================

async function runSeed() {
  console.log('\n=============================================');
  console.log('🌱 Starting Pure High-Craft Demo Seeding');
  console.log('=============================================\n');

  ensureUploadDirs();
  const rootUploads = getUploadsRootDir();
  const thumbDir = path.join(rootUploads, 'thumbnails');
  const filesDir = path.join(rootUploads, 'files');
  const paymentsDir = path.join(rootUploads, 'payments');

  await fs.mkdir(thumbDir, { recursive: true });
  await fs.mkdir(filesDir, { recursive: true });
  await fs.mkdir(paymentsDir, { recursive: true });

  const VALID_SLUGS = SEED_ASSETS.map((a) => a.slug);
  const CORE_EMAILS = ALL_SEED_ACCOUNTS.map((a) => a.email);

  try {
    // ---------------------------------------------------------------------
    // STEP 0: Purge Stale / Test Accounts & Orphaned Assets
    // ---------------------------------------------------------------------
    console.log('🧹 [0/5] Purging Stale Non-Demo Users & Non-Demo Assets...');

    // 0.1 Clean up junk assets not in our curated list
    const junkAssets = await db
      .select({ id: assets.id, slug: assets.slug })
      .from(assets)
      .where(notInArray(assets.slug, VALID_SLUGS));

    if (junkAssets.length > 0) {
      const junkAssetIds = junkAssets.map((j) => j.id);
      console.log(`Found ${junkAssetIds.length} non-curated assets to remove...`);

      const junkTxItems = await db
        .select({ id: transactionItems.id, transactionId: transactionItems.transactionId })
        .from(transactionItems)
        .where(inArray(transactionItems.assetId, junkAssetIds));

      if (junkTxItems.length > 0) {
        const txIds = [...new Set(junkTxItems.map((t) => t.transactionId))];
        const txItemIds = junkTxItems.map((t) => t.id);

        await db.delete(paymentConfirmations).where(inArray(paymentConfirmations.transactionId, txIds));
        await db.delete(revenueLedger).where(inArray(revenueLedger.transactionId, txIds));
        await db.delete(revenueLedger).where(inArray(revenueLedger.transactionItemId, txItemIds));
        await db.delete(transactionItems).where(inArray(transactionItems.id, txItemIds));
        await db.delete(transactions).where(inArray(transactions.id, txIds));
      }

      await db.delete(cartItems).where(inArray(cartItems.assetId, junkAssetIds));
      await db.delete(assetFiles).where(inArray(assetFiles.assetId, junkAssetIds));
      await db.delete(assets).where(inArray(assets.id, junkAssetIds));
      console.log(`✓ Purged ${junkAssets.length} non-curated assets.`);
    }

    // 0.2 Clean up old non-demo users (e.g. leftover test accounts from CI suites)
    const allExistingUsers = await db.select({ id: users.id, email: users.email }).from(users);
    const staleUsers = allExistingUsers.filter((u) => !CORE_EMAILS.includes(u.email));

    if (staleUsers.length > 0) {
      const staleUserIds = staleUsers.map((u) => u.id);
      console.log(`Found ${staleUsers.length} non-demo users to remove...`);

      // Delete carts and cart items for stale users
      const staleCarts = await db.select({ id: carts.id }).from(carts).where(inArray(carts.userId, staleUserIds));
      if (staleCarts.length > 0) {
        const cartIds = staleCarts.map((c) => c.id);
        await db.delete(cartItems).where(inArray(cartItems.cartId, cartIds));
        await db.delete(carts).where(inArray(carts.id, cartIds));
      }

      // Delete transactions where buyer is a stale user
      const staleTxs = await db
        .select({ id: transactions.id })
        .from(transactions)
        .where(inArray(transactions.buyerId, staleUserIds));

      if (staleTxs.length > 0) {
        const txIds = staleTxs.map((t) => t.id);
        const txItems = await db
          .select({ id: transactionItems.id })
          .from(transactionItems)
          .where(inArray(transactionItems.transactionId, txIds));
        const txItemIds = txItems.map((i) => i.id);

        await db.delete(paymentConfirmations).where(inArray(paymentConfirmations.transactionId, txIds));
        await db.delete(revenueLedger).where(inArray(revenueLedger.transactionId, txIds));
        if (txItemIds.length > 0) {
          await db.delete(revenueLedger).where(inArray(revenueLedger.transactionItemId, txItemIds));
        }
        await db.delete(transactionItems).where(inArray(transactionItems.transactionId, txIds));
        await db.delete(transactions).where(inArray(transactions.id, txIds));
      }

      // Delete revenue ledger entries for stale users
      await db.delete(revenueLedger).where(inArray(revenueLedger.userId, staleUserIds));
      await db.delete(paymentConfirmations).where(inArray(paymentConfirmations.userId, staleUserIds));
      await db.delete(adminActions).where(inArray(adminActions.adminId, staleUserIds));

      // Delete any assets owned by stale users
      const staleAssets = await db.select({ id: assets.id }).from(assets).where(inArray(assets.sellerId, staleUserIds));
      if (staleAssets.length > 0) {
        const staleAssetIds = staleAssets.map((a) => a.id);
        await db.delete(cartItems).where(inArray(cartItems.assetId, staleAssetIds));
        await db.delete(assetFiles).where(inArray(assetFiles.assetId, staleAssetIds));
        await db.delete(assets).where(inArray(assets.id, staleAssetIds));
      }

      // Finally delete the stale users
      await db.delete(users).where(inArray(users.id, staleUserIds));
      console.log(`✓ Purged ${staleUsers.length} non-demo user accounts.`);
    } else {
      console.log('✓ No non-demo users detected.');
    }

    // 0.3 Clean up corrupted or dummy files (< 1000 bytes) on disk
    if (fsSync.existsSync(thumbDir)) {
      const tFiles = fsSync.readdirSync(thumbDir);
      let removedThumbCount = 0;
      for (const f of tFiles) {
        const p = path.join(thumbDir, f);
        try {
          const s = fsSync.statSync(p);
          if (s.size < 1000) {
            fsSync.unlinkSync(p);
            removedThumbCount++;
          }
        } catch {}
      }
      if (removedThumbCount > 0) {
        console.log(`✓ Removed ${removedThumbCount} corrupted/dummy thumbnails (< 1000 bytes) from disk.`);
      }
    }

    // ---------------------------------------------------------------------
    // STEP 1: Synchronize Demo & Creator Accounts
    // ---------------------------------------------------------------------
    console.log('\n👤 [1/5] Synchronizing Core Demo & Verified Creator Accounts...');
    const userMap: Record<string, string> = {};

    for (const account of ALL_SEED_ACCOUNTS) {
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.email, account.email))
        .limit(1);

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(account.passwordRaw, salt);

      if (existing) {
        const [updated] = await db
          .update(users)
          .set({
            name: account.name,
            passwordHash,
            role: account.role,
            isVerifiedSeller: account.isVerifiedSeller,
            avatarUrl: account.avatarUrl || null,
            phone: account.phone || null,
            bio: account.bio || null,
            bankName: account.bankName || null,
            bankAccountNumber: account.bankAccountNumber || null,
            bankAccountHolder: account.bankAccountHolder || null,
            bankBranch: account.bankBranch || null,
            deletedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(users.email, account.email))
          .returning();

        userMap[account.email] = updated ? updated.id : existing.id;
      } else {
        const [created] = await db
          .insert(users)
          .values({
            name: account.name,
            email: account.email,
            passwordHash,
            role: account.role,
            isVerifiedSeller: account.isVerifiedSeller,
            avatarUrl: account.avatarUrl || null,
            phone: account.phone || null,
            bio: account.bio || null,
            bankName: account.bankName || null,
            bankAccountNumber: account.bankAccountNumber || null,
            bankAccountHolder: account.bankAccountHolder || null,
            bankBranch: account.bankBranch || null,
          })
          .returning();

        if (created) {
          userMap[account.email] = created.id;
        }
      }
    }
    console.log(`✓ Synchronized ${ALL_SEED_ACCOUNTS.length} verified demo and creator accounts.`);

    // ---------------------------------------------------------------------
    // STEP 2: Synchronize Marketplace Categories
    // ---------------------------------------------------------------------
    console.log('\n📁 [2/5] Synchronizing Marketplace Categories...');
    const categoryMap: Record<string, string> = {};

    for (const cat of DEFAULT_CATEGORIES) {
      const [existingCat] = await db
        .select()
        .from(categories)
        .where(eq(categories.slug, cat.slug))
        .limit(1);

      if (existingCat) {
        await db
          .update(categories)
          .set({
            name: cat.name,
            description: cat.description,
            iconUrl: cat.iconUrl,
            sortOrder: cat.sortOrder,
            isActive: true,
            deletedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(categories.slug, cat.slug));
        categoryMap[cat.slug] = existingCat.id;
      } else {
        const [createdCat] = await db
          .insert(categories)
          .values({
            name: cat.name,
            slug: cat.slug,
            description: cat.description,
            iconUrl: cat.iconUrl,
            sortOrder: cat.sortOrder,
            isActive: true,
          })
          .returning();
        if (createdCat) {
          categoryMap[cat.slug] = createdCat.id;
        }
      }
    }
    console.log(`✓ Synchronized ${DEFAULT_CATEGORIES.length} default categories.`);

    // ---------------------------------------------------------------------
    // STEP 3: Seed Pristine Demo Assets
    // ---------------------------------------------------------------------
    console.log('\n💎 [3/5] Seeding Pure Curated Demo Assets & Physical Files...');
    const assetMap: Record<string, string> = {};
    let assetIdx = 0;

    for (const def of SEED_ASSETS) {
      assetIdx++;
      const rawSellerId = userMap[def.sellerEmail] ?? userMap['seller@assetmarket.com'];
      const rawCategoryId = categoryMap[def.categorySlug];

      if (!rawSellerId || !rawCategoryId) continue;

      const sellerId: string = rawSellerId;
      const categoryId: string = rawCategoryId;

      // Ensure local thumbnail on disk
      const thumbDiskFileName = `${def.slug}-thumb.png`;
      const thumbDiskPath = path.join(thumbDir, thumbDiskFileName);
      await ensureLocalFile(thumbDiskPath, def.imageUrl, 800, 500, assetIdx);

      // Ensure local preview images on disk
      const previewDiskPaths: string[] = [];
      let pIdx = 0;
      for (const pUrl of def.previewImages) {
        pIdx++;
        const previewDiskFileName = `${def.slug}-preview-${pIdx}.png`;
        const previewDiskPath = path.join(thumbDir, previewDiskFileName);
        await ensureLocalFile(previewDiskPath, pUrl, 1200, 800, assetIdx + pIdx);
        previewDiskPaths.push(`/uploads/thumbnails/${previewDiskFileName}`);
      }

      // Save deliverable zip on disk
      const deliverableFileName = `${def.slug}-package.zip`;
      const deliverableDiskPath = path.join(filesDir, deliverableFileName);
      const zipBuffer = createSampleZip(def.title, def.assetType, def.sellerEmail);
      await fs.writeFile(deliverableDiskPath, zipBuffer);
      const fileSha256 = crypto.createHash('sha256').update(zipBuffer).digest('hex');

      // Canonical URLs served statically via backend /uploads
      const thumbnailUrl = `/uploads/thumbnails/${thumbDiskFileName}`;
      const previewImages = previewDiskPaths.length > 0 ? previewDiskPaths : [thumbnailUrl];

      const [existingAsset] = await db
        .select()
        .from(assets)
        .where(eq(assets.slug, def.slug))
        .limit(1);

      let assetId: string;

      if (existingAsset) {
        const [updatedAsset] = await db
          .update(assets)
          .set({
            sellerId,
            categoryId,
            title: def.title,
            shortDescription: def.shortDescription,
            description: def.description,
            assetType: def.assetType,
            status: def.status,
            rejectionReason: def.rejectionReason || null,
            price: def.price,
            discountPrice: def.discountPrice || null,
            thumbnailUrl,
            previewImages,
            demoUrl: def.demoUrl || null,
            tags: def.tags,
            ratingAvg: def.ratingAvg,
            ratingCount: def.ratingCount,
            downloadCount: def.downloadCount,
            viewCount: def.viewCount,
            deletedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(assets.id, existingAsset.id))
          .returning();
        assetId = updatedAsset ? updatedAsset.id : existingAsset.id;
      } else {
        const [createdAsset] = await db
          .insert(assets)
          .values({
            sellerId,
            categoryId,
            title: def.title,
            slug: def.slug,
            shortDescription: def.shortDescription,
            description: def.description,
            assetType: def.assetType,
            status: def.status,
            rejectionReason: def.rejectionReason || null,
            price: def.price,
            discountPrice: def.discountPrice || null,
            currency: 'IDR',
            thumbnailUrl,
            previewImages,
            demoUrl: def.demoUrl || null,
            tags: def.tags,
            ratingAvg: def.ratingAvg,
            ratingCount: def.ratingCount,
            downloadCount: def.downloadCount,
            viewCount: def.viewCount,
          })
          .returning();

        if (!createdAsset) {
          throw new Error(`Failed to create asset ${def.title}`);
        }
        assetId = createdAsset.id;
      }

      assetMap[def.slug] = assetId;

      // Link deliverable in asset_files
      const [existingFile] = await db
        .select()
        .from(assetFiles)
        .where(eq(assetFiles.assetId, assetId))
        .limit(1);

      if (existingFile) {
        await db
          .update(assetFiles)
          .set({
            fileName: deliverableFileName,
            fileKey: `files/${deliverableFileName}`,
            fileSizeBytes: zipBuffer.length,
            mimeType: 'application/zip',
            fileExtension: 'zip',
            version: '1.2.0',
            checksumSha256: fileSha256,
            isMain: true,
            deletedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(assetFiles.id, existingFile.id));
      } else {
        await db.insert(assetFiles).values({
          assetId,
          fileName: deliverableFileName,
          fileKey: `files/${deliverableFileName}`,
          fileSizeBytes: zipBuffer.length,
          mimeType: 'application/zip',
          fileExtension: 'zip',
          version: '1.2.0',
          checksumSha256: fileSha256,
          isMain: true,
        });
      }

      const priceLabel = Number(def.price) === 0 ? 'FREE' : `Rp ${Number(def.price).toLocaleString('id-ID')}`;
      console.log(`  ✓ [${def.status.toUpperCase()}] ${def.title} (${priceLabel})`);
    }

    console.log(`✓ Processed ${SEED_ASSETS.length} curated demo assets.`);

    // ---------------------------------------------------------------------
    // STEP 4: Seed Transactions & Creator Revenue Settlements
    // ---------------------------------------------------------------------
    console.log('\n💳 [4/5] Synchronizing Verified Transactions & 60/40 Revenue...');

    // Generate 7 authentic luxury payment receipts
    const receiptFiles = [
      'receipt-seed-01.jpg',
      'receipt-seed-02.jpg',
      'receipt-seed-03.jpg',
      'receipt-seed-04.jpg',
      'receipt-seed-05.jpg',
      'receipt-seed-06.jpg',
      'receipt-seed-07.jpg',
    ];

    for (let rIdx = 0; rIdx < receiptFiles.length; rIdx++) {
      const rPath = path.join(paymentsDir, receiptFiles[rIdx]!);
      await fs.writeFile(rPath, createLuxuryEditorialPng(600, 800, rIdx));
    }

    const rawBuyerId = userMap['user@assetmarket.com'];
    const rawDemoSellerId = userMap['seller@assetmarket.com'];
    const rawElenaId = userMap['elena.rostova@studiovortex.io'];
    const rawKaiId = userMap['kai.takahashi@neoform3d.art'];
    const rawAdminId = userMap['admin@assetmarket.com'];

    if (!rawBuyerId || !rawDemoSellerId || !rawAdminId) {
      throw new Error('Required demo accounts were not created properly.');
    }

    const userBuyerId: string = rawBuyerId;
    const demoSellerId: string = rawDemoSellerId;
    const elenaSellerId: string = rawElenaId || demoSellerId;
    const kaiSellerId: string = rawKaiId || demoSellerId;
    const adminModeratorId: string = rawAdminId;

    const SEED_INVOICES = [
      'INV-20261001-A101',
      'INV-20261002-B202',
      'INV-20261003-C303',
      'INV-20261004-D404',
      'INV-20261005-E505',
      'INV-20261006-F606',
      'INV-20261007-G707',
    ];

    // Delete any old transactions with these invoices to ensure clean re-seeding
    const oldTxs = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(inArray(transactions.invoiceNumber, SEED_INVOICES));

    if (oldTxs.length > 0) {
      const oldTxIds = oldTxs.map((t) => t.id);
      const oldItems = await db
        .select({ id: transactionItems.id })
        .from(transactionItems)
        .where(inArray(transactionItems.transactionId, oldTxIds));
      const oldItemIds = oldItems.map((i) => i.id);

      await db.delete(paymentConfirmations).where(inArray(paymentConfirmations.transactionId, oldTxIds));
      await db.delete(revenueLedger).where(inArray(revenueLedger.transactionId, oldTxIds));
      if (oldItemIds.length > 0) {
        await db.delete(revenueLedger).where(inArray(revenueLedger.transactionItemId, oldItemIds));
      }
      await db.delete(transactionItems).where(inArray(transactionItems.transactionId, oldTxIds));
      await db.delete(transactions).where(inArray(transactions.id, oldTxIds));
    }

    // Clear previous withdrawals for clean balance calculation
    await db
      .delete(revenueLedger)
      .where(and(eq(revenueLedger.userId, demoSellerId), eq(revenueLedger.entryType, 'withdrawal')));

    // ─── 4.1 Tx 1: Atelier Noir Editorial Design System ───────────────────
    const asset1Id = assetMap['atelier-noir-editorial-design-system'];
    if (asset1Id) {
      const [tx1] = await db
        .insert(transactions)
        .values({
          invoiceNumber: 'INV-20261001-A101',
          buyerId: userBuyerId,
          subtotal: '275000.00',
          taxAmount: '0.00',
          totalAmount: '275000.00',
          status: 'paid',
          paymentMethod: 'bank_transfer',
          paidAt: new Date(Date.now() - 5 * 86400000),
          notes: 'BCA Virtual Account settlement verified.',
        })
        .returning();

      if (tx1) {
        const [item1] = await db
          .insert(transactionItems)
          .values({
            transactionId: tx1.id,
            assetId: asset1Id,
            sellerId: demoSellerId,
            price: '275000.00',
            sellerRatePercent: '60.00',
            platformRatePercent: '40.00',
            sellerAmount: '165000.00',
            platformAmount: '110000.00',
            licenseType: 'commercial',
          })
          .returning();

        await db.insert(paymentConfirmations).values({
          transactionId: tx1.id,
          userId: userBuyerId,
          senderBank: 'Bank Central Asia (BCA)',
          senderAccountNumber: '5270918234',
          senderAccountName: 'Demo User',
          destinationBank: 'Bank Central Asia (BCA) - Asset Market',
          transferAmount: '275000.00',
          transferDate: new Date(Date.now() - 5 * 86400000),
          proofImageUrl: '/uploads/payments/receipt-seed-01.jpg',
          status: 'verified',
          verifiedBy: adminModeratorId,
          verifiedAt: new Date(Date.now() - 5 * 86400000 + 3600000),
        });

        if (item1) {
          await db.insert(revenueLedger).values({
            userId: demoSellerId,
            transactionId: tx1.id,
            transactionItemId: item1.id,
            entryType: 'sale_earning',
            grossAmount: '275000.00',
            platformFee: '110000.00',
            netAmount: '165000.00',
            balanceAfter: '165000.00',
            description: 'Bagi hasil penjualan aset (60% kreator): "Atelier Noir Editorial Design System"',
            createdAt: new Date(Date.now() - 5 * 86400000 + 3600000),
          });
        }
      }
    }

    // ─── 4.2 Tx 2: Chronos High-Frequency Trading Core ────────────────────
    const asset2Id = assetMap['chronos-trading-engine'];
    if (asset2Id) {
      const [tx2] = await db
        .insert(transactions)
        .values({
          invoiceNumber: 'INV-20261002-B202',
          buyerId: userBuyerId,
          subtotal: '599000.00',
          taxAmount: '0.00',
          totalAmount: '599000.00',
          status: 'paid',
          paymentMethod: 'bank_transfer',
          paidAt: new Date(Date.now() - 4 * 86400000),
          notes: 'Bank Mandiri online transfer verified.',
        })
        .returning();

      if (tx2) {
        const [item2] = await db
          .insert(transactionItems)
          .values({
            transactionId: tx2.id,
            assetId: asset2Id,
            sellerId: demoSellerId,
            price: '599000.00',
            sellerRatePercent: '60.00',
            platformRatePercent: '40.00',
            sellerAmount: '359400.00',
            platformAmount: '239600.00',
            licenseType: 'commercial',
          })
          .returning();

        await db.insert(paymentConfirmations).values({
          transactionId: tx2.id,
          userId: userBuyerId,
          senderBank: 'Bank Mandiri',
          senderAccountNumber: '141009871234',
          senderAccountName: 'Demo User',
          destinationBank: 'Bank Central Asia (BCA) - Asset Market',
          transferAmount: '599000.00',
          transferDate: new Date(Date.now() - 4 * 86400000),
          proofImageUrl: '/uploads/payments/receipt-seed-02.jpg',
          status: 'verified',
          verifiedBy: adminModeratorId,
          verifiedAt: new Date(Date.now() - 4 * 86400000 + 1800000),
        });

        if (item2) {
          await db.insert(revenueLedger).values({
            userId: demoSellerId,
            transactionId: tx2.id,
            transactionItemId: item2.id,
            entryType: 'sale_earning',
            grossAmount: '599000.00',
            platformFee: '239600.00',
            netAmount: '359400.00',
            balanceAfter: '524400.00',
            description: 'Bagi hasil penjualan aset (60% kreator): "Chronos High-Frequency Trading Core"',
            createdAt: new Date(Date.now() - 4 * 86400000 + 1800000),
          });
        }
      }
    }

    // ─── 4.3 Tx 3: Vogue & Velvet 3D Spatial Interior Pack ────────────────
    const asset3Id = assetMap['vogue-velvet-3d-interior'];
    if (asset3Id) {
      const [tx3] = await db
        .insert(transactions)
        .values({
          invoiceNumber: 'INV-20261003-C303',
          buyerId: userBuyerId,
          subtotal: '320000.00',
          taxAmount: '0.00',
          totalAmount: '320000.00',
          status: 'paid',
          paymentMethod: 'bank_transfer',
          paidAt: new Date(Date.now() - 3 * 86400000),
          notes: 'BNI Mobile transfer verified.',
        })
        .returning();

      if (tx3) {
        const [item3] = await db
          .insert(transactionItems)
          .values({
            transactionId: tx3.id,
            assetId: asset3Id,
            sellerId: demoSellerId,
            price: '320000.00',
            sellerRatePercent: '60.00',
            platformRatePercent: '40.00',
            sellerAmount: '192000.00',
            platformAmount: '128000.00',
            licenseType: 'commercial',
          })
          .returning();

        await db.insert(paymentConfirmations).values({
          transactionId: tx3.id,
          userId: userBuyerId,
          senderBank: 'Bank Negara Indonesia (BNI)',
          senderAccountNumber: '0388912389',
          senderAccountName: 'Demo User',
          destinationBank: 'Bank Central Asia (BCA) - Asset Market',
          transferAmount: '320000.00',
          transferDate: new Date(Date.now() - 3 * 86400000),
          proofImageUrl: '/uploads/payments/receipt-seed-03.jpg',
          status: 'verified',
          verifiedBy: adminModeratorId,
          verifiedAt: new Date(Date.now() - 3 * 86400000 + 2400000),
        });

        if (item3) {
          await db.insert(revenueLedger).values({
            userId: demoSellerId,
            transactionId: tx3.id,
            transactionItemId: item3.id,
            entryType: 'sale_earning',
            grossAmount: '320000.00',
            platformFee: '128000.00',
            netAmount: '192000.00',
            balanceAfter: '716400.00',
            description: 'Bagi hasil penjualan aset (60% kreator): "Vogue & Velvet 3D Spatial Interior Pack"',
            createdAt: new Date(Date.now() - 3 * 86400000 + 2400000),
          });
        }
      }
    }

    // ─── 4.4 Tx 4: Zenith Mobile Banking UI Kit ───────────────────────────
    const asset4Id = assetMap['zenith-mobile-banking-ui-kit'];
    if (asset4Id) {
      const [tx4] = await db
        .insert(transactions)
        .values({
          invoiceNumber: 'INV-20261004-D404',
          buyerId: userBuyerId,
          subtotal: '295000.00',
          taxAmount: '0.00',
          totalAmount: '295000.00',
          status: 'paid',
          paymentMethod: 'bank_transfer',
          paidAt: new Date(Date.now() - 2 * 86400000),
          notes: 'BCA QRIS settlement verified.',
        })
        .returning();

      if (tx4) {
        const [item4] = await db
          .insert(transactionItems)
          .values({
            transactionId: tx4.id,
            assetId: asset4Id,
            sellerId: demoSellerId,
            price: '295000.00',
            sellerRatePercent: '60.00',
            platformRatePercent: '40.00',
            sellerAmount: '177000.00',
            platformAmount: '118000.00',
            licenseType: 'commercial',
          })
          .returning();

        await db.insert(paymentConfirmations).values({
          transactionId: tx4.id,
          userId: userBuyerId,
          senderBank: 'Bank Central Asia (BCA)',
          senderAccountNumber: '5270918234',
          senderAccountName: 'Demo User',
          destinationBank: 'Bank Central Asia (BCA) - Asset Market',
          transferAmount: '295000.00',
          transferDate: new Date(Date.now() - 2 * 86400000),
          proofImageUrl: '/uploads/payments/receipt-seed-04.jpg',
          status: 'verified',
          verifiedBy: adminModeratorId,
          verifiedAt: new Date(Date.now() - 2 * 86400000 + 1200000),
        });

        if (item4) {
          await db.insert(revenueLedger).values({
            userId: demoSellerId,
            transactionId: tx4.id,
            transactionItemId: item4.id,
            entryType: 'sale_earning',
            grossAmount: '295000.00',
            platformFee: '118000.00',
            netAmount: '177000.00',
            balanceAfter: '893400.00',
            description: 'Bagi hasil penjualan aset (60% kreator): "Zenith Mobile Banking & Digital Wallet UI Kit"',
            createdAt: new Date(Date.now() - 2 * 86400000 + 1200000),
          });
        }

        // Payout withdrawal entry for Demo Seller
        await db.insert(revenueLedger).values({
          userId: demoSellerId,
          entryType: 'withdrawal',
          grossAmount: '350000.00',
          platformFee: '0.00',
          netAmount: '350000.00',
          balanceAfter: '543400.00',
          description: 'Pencairan dana kreator (Payout) ke Rekening BNI 0388912389 a.n Demo Seller',
          createdAt: new Date(Date.now() - 1 * 86400000),
        });
      }
    }

    // ─── 4.5 Tx 5: Lumina SaaS Dashboard (Sold by Elena Rostova) ──────────
    const asset5Id = assetMap['lumina-saas-dashboard'];
    if (asset5Id) {
      const [tx5] = await db
        .insert(transactions)
        .values({
          invoiceNumber: 'INV-20261005-E505',
          buyerId: userBuyerId,
          subtotal: '390000.00',
          taxAmount: '0.00',
          totalAmount: '390000.00',
          status: 'paid',
          paymentMethod: 'bank_transfer',
          paidAt: new Date(Date.now() - 1 * 86400000),
          notes: 'Bank Mandiri online transfer verified.',
        })
        .returning();

      if (tx5) {
        const [item5] = await db
          .insert(transactionItems)
          .values({
            transactionId: tx5.id,
            assetId: asset5Id,
            sellerId: elenaSellerId,
            price: '390000.00',
            sellerRatePercent: '60.00',
            platformRatePercent: '40.00',
            sellerAmount: '234000.00',
            platformAmount: '156000.00',
            licenseType: 'commercial',
          })
          .returning();

        await db.insert(paymentConfirmations).values({
          transactionId: tx5.id,
          userId: userBuyerId,
          senderBank: 'Bank Central Asia (BCA)',
          senderAccountNumber: '5270918234',
          senderAccountName: 'Demo User',
          destinationBank: 'Bank Central Asia (BCA) - Asset Market',
          transferAmount: '390000.00',
          transferDate: new Date(Date.now() - 1 * 86400000),
          proofImageUrl: '/uploads/payments/receipt-seed-05.jpg',
          status: 'verified',
          verifiedBy: adminModeratorId,
          verifiedAt: new Date(Date.now() - 1 * 86400000 + 3600000),
        });

        if (item5) {
          await db.insert(revenueLedger).values({
            userId: elenaSellerId,
            transactionId: tx5.id,
            transactionItemId: item5.id,
            entryType: 'sale_earning',
            grossAmount: '390000.00',
            platformFee: '156000.00',
            netAmount: '234000.00',
            balanceAfter: '234000.00',
            description: 'Bagi hasil penjualan aset (60% kreator): "Lumina SaaS Dashboard & Admin Component Kit"',
            createdAt: new Date(Date.now() - 1 * 86400000 + 3600000),
          });
        }
      }
    }

    // ─── 4.6 Tx 6: Minimalist Wireframe Freebie ───────────────────────────
    const asset6Id = assetMap['minimalist-wireframe-starter-kit'];
    if (asset6Id) {
      const [tx6] = await db
        .insert(transactions)
        .values({
          invoiceNumber: 'INV-20261006-F606',
          buyerId: userBuyerId,
          subtotal: '0.00',
          taxAmount: '0.00',
          totalAmount: '0.00',
          status: 'paid',
          paymentMethod: 'manual_transfer',
          paidAt: new Date(Date.now() - 12 * 3600000),
          notes: 'Freebie checkout instant settlement.',
        })
        .returning();

      if (tx6) {
        await db.insert(transactionItems).values({
          transactionId: tx6.id,
          assetId: asset6Id,
          sellerId: demoSellerId,
          price: '0.00',
          sellerRatePercent: '60.00',
          platformRatePercent: '40.00',
          sellerAmount: '0.00',
          platformAmount: '0.00',
          licenseType: 'standard',
        });
      }
    }

    // ─── 4.7 Tx 7: Neo-Tokyo Hovercraft (Pending Payment Confirmation) ────
    const asset7Id = assetMap['neo-tokyo-cyber-hovercraft-3d'];
    if (asset7Id) {
      const [tx7] = await db
        .insert(transactions)
        .values({
          invoiceNumber: 'INV-20261007-G707',
          buyerId: userBuyerId,
          subtotal: '460000.00',
          taxAmount: '0.00',
          totalAmount: '460000.00',
          status: 'processing',
          paymentMethod: 'bank_transfer',
          notes: 'Menunggu konfirmasi verifikasi admin.',
        })
        .returning();

      if (tx7) {
        await db.insert(transactionItems).values({
          transactionId: tx7.id,
          assetId: asset7Id,
          sellerId: kaiSellerId,
          price: '460000.00',
          sellerRatePercent: '60.00',
          platformRatePercent: '40.00',
          sellerAmount: '276000.00',
          platformAmount: '184000.00',
          licenseType: 'standard',
        });

        await db.insert(paymentConfirmations).values({
          transactionId: tx7.id,
          userId: userBuyerId,
          senderBank: 'Bank Central Asia (BCA)',
          senderAccountNumber: '5270918234',
          senderAccountName: 'Demo User',
          destinationBank: 'Bank Central Asia (BCA) - Asset Market',
          transferAmount: '460000.00',
          transferDate: new Date(),
          proofImageUrl: '/uploads/payments/receipt-seed-07.jpg',
          status: 'pending',
        });
      }
    }

    console.log('✓ Seeded 7 authentic transactions with payment proofs, freebie orders, and pending review.');

    // ---------------------------------------------------------------------
    // STEP 5: Final Verification Summary
    // ---------------------------------------------------------------------
    console.log('\n📊 [5/5] Final Verification Summary:');
    const [approvedRes] = await db
      .select({ value: count() })
      .from(assets)
      .where(and(eq(assets.status, 'approved'), isNull(assets.deletedAt)));
    const [pendingRes] = await db
      .select({ value: count() })
      .from(assets)
      .where(and(eq(assets.status, 'pending'), isNull(assets.deletedAt)));
    const [rejectedRes] = await db
      .select({ value: count() })
      .from(assets)
      .where(and(eq(assets.status, 'rejected'), isNull(assets.deletedAt)));
    const [totalUsersRes] = await db
      .select({ value: count() })
      .from(users)
      .where(isNull(users.deletedAt));
    const [totalTxsRes] = await db
      .select({ value: count() })
      .from(transactions);

    const approvedCount = Number(approvedRes?.value ?? 0);
    const pendingCount = Number(pendingRes?.value ?? 0);
    const rejectedCount = Number(rejectedRes?.value ?? 0);
    const totalUsersCount = Number(totalUsersRes?.value ?? 0);
    const totalTxsCount = Number(totalTxsRes?.value ?? 0);

    console.log(`• Total Approved Assets in Catalog: ${approvedCount}`);
    console.log(`• Total Pending Assets (Admin Review Queue): ${pendingCount}`);
    console.log(`• Total Rejected Assets: ${rejectedCount}`);
    console.log(`• Total Active Users (Core Demo + Creators): ${totalUsersCount}`);
    console.log(`• Total Transactions Seeded: ${totalTxsCount}`);
    console.log(`• Uploads Directory: ${rootUploads}`);
    console.log('\n✨ Database seeding completed successfully! All assets have valid images.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed with error:', error);
    process.exit(1);
  }
}

runSeed();
