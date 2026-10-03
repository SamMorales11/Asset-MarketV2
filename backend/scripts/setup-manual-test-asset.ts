import * as fs from 'fs/promises';
import * as path from 'path';
import * as zlib from 'zlib';
import * as crypto from 'crypto';
import 'dotenv/config';
import { db } from '../src/db/index.js';
import { assets, assetFiles, categories, users } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

// CRC32 implementation for PNG generation
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
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return crc ^ 0xffffffff;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeInt32BE(crc, 8 + len);
  return chunk;
}

export function createLuxuryEditorialPng(width = 800, height = 500, variant = 0): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit
  ihdrData.writeUInt8(2, 9); // RGB
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

      let r = 16, g = 16, b = 22;
      if (variant === 0) {
        // Deep Obsidian with Ember Orange (#D93A0F) glow
        const distFromCenter = Math.hypot(xRatio - 0.5, yRatio - 0.5);
        r = Math.floor(16 + Math.max(0, 1 - distFromCenter * 1.5) * 190);
        g = Math.floor(16 + Math.max(0, 1 - distFromCenter * 1.8) * 55);
        b = Math.floor(22 + Math.max(0, 1 - distFromCenter * 1.6) * 30 + yRatio * 20);
      } else {
        // Deep Dark Emerald & Teal (#00B8B8) glow
        const distFromCenter = Math.hypot(xRatio - 0.5, yRatio - 0.5);
        r = Math.floor(14 + Math.max(0, 1 - distFromCenter * 1.8) * 20);
        g = Math.floor(18 + Math.max(0, 1 - distFromCenter * 1.5) * 160);
        b = Math.floor(24 + Math.max(0, 1 - distFromCenter * 1.5) * 170);
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

async function main() {
  console.log('=== FIXING AND CREATING MANUAL TEST ASSET ===');

  const rootUploads = path.resolve(process.cwd(), 'uploads');
  const thumbDir = path.join(rootUploads, 'thumbnails');
  const filesDir = path.join(rootUploads, 'files');

  await fs.mkdir(thumbDir, { recursive: true });
  await fs.mkdir(filesDir, { recursive: true });

  // 1. Check and repair corrupted / 16-byte dummy files in uploads/thumbnails
  const existingThumbs = await fs.readdir(thumbDir);
  console.log(`Checking ${existingThumbs.length} files in uploads/thumbnails...`);

  let repairedCount = 0;
  for (const filename of existingThumbs) {
    const filePath = path.join(thumbDir, filename);
    const stats = await fs.stat(filePath);
    if (stats.size < 100) {
      console.log(`Fixing corrupted dummy thumbnail: ${filename} (${stats.size} bytes)`);
      const validPng = createLuxuryEditorialPng(800, 500, repairedCount % 2);
      await fs.writeFile(filePath, validPng);
      repairedCount++;
    }
  }
  console.log(`Successfully repaired ${repairedCount} corrupted dummy thumbnail files.`);

  // 2. Fetch or create a designated high-res image for the new manual test asset
  const manualThumbFileName = 'atelier-noir-showcase.png';
  const manualThumbPath = path.join(thumbDir, manualThumbFileName);

  // Try fetching high-fashion photo, or fallback to generated luxury PNG
  let validBuffer: Buffer;
  try {
    console.log('Fetching high-fashion editorial preview image from Unsplash...');
    const res = await fetch('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80', {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      validBuffer = Buffer.from(await res.arrayBuffer());
      console.log(`Fetched real Unsplash photo (${validBuffer.length} bytes)`);
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (err: any) {
    console.log('Fallback: generating luxury procedural PNG buffer...', err.message);
    validBuffer = createLuxuryEditorialPng(1200, 750, 0);
  }

  await fs.writeFile(manualThumbPath, validBuffer);
  console.log(`Saved manual test thumbnail to: ${manualThumbPath} (${validBuffer.length} bytes)`);

  // 3. Find seller user and category
  const [sellerUser] = await db
    .select()
    .from(users)
    .where(eq(users.role, 'user'))
    .limit(1);

  const [category] = await db
    .select()
    .from(categories)
    .limit(1);

  if (!sellerUser || !category) {
    throw new Error('Database must have at least one user and category (run db:seed first)');
  }

  // 4. Create deliverable zip archive file on disk
  const deliverableFileName = `atelier-noir-deliverable-${crypto.randomUUID().slice(0, 8)}.zip`;
  const deliverablePath = path.join(filesDir, deliverableFileName);
  const dummyZipContent = Buffer.from('PK\x05\x06' + '\x00'.repeat(18)); // Valid empty zip file header
  await fs.writeFile(deliverablePath, dummyZipContent);

  // 5. Create or update Manual Testing Asset
  const assetTitle = 'Atelier Noir Editorial Design System';
  const assetSlug = 'atelier-noir-editorial-design-system';

  const [existingAsset] = await db
    .select()
    .from(assets)
    .where(eq(assets.slug, assetSlug))
    .limit(1);

  let targetAssetId: string;

  if (existingAsset) {
    console.log(`Updating existing test asset ID: ${existingAsset.id}`);
    await db
      .update(assets)
      .set({
        thumbnailUrl: `/uploads/thumbnails/${manualThumbFileName}`,
        status: 'approved',
        price: '350000.00',
        discountPrice: '275000.00',
        updatedAt: new Date(),
      })
      .where(eq(assets.id, existingAsset.id));
    targetAssetId = existingAsset.id;
  } else {
    console.log('Inserting new test asset in DB...');
    const [newAsset] = await db
      .insert(assets)
      .values({
        sellerId: sellerUser.id,
        categoryId: category.id,
        title: assetTitle,
        slug: assetSlug,
        shortDescription: 'Sistem desain editorial eksklusif dengan estetika high-fashion, tipografi terkurasi, dan komponen UI siap pakai.',
        description: 'Atelier Noir adalah digital design system yang dirancang khusus untuk brand mewah dan platform digital premium. Dilengkapi dengan token warna HSL terkurasi, tipografi Instrument Serif & Satoshi, serta puluhan komponen UI siap pakai.',
        assetType: 'ui_template',
        status: 'approved',
        price: '350000.00',
        discountPrice: '275000.00',
        currency: 'IDR',
        thumbnailUrl: `/uploads/thumbnails/${manualThumbFileName}`,
        previewImages: [],
        demoUrl: 'https://example.com/demo/atelier-noir',
        tags: ['Design System', 'Editorial', 'Figma', 'Vue 3'],
        ratingAvg: '5.00',
        ratingCount: 24,
        downloadCount: 68,
        viewCount: 215,
      })
      .returning();
    targetAssetId = newAsset!.id;
  }

  // 6. Link deliverable file in asset_files
  const [existingFile] = await db
    .select()
    .from(assetFiles)
    .where(eq(assetFiles.assetId, targetAssetId))
    .limit(1);

  if (!existingFile) {
    await db.insert(assetFiles).values({
      assetId: targetAssetId,
      fileName: 'atelier-noir-v1.0.zip',
      fileKey: `files/${deliverableFileName}`,
      fileSizeBytes: dummyZipContent.length,
      mimeType: 'application/zip',
      fileExtension: 'zip',
      checksumSha256: crypto.createHash('sha256').update(dummyZipContent).digest('hex'),
      storageDriver: 'local',
      isMain: true,
      version: 1,
    });
    console.log('Inserted deliverable file record into asset_files.');
  }

  console.log('\n=== ASSET TESTING MANIFEST ===');
  console.log(`ID: ${targetAssetId}`);
  console.log(`Title: ${assetTitle}`);
  console.log(`Slug: ${assetSlug}`);
  console.log(`Relative Thumbnail: /uploads/thumbnails/${manualThumbFileName}`);
  console.log(`Absolute Thumbnail: http://localhost:3000/uploads/thumbnails/${manualThumbFileName}`);
  console.log(`Status: approved`);
  console.log(`Price: Rp 275.000 (Normal: Rp 350.000)`);
  console.log('Setup successfully completed!');
}

main().catch((err) => {
  console.error('Failed to setup manual test asset:', err);
  process.exit(1);
});
