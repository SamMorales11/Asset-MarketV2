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
  cartItems,
} from './schema.js';
import { getUploadsRootDir, ensureUploadDirs } from '../utils/paths.js';

// =========================================================================
// 1. PROCEDURAL ASSET GENERATORS (PNG & ZIP)
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
      const mod = variant % 5;

      if (mod === 0) {
        r = Math.floor(18 + Math.max(0, 1 - distFromCenter * 1.5) * 190);
        g = Math.floor(18 + Math.max(0, 1 - distFromCenter * 1.8) * 55);
        b = Math.floor(24 + Math.max(0, 1 - distFromCenter * 1.6) * 20 + yRatio * 15);
      } else if (mod === 1) {
        r = Math.floor(14 + Math.max(0, 1 - distFromCenter * 1.8) * 20);
        g = Math.floor(20 + Math.max(0, 1 - distFromCenter * 1.5) * 165);
        b = Math.floor(26 + Math.max(0, 1 - distFromCenter * 1.4) * 180);
      } else if (mod === 2) {
        r = Math.floor(22 + Math.max(0, 1 - distFromCenter * 1.6) * 140);
        g = Math.floor(14 + Math.max(0, 1 - distFromCenter * 1.9) * 40);
        b = Math.floor(30 + Math.max(0, 1 - distFromCenter * 1.4) * 190);
      } else if (mod === 3) {
        r = Math.floor(22 + Math.max(0, 1 - distFromCenter * 1.6) * 180);
        g = Math.floor(20 + Math.max(0, 1 - distFromCenter * 1.5) * 150);
        b = Math.floor(24 + Math.max(0, 1 - distFromCenter * 1.8) * 35);
      } else {
        r = Math.floor(24 + Math.max(0, 1 - distFromCenter * 1.6) * 120);
        g = Math.floor(26 + Math.max(0, 1 - distFromCenter * 1.6) * 130);
        b = Math.floor(32 + Math.max(0, 1 - distFromCenter * 1.5) * 150);
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

function createSampleZip(assetTitle: string): Buffer {
  const readmeContent = `# ${assetTitle}
Thank you for acquiring ${assetTitle} from Asset Market.

## Package Manifest
- Main Production Deliverables & Source Code
- High-Resolution Textures / Assets / Components
- Architecture & Integration Documentation
- Standard Commercial License Agreement

## Support & Verification
- Platform: Asset Market Indonesia
- Support Portal: https://assetmarket.com/support
`;
  const fileBytes = Buffer.from(readmeContent, 'utf-8');
  const crc = crc32(fileBytes);
  const now = new Date();
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const nameBytes = Buffer.from('README.md', 'utf-8');

  const localHeader = Buffer.alloc(30 + nameBytes.length);
  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4);
  localHeader.writeUInt16LE(0, 6);
  localHeader.writeUInt16LE(0, 8);
  localHeader.writeUInt16LE(time, 10);
  localHeader.writeUInt16LE(date, 12);
  localHeader.writeUInt32LE(crc, 14);
  localHeader.writeUInt32LE(fileBytes.length, 18);
  localHeader.writeUInt32LE(fileBytes.length, 22);
  localHeader.writeUInt16LE(nameBytes.length, 26);
  localHeader.writeUInt16LE(0, 28);
  nameBytes.copy(localHeader, 30);

  const localOffset = 0;

  const cdHeader = Buffer.alloc(46 + nameBytes.length);
  cdHeader.writeUInt32LE(0x02014b50, 0);
  cdHeader.writeUInt16LE(20, 4);
  cdHeader.writeUInt16LE(20, 6);
  cdHeader.writeUInt16LE(0, 8);
  cdHeader.writeUInt16LE(0, 10);
  cdHeader.writeUInt16LE(time, 12);
  cdHeader.writeUInt16LE(date, 14);
  cdHeader.writeUInt32LE(crc, 16);
  cdHeader.writeUInt32LE(fileBytes.length, 20);
  cdHeader.writeUInt32LE(fileBytes.length, 24);
  cdHeader.writeUInt16LE(nameBytes.length, 28);
  cdHeader.writeUInt16LE(0, 30);
  cdHeader.writeUInt16LE(0, 32);
  cdHeader.writeUInt16LE(0, 34);
  cdHeader.writeUInt16LE(0, 36);
  cdHeader.writeUInt32LE(0, 38);
  cdHeader.writeUInt32LE(localOffset, 42);
  nameBytes.copy(cdHeader, 46);

  const cdOffset = localHeader.length + fileBytes.length;
  const cdSize = cdHeader.length;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([localHeader, fileBytes, cdHeader, eocd]);
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
    if (stats.size > 1000) return;
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });

  let buffer: Buffer | null = null;
  try {
    const res = await fetch(externalUrl, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const arrayBuf = await res.arrayBuffer();
      if (arrayBuf.byteLength > 1000) {
        buffer = Buffer.from(arrayBuf);
      }
    }
  } catch {
    // Network fallback
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
  phone?: string;
  bio?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  bankBranch?: string;
}

const SEED_ACCOUNTS: SeedAccount[] = [
  {
    name: 'Super Admin',
    email: 'superadmin@assetmarket.com',
    passwordRaw: 'SuperAdmin123!',
    role: 'superadmin',
    isVerifiedSeller: true,
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
    phone: '+6281987654321',
    bio: 'Senior UI/UX Designer & 3D Artist creating award-winning design kits and interactive web systems.',
    bankName: 'Bank Negara Indonesia (BNI)',
    bankAccountNumber: '0388912389',
    bankAccountHolder: 'Demo Seller',
    bankBranch: 'Bandung Dago',
  },
];

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
  {
    title: 'Atelier Noir Editorial Design System',
    slug: 'atelier-noir-editorial-design-system',
    categorySlug: 'ui-templates',
    assetType: 'ui_template',
    price: '350000.00',
    discountPrice: '275000.00',
    sellerEmail: 'seller@assetmarket.com',
    shortDescription: 'Sistem desain editorial eksklusif dengan estetika high-fashion, tipografi terkurasi, dan komponen UI siap pakai.',
    description: `Atelier Noir adalah digital design system yang dirancang khusus untuk brand mewah, media editorial, dan platform digital premium.

### Fitur Utama:
- **Editorial Typography**: Pairing tipografi Instrument Serif & Satoshi terkurasi dengan proporsi skala modular.
- **Harmonious Dark Theme**: Palet warna HSL berbasis obsidian, ember orange (#D93A0F), dan cosmic teal (#00B8B8).
- **60+ Reusable Components**: Buttons, cards, modals, navigation bars, data tables, dan forms.
- **Figma & Code Tokens**: Sinkronisasi variabel desain untuk Figma dan CSS variables/Vue 3.`,
    tags: ['Design System', 'Editorial', 'Figma', 'Vue 3', 'Luxury'],
    demoUrl: 'https://ateliernoir.design',
    ratingAvg: '4.95',
    ratingCount: 38,
    downloadCount: 142,
    viewCount: 890,
    status: 'approved',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80',
    ],
  },
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
    ratingAvg: '4.88',
    ratingCount: 29,
    downloadCount: 85,
    viewCount: 612,
    status: 'approved',
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
    ],
  },
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
    ratingCount: 45,
    downloadCount: 110,
    viewCount: 745,
    status: 'approved',
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    title: 'Aura Modern Serif & Display Typography Kit',
    slug: 'aura-display-typography-kit',
    categorySlug: 'graphics-vectors',
    assetType: 'graphic',
    price: '185000.00',
    discountPrice: null,
    sellerEmail: 'user@assetmarket.com',
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
    ratingCount: 22,
    downloadCount: 94,
    viewCount: 430,
    status: 'approved',
    imageUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    title: 'Lumina SaaS Dashboard & Admin Component Kit',
    slug: 'lumina-saas-dashboard',
    categorySlug: 'ui-templates',
    assetType: 'ui_template',
    price: '480000.00',
    discountPrice: '390000.00',
    sellerEmail: 'seller@assetmarket.com',
    shortDescription: 'Comprehensive SaaS management dashboard with subscription billing, team management, and dark theme.',
    description: `Lumina adalah dashboard manajemen SaaS modern yang dirancang untuk skala dan produktivitas tinggi.

### Modul Lengkap:
- **Revenue & MRR Analytics**: Visualisasi grafik interaktif, cohort analysis, dan churn prediction.
- **Billing & Subscription**: Invoicing table, payment method management, dan tier upgrade modal.
- **User Roles & Permissions**: Multi-tenant team workspace management dan security audit log.
- **Responsive Layout**: Dukungan penuh mobile drawer dan compact desktop sidebar.`,
    tags: ['SaaS', 'Dashboard', 'Admin Kit', 'Analytics', 'Tailwind', 'Vue 3'],
    demoUrl: 'https://lumina-dashboard.preview',
    ratingAvg: '4.85',
    ratingCount: 52,
    downloadCount: 230,
    viewCount: 1250,
    status: 'approved',
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    title: 'Cyberpunk Humanoid Rigged 3D Character Model',
    slug: 'cyberpunk-humanoid-rigged-3d',
    categorySlug: '3d-models',
    assetType: '3d_model',
    price: '650000.00',
    discountPrice: '499000.00',
    sellerEmail: 'seller@assetmarket.com',
    shortDescription: 'Game-ready rigged cyberpunk humanoid with 4K PBR textures and motion capture compatibility.',
    description: `Karakter 3D humanoid sci-fi siap pakai untuk game Unreal Engine 5 dan Unity dengan full bone hierarchy dan facial blendshapes.

### Fitur Karakter:
- **Full IK/FK Rig**: Dioptimalkan untuk Unreal Engine 5 Mannequin skeleton.
- **Facial Blendshapes**: 52 ARKit blendshapes siap untuk facial motion capture via iPhone/Live Link.
- **Cybernetic Augmentations**: Shader emisi neon kustom dengan parameter warna dinamis.`,
    tags: ['Game Ready', 'Rigged', 'Unreal Engine', 'Sci-Fi', 'Character', 'FBX'],
    demoUrl: 'https://cyber-rig.render',
    ratingAvg: '4.79',
    ratingCount: 34,
    downloadCount: 78,
    viewCount: 580,
    status: 'approved',
    imageUrl: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    title: 'Hyperion Headless Microservices E-Commerce Engine',
    slug: 'hyperion-microservices-ecommerce',
    categorySlug: 'source-code',
    assetType: 'source_code',
    price: '890000.00',
    discountPrice: '720000.00',
    sellerEmail: 'seller@assetmarket.com',
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
    ratingCount: 41,
    downloadCount: 165,
    viewCount: 980,
    status: 'approved',
    imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1522542550221-31fd19575a2d?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    title: 'Obsidian Minimalist Vector Iconography (1,200+ Icons)',
    slug: 'obsidian-minimalist-vector-icons',
    categorySlug: 'graphics-vectors',
    assetType: 'graphic',
    price: '150000.00',
    discountPrice: '99000.00',
    sellerEmail: 'user@assetmarket.com',
    shortDescription: 'Over 1,200 precision pixel-snapped vector icons across 24 categories in outlined and solid variants.',
    description: `Koleksi 1.200+ ikon vektor presisi tinggi dengan grid 24px pixel-perfect.

### Format & Kelengkapan:
- **Dua Gaya**: Stroke 1.5px (Outlined) dan Solid (Filled).
- **Format Lengkap**: Clean SVG, Figma Component Library, React & Vue Icon Components.
- **Kategori Terstruktur**: Finansial, E-Commerce, Navigasi, Interface, Media, dan Keamanan.`,
    tags: ['Icons', 'SVG', 'Figma', 'Vector', 'Design System', 'UI Icons'],
    demoUrl: 'https://obsidian-icons.design',
    ratingAvg: '4.90',
    ratingCount: 68,
    downloadCount: 340,
    viewCount: 1820,
    status: 'approved',
    imageUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    title: 'Cinematic Ambient Soundscapes & UI Audio Suite',
    slug: 'cinematic-ambient-soundscapes-audio',
    categorySlug: 'audio-sound',
    assetType: 'audio',
    price: '220000.00',
    discountPrice: '175000.00',
    sellerEmail: 'seller@assetmarket.com',
    shortDescription: 'Royalty-free cinematic atmospheric soundscapes, trailer hits, and UI micro-interaction sound effects.',
    description: `Suite audio premium yang menggabungkan soundscape sinematik atmosferik dengan efek suara mikro-interaksi UI modern.

### Komposisi Paket:
- **40 Atmospheric Soundscapes**: Kualitas rekaman studio 96kHz / 24-bit lossless WAV.
- **120 UI Sound Effects**: Chimes, clicks, success alerts, and subtle hover cues.
- **Royalty-Free Commercial License**: Aman untuk penggunaan aplikasi komersial, game, dan video streaming.`,
    tags: ['Audio', 'SFX', 'Soundtracks', 'Cinematic', 'WAV 96kHz', 'Music'],
    demoUrl: 'https://cinematic-audio.sound',
    ratingAvg: '4.82',
    ratingCount: 26,
    downloadCount: 63,
    viewCount: 390,
    status: 'approved',
    imageUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1522542550221-31fd19575a2d?auto=format&fit=crop&w=1200&q=80',
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
    shortDescription: 'Modern mobile banking interface with 100+ screens including crypto wallet, virtual cards, and QRIS.',
    description: `Desain aplikasi perbankan masa depan dengan alur navigasi intuitif dan estetika visual modern.

### Layar Unggulan:
- **Biometric Authentication & PIN Pad**: Alur login aman dan verifikasi multi-faktor.
- **Multi-Currency Account & QRIS**: Scanner kode QR cepat dengan konversi kurs instan.
- **Virtual Cards & Expense Tracker**: Rincian pengeluaran berkategori dengan infografis interaktif.
- **100+ Figma Screens**: Auto-layout 5.0, dark & light themes, dan prototype flow siap presentasi.`,
    tags: ['Fintech', 'Mobile', 'iOS', 'Flutter', 'Figma', 'Banking'],
    demoUrl: 'https://zenith-banking.ui',
    ratingAvg: '4.96',
    ratingCount: 37,
    downloadCount: 155,
    viewCount: 860,
    status: 'approved',
    imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    title: 'Prism Iridescent Abstract 3D Glass Artwork Pack',
    slug: 'prism-iridescent-abstract-3d-glass',
    categorySlug: '3d-models',
    assetType: '3d_model',
    price: '280000.00',
    discountPrice: '210000.00',
    sellerEmail: 'seller@assetmarket.com',
    shortDescription: 'Stunning 3D iridescent glass compositions, chromatic materials, and 8K renders for hero sections.',
    description: `Koleksi 18 komposisi abstrak 3D berbahan kaca kromatik dengan pembiasan spektrum cahaya dinamis.

### Format & Spesifikasi:
- **Source Blender Files**: Lengkap dengan material dispersion shader and lighting rig.
- **8K Alpha Renders**: 7680x4320 PNG transparan untuk hero background website tanpa perlu 3D rendering lagi.
- **Optimized WebGL GLB**: Model low-poly dengan baked lighting untuk integrasi Three.js.`,
    tags: ['3D Art', 'Cinema4D', 'Octane', 'Abstract', 'Wallpapers', 'Glass'],
    demoUrl: 'https://prism-glass.art',
    ratingAvg: '4.89',
    ratingCount: 30,
    downloadCount: 89,
    viewCount: 510,
    status: 'approved',
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    title: 'Quantum Multi-Tenant Creative Agency Next.js Platform',
    slug: 'quantum-nextjs-agency-platform',
    categorySlug: 'source-code',
    assetType: 'source_code',
    price: '520000.00',
    discountPrice: '420000.00',
    sellerEmail: 'seller@assetmarket.com',
    shortDescription: 'Production-ready multi-tenant creative agency portfolio with live MDX editor and automated image optimization.',
    description: `Starter kit lengkap untuk agensi kreatif dan studio desain dengan Next.js 15 App Router dan Tailwind CSS.

### Fitur Pengembang:
- **Server-Driven Dynamic Pages**: Static Site Generation (SSG) dengan Incremental Static Regeneration (ISR).
- **Integrated MDX Blog & Case Studies**: Menulis studi kasus kaya interaksi langsung dalam markdown.
- **Lead Capture & Contact Forms**: Resend email integration dan Discord/Slack webhook notifications.`,
    tags: ['Next.js', 'React', 'CMS', 'Tailwind', 'SEO', 'TypeScript'],
    demoUrl: 'https://quantum-agency.preview',
    ratingAvg: '4.91',
    ratingCount: 48,
    downloadCount: 180,
    viewCount: 1100,
    status: 'approved',
    imageUrl: 'https://images.unsplash.com/photo-1522542550221-31fd19575a2d?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1522542550221-31fd19575a2d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
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
    ratingCount: 62,
    downloadCount: 410,
    viewCount: 1420,
    status: 'approved',
    imageUrl: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80',
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
    ratingCount: 39,
    downloadCount: 295,
    viewCount: 880,
    status: 'approved',
    imageUrl: 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=1200&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
    ],
  },
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
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
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

  try {
    // ---------------------------------------------------------------------
    // STEP 0: Purge Any Stale / Corrupted / Non-Demo Assets
    // ---------------------------------------------------------------------
    console.log('🧹 [0/5] Purging Stale & Non-Demo Assets...');
    const junkAssets = await db
      .select({ id: assets.id, slug: assets.slug })
      .from(assets)
      .where(notInArray(assets.slug, VALID_SLUGS));

    if (junkAssets.length > 0) {
      const junkIds = junkAssets.map((j) => j.id);
      const txItems = await db
        .select({ id: transactionItems.id, transactionId: transactionItems.transactionId })
        .from(transactionItems)
        .where(inArray(transactionItems.assetId, junkIds));

      if (txItems.length > 0) {
        const txIds = [...new Set(txItems.map((t) => t.transactionId))];
        const txItemIds = txItems.map((t) => t.id);

        await db.delete(paymentConfirmations).where(inArray(paymentConfirmations.transactionId, txIds));
        await db.delete(revenueLedger).where(inArray(revenueLedger.transactionId, txIds));
        await db.delete(revenueLedger).where(inArray(revenueLedger.transactionItemId, txItemIds));
        await db.delete(transactionItems).where(inArray(transactionItems.id, txItemIds));
        await db.delete(transactions).where(inArray(transactions.id, txIds));
      }

      await db.delete(cartItems).where(inArray(cartItems.assetId, junkIds));
      await db.delete(assetFiles).where(inArray(assetFiles.assetId, junkIds));
      await db.delete(assets).where(inArray(assets.id, junkIds));
      console.log(`✓ Purged ${junkAssets.length} non-demo assets.`);
    } else {
      console.log('✓ No junk assets detected in database.');
    }

    // ---------------------------------------------------------------------
    // STEP 1: Synchronize Core Testing Accounts
    // ---------------------------------------------------------------------
    console.log('\n👤 [1/5] Synchronizing Seed Accounts...');
    const userMap: Record<string, string> = {};

    for (const account of SEED_ACCOUNTS) {
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, account.email))
        .limit(1);

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(account.passwordRaw, salt);

      if (existing.length > 0 && existing[0]) {
        const [updated] = await db
          .update(users)
          .set({
            name: account.name,
            passwordHash,
            role: account.role,
            isVerifiedSeller: account.isVerifiedSeller,
            phone: account.phone,
            bio: account.bio,
            bankName: account.bankName,
            bankAccountNumber: account.bankAccountNumber,
            bankAccountHolder: account.bankAccountHolder,
            bankBranch: account.bankBranch,
            updatedAt: new Date(),
          })
          .where(eq(users.email, account.email))
          .returning();

        userMap[account.email] = updated ? updated.id : existing[0].id;
      } else {
        const [created] = await db
          .insert(users)
          .values({
            name: account.name,
            email: account.email,
            passwordHash,
            role: account.role,
            isVerifiedSeller: account.isVerifiedSeller,
            phone: account.phone,
            bio: account.bio,
            bankName: account.bankName,
            bankAccountNumber: account.bankAccountNumber,
            bankAccountHolder: account.bankAccountHolder,
            bankBranch: account.bankBranch,
          })
          .returning();

        if (created) {
          userMap[account.email] = created.id;
        }
      }
    }
    console.log(`✓ Synchronized ${SEED_ACCOUNTS.length} test accounts.`);

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
      let pIdx = 0;
      for (const pUrl of def.previewImages) {
        pIdx++;
        const previewDiskFileName = `${def.slug}-preview-${pIdx}.png`;
        const previewDiskPath = path.join(thumbDir, previewDiskFileName);
        await ensureLocalFile(previewDiskPath, pUrl, 1200, 800, assetIdx + pIdx);
      }

      // Save deliverable zip on disk
      const deliverableFileName = `${def.slug}-package.zip`;
      const deliverableDiskPath = path.join(filesDir, deliverableFileName);
      const zipBuffer = createSampleZip(def.title);
      await fs.writeFile(deliverableDiskPath, zipBuffer);
      const fileSha256 = crypto.createHash('sha256').update(zipBuffer).digest('hex');

      const thumbnailUrl = def.imageUrl;
      const previewImages = def.previewImages;

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

    const receipt1Path = path.join(paymentsDir, 'receipt-seed-01.jpg');
    const receipt2Path = path.join(paymentsDir, 'receipt-seed-02.jpg');
    const receipt3Path = path.join(paymentsDir, 'receipt-seed-03.jpg');
    const receipt4Path = path.join(paymentsDir, 'receipt-seed-04.jpg');
    const receipt5Path = path.join(paymentsDir, 'receipt-seed-05.jpg');

    await fs.writeFile(receipt1Path, createLuxuryEditorialPng(600, 800, 0));
    await fs.writeFile(receipt2Path, createLuxuryEditorialPng(600, 800, 1));
    await fs.writeFile(receipt3Path, createLuxuryEditorialPng(600, 800, 2));
    await fs.writeFile(receipt4Path, createLuxuryEditorialPng(600, 800, 3));
    await fs.writeFile(receipt5Path, createLuxuryEditorialPng(600, 800, 4));

    const rawBuyerId = userMap['user@assetmarket.com'];
    const rawSellerId = userMap['seller@assetmarket.com'];
    const rawAdminId = userMap['admin@assetmarket.com'];

    if (!rawBuyerId || !rawSellerId || !rawAdminId) {
      throw new Error('Required seed accounts were not created properly.');
    }

    const userBuyerId: string = rawBuyerId;
    const sellerCreatorId: string = rawSellerId;
    const adminModeratorId: string = rawAdminId;

    const SEED_INVOICES = [
      'INV-20261001-A101',
      'INV-20261002-B202',
      'INV-20261003-C303',
      'INV-20261004-D404',
      'INV-20261005-E505',
    ];

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

    await db
      .delete(revenueLedger)
      .where(and(eq(revenueLedger.userId, sellerCreatorId), eq(revenueLedger.entryType, 'withdrawal')));

    // 1. Tx 1: Atelier Noir
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
          paidAt: new Date(Date.now() - 4 * 86400000),
          notes: 'BCA Virtual Account settlement verified.',
        })
        .returning();

      if (tx1) {
        const [item1] = await db
          .insert(transactionItems)
          .values({
            transactionId: tx1.id,
            assetId: asset1Id,
            sellerId: sellerCreatorId,
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
          transferDate: new Date(Date.now() - 4 * 86400000),
          proofImageUrl: '/uploads/payments/receipt-seed-01.jpg',
          status: 'verified',
          verifiedBy: adminModeratorId,
          verifiedAt: new Date(Date.now() - 4 * 86400000 + 3600000),
        });

        if (item1) {
          await db.insert(revenueLedger).values({
            userId: sellerCreatorId,
            transactionId: tx1.id,
            transactionItemId: item1.id,
            entryType: 'sale_earning',
            grossAmount: '275000.00',
            platformFee: '110000.00',
            netAmount: '165000.00',
            balanceAfter: '165000.00',
            description: 'Bagi hasil penjualan aset (60% kreator): "Atelier Noir Editorial Design System"',
            createdAt: new Date(Date.now() - 4 * 86400000 + 3600000),
          });
        }
      }
    }

    // 2. Tx 2: Chronos Trading Core
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
          paidAt: new Date(Date.now() - 3 * 86400000),
          notes: 'Bank Mandiri online transfer verified.',
        })
        .returning();

      if (tx2) {
        const [item2] = await db
          .insert(transactionItems)
          .values({
            transactionId: tx2.id,
            assetId: asset2Id,
            sellerId: sellerCreatorId,
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
          transferDate: new Date(Date.now() - 3 * 86400000),
          proofImageUrl: '/uploads/payments/receipt-seed-02.jpg',
          status: 'verified',
          verifiedBy: adminModeratorId,
          verifiedAt: new Date(Date.now() - 3 * 86400000 + 1800000),
        });

        if (item2) {
          await db.insert(revenueLedger).values({
            userId: sellerCreatorId,
            transactionId: tx2.id,
            transactionItemId: item2.id,
            entryType: 'sale_earning',
            grossAmount: '599000.00',
            platformFee: '239600.00',
            netAmount: '359400.00',
            balanceAfter: '524400.00',
            description: 'Bagi hasil penjualan aset (60% kreator): "Chronos High-Frequency Trading Core"',
            createdAt: new Date(Date.now() - 3 * 86400000 + 1800000),
          });
        }
      }
    }

    // 3. Tx 3: Aura Typography Kit
    const asset4Id = assetMap['aura-display-typography-kit'];
    if (asset4Id) {
      const [tx3] = await db
        .insert(transactions)
        .values({
          invoiceNumber: 'INV-20261003-C303',
          buyerId: sellerCreatorId,
          subtotal: '185000.00',
          taxAmount: '0.00',
          totalAmount: '185000.00',
          status: 'paid',
          paymentMethod: 'bank_transfer',
          paidAt: new Date(Date.now() - 2 * 86400000),
          notes: 'BNI Mobile transfer verified.',
        })
        .returning();

      if (tx3) {
        const [item3] = await db
          .insert(transactionItems)
          .values({
            transactionId: tx3.id,
            assetId: asset4Id,
            sellerId: userBuyerId,
            price: '185000.00',
            sellerRatePercent: '60.00',
            platformRatePercent: '40.00',
            sellerAmount: '111000.00',
            platformAmount: '74000.00',
            licenseType: 'standard',
          })
          .returning();

        await db.insert(paymentConfirmations).values({
          transactionId: tx3.id,
          userId: sellerCreatorId,
          senderBank: 'Bank Negara Indonesia (BNI)',
          senderAccountNumber: '0388912389',
          senderAccountName: 'Demo Seller',
          destinationBank: 'Bank Central Asia (BCA) - Asset Market',
          transferAmount: '185000.00',
          transferDate: new Date(Date.now() - 2 * 86400000),
          proofImageUrl: '/uploads/payments/receipt-seed-03.jpg',
          status: 'verified',
          verifiedBy: adminModeratorId,
          verifiedAt: new Date(Date.now() - 2 * 86400000 + 2400000),
        });

        if (item3) {
          await db.insert(revenueLedger).values({
            userId: userBuyerId,
            transactionId: tx3.id,
            transactionItemId: item3.id,
            entryType: 'sale_earning',
            grossAmount: '185000.00',
            platformFee: '74000.00',
            netAmount: '111000.00',
            balanceAfter: '111000.00',
            description: 'Bagi hasil penjualan aset (60% kreator): "Aura Modern Serif & Display Typography Kit"',
            createdAt: new Date(Date.now() - 2 * 86400000 + 2400000),
          });
        }
      }
    }

    // 4. Tx 4: Lumina SaaS Dashboard
    const asset5Id = assetMap['lumina-saas-dashboard'];
    if (asset5Id) {
      const [tx4] = await db
        .insert(transactions)
        .values({
          invoiceNumber: 'INV-20261004-D404',
          buyerId: userBuyerId,
          subtotal: '390000.00',
          taxAmount: '0.00',
          totalAmount: '390000.00',
          status: 'paid',
          paymentMethod: 'bank_transfer',
          paidAt: new Date(Date.now() - 1 * 86400000),
          notes: 'BCA QRIS settlement.',
        })
        .returning();

      if (tx4) {
        const [item4] = await db
          .insert(transactionItems)
          .values({
            transactionId: tx4.id,
            assetId: asset5Id,
            sellerId: sellerCreatorId,
            price: '390000.00',
            sellerRatePercent: '60.00',
            platformRatePercent: '40.00',
            sellerAmount: '234000.00',
            platformAmount: '156000.00',
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
          transferAmount: '390000.00',
          transferDate: new Date(Date.now() - 1 * 86400000),
          proofImageUrl: '/uploads/payments/receipt-seed-04.jpg',
          status: 'verified',
          verifiedBy: adminModeratorId,
          verifiedAt: new Date(Date.now() - 1 * 86400000 + 1200000),
        });

        if (item4) {
          await db.insert(revenueLedger).values({
            userId: sellerCreatorId,
            transactionId: tx4.id,
            transactionItemId: item4.id,
            entryType: 'sale_earning',
            grossAmount: '390000.00',
            platformFee: '156000.00',
            netAmount: '234000.00',
            balanceAfter: '758400.00',
            description: 'Bagi hasil penjualan aset (60% kreator): "Lumina SaaS Dashboard & Admin Component Kit"',
            createdAt: new Date(Date.now() - 1 * 86400000 + 1200000),
          });
        }

        // Payout withdrawal entry for Demo Seller
        await db.insert(revenueLedger).values({
          userId: sellerCreatorId,
          entryType: 'withdrawal',
          grossAmount: '250000.00',
          platformFee: '0.00',
          netAmount: '250000.00',
          balanceAfter: '508400.00',
          description: 'Pencairan dana kreator (Payout) ke Rekening BCA 0388912389 a.n Demo Seller',
          createdAt: new Date(Date.now() - 12 * 3600000),
        });
      }
    }

    // 5. Tx 5: Vogue 3D Interior pending payment confirmation
    const asset3Id = assetMap['vogue-velvet-3d-interior'];
    if (asset3Id) {
      const [tx5] = await db
        .insert(transactions)
        .values({
          invoiceNumber: 'INV-20261005-E505',
          buyerId: userBuyerId,
          subtotal: '320000.00',
          taxAmount: '0.00',
          totalAmount: '320000.00',
          status: 'processing',
          paymentMethod: 'bank_transfer',
          notes: 'Menunggu konfirmasi verifikasi admin.',
        })
        .returning();

      if (tx5) {
        await db.insert(transactionItems).values({
          transactionId: tx5.id,
          assetId: asset3Id,
          sellerId: sellerCreatorId,
          price: '320000.00',
          sellerRatePercent: '60.00',
          platformRatePercent: '40.00',
          sellerAmount: '192000.00',
          platformAmount: '128000.00',
          licenseType: 'standard',
        });

        await db.insert(paymentConfirmations).values({
          transactionId: tx5.id,
          userId: userBuyerId,
          senderBank: 'Bank Central Asia (BCA)',
          senderAccountNumber: '5270918234',
          senderAccountName: 'Demo User',
          destinationBank: 'Bank Central Asia (BCA) - Asset Market',
          transferAmount: '320000.00',
          transferDate: new Date(),
          proofImageUrl: '/uploads/payments/receipt-seed-05.jpg',
          status: 'pending',
        });
      }
    }

    console.log('✓ Seeded 5 transactions with verified payment proofs and creator revenue mutations.');

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

    const approvedCount = Number(approvedRes?.value ?? 0);
    const pendingCount = Number(pendingRes?.value ?? 0);

    console.log(`• Total Approved Assets in Catalog: ${approvedCount}`);
    console.log(`• Total Pending Assets in Queue: ${pendingCount}`);
    console.log(`• Uploads Directory: ${rootUploads}`);
    console.log('\n✨ Database seeding completed successfully! All assets have valid images.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed with error:', error);
    process.exit(1);
  }
}

runSeed();
