import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import * as dotenv from 'dotenv';
import { assets, assetFiles, categories, users } from '../src/db/schema.js';
import { eq, and, or, desc, isNull } from 'drizzle-orm';
import { getUploadsRootDir, ensureUploadDirs } from '../src/utils/paths.js';
import { createLuxuryEditorialPng } from '../src/utils/proceduralAssets.js';

// Fallback: If executed from workspace root where cwd/.env is missing, load backend/.env
if (!process.env.DATABASE_URL) {
    const metaDir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));
    const backendEnv = path.resolve(metaDir, '..', '.env');
    if (fsSync.existsSync(backendEnv)) {
        dotenv.config({ path: backendEnv });
    }
}

async function main() {
    console.log('=== FIXING AND CREATING MANUAL TEST ASSET ===');

    const { db } = await import('../src/db/index.js');

    ensureUploadDirs();
    const rootUploads = getUploadsRootDir();
    const thumbDir = path.join(rootUploads, 'thumbnails');
    const filesDir = path.join(rootUploads, 'files');

    // 1. Check and repair corrupted / 16-byte dummy files in uploads/thumbnails
    let existingThumbs: string[] = [];
    try {
        existingThumbs = await fs.readdir(thumbDir);
    } catch (err: any) {
        throw new Error(`Failed to read thumbnail directory at ${thumbDir}: ${err.message}. Ensure uploads directory is accessible.`);
    }
    console.log(`Checking ${existingThumbs.length} files in uploads/thumbnails...`);

    let repairedCount = 0;
    for (const filename of existingThumbs) {
        const filePath = path.join(thumbDir, filename);
        try {
            const stats = await fs.stat(filePath);
            if (stats.size < 100) {
                console.log(`Fixing corrupted dummy thumbnail: ${filename} (${stats.size} bytes)`);
                const validPng = createLuxuryEditorialPng(800, 500, repairedCount % 2);
                await fs.writeFile(filePath, validPng);
                repairedCount++;
            }
        } catch {
            // Ignore temporary access errors during inspection
        }
    }
    console.log(`Successfully repaired ${repairedCount} corrupted dummy thumbnail files.`);

    // 2. Fetch or create a designated high-res image for the manual test asset
    const manualThumbFileName = 'atelier-noir-showcase.png';
    const manualThumbPath = path.join(thumbDir, manualThumbFileName);

    let reuseExistingThumb = false;
    try {
        const thumbStat = await fs.stat(manualThumbPath);
        if (thumbStat.size >= 1000) {
            reuseExistingThumb = true;
            console.log(`Reusing existing valid thumbnail: ${manualThumbFileName} (${thumbStat.size} bytes)`);
        } else {
            console.log(`Existing thumbnail ${manualThumbFileName} is under 1000 bytes (${thumbStat.size} bytes). Replacing...`);
        }
    } catch {
        // File does not exist on disk, will fetch or generate
    }

    if (!reuseExistingThumb) {
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
    }

    // 3. Find seller user and category
    let [sellerUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, 'seller@assetmarket.com'))
        .limit(1);

    if (!sellerUser) {
        [sellerUser] = await db
            .select()
            .from(users)
            .where(
                or(
                    and(eq(users.role, 'user'), eq(users.isVerifiedSeller, true)),
                    eq(users.role, 'user')
                )
            )
            .orderBy(desc(users.isVerifiedSeller), desc(users.createdAt))
            .limit(1);
    }

    if (!sellerUser) {
        throw new Error('Database must have at least one user (run npm run db:seed first)');
    }

    let [category] = await db
        .select()
        .from(categories)
        .where(eq(categories.slug, 'ui-templates'))
        .limit(1);

    if (!category) {
        [category] = await db
            .select()
            .from(categories)
            .limit(1);
    }

    if (!category) {
        throw new Error('Database must have at least one category (run npm run db:seed first)');
    }

    // 4. Create or update Manual Testing Asset
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
                description: 'Atelier Noir adalah digital design system yang dirancang khusus untuk brand mewah dan platform digital premium. Dilengkapi dengan token warna HSL terkurasi, tipografi Fraunces & Plus Jakarta Sans, serta puluhan komponen UI siap pakai.',
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

    // 5. Link deliverable file in asset_files
    const [existingFile] = await db
        .select()
        .from(assetFiles)
        .where(
            and(
                eq(assetFiles.assetId, targetAssetId),
                eq(assetFiles.isMain, true),
                isNull(assetFiles.deletedAt)
            )
        )
        .limit(1);

    const dummyZipContent = Buffer.from('PK\x05\x06' + '\x00'.repeat(18));
    let deliverableFileKey: string;

    if (existingFile) {
        const existingDiskPath = path.resolve(rootUploads, existingFile.fileKey);
        let existsOnDisk = false;
        try {
            const stat = await fs.stat(existingDiskPath);
            if (stat.isFile() && stat.size > 0) {
                existsOnDisk = true;
            }
        } catch {
            existsOnDisk = false;
        }

        if (existsOnDisk) {
            console.log(`Reusing existing deliverable file: ${existingFile.fileKey}`);
            deliverableFileKey = existingFile.fileKey;
        } else {
            console.log(`Deliverable file recorded in DB (${existingFile.fileKey}) is missing on disk. Recreating...`);
            await fs.mkdir(path.dirname(existingDiskPath), { recursive: true });
            await fs.writeFile(existingDiskPath, dummyZipContent);
            deliverableFileKey = existingFile.fileKey;

            const fileSha256 = crypto.createHash('sha256').update(dummyZipContent).digest('hex');
            await db
                .update(assetFiles)
                .set({
                    fileSizeBytes: dummyZipContent.length,
                    checksumSha256: fileSha256,
                    updatedAt: new Date(),
                })
                .where(eq(assetFiles.id, existingFile.id));
        }
    } else {
        const deliverableFileName = 'atelier-noir-v1.0.zip';
        const deliverableDiskPath = path.join(filesDir, deliverableFileName);
        deliverableFileKey = `files/${deliverableFileName}`;

        let existsOnDisk = false;
        try {
            const stat = await fs.stat(deliverableDiskPath);
            if (stat.isFile() && stat.size > 0) {
                existsOnDisk = true;
            }
        } catch {
            existsOnDisk = false;
        }

        if (!existsOnDisk) {
            await fs.writeFile(deliverableDiskPath, dummyZipContent);
            console.log(`Created deliverable zip archive at: ${deliverableDiskPath}`);
        } else {
            console.log(`Reusing deliverable zip archive on disk: ${deliverableDiskPath}`);
        }

        const fileSha256 = crypto.createHash('sha256').update(dummyZipContent).digest('hex');
        await db.insert(assetFiles).values({
            assetId: targetAssetId,
            fileName: 'atelier-noir-v1.0.zip',
            fileKey: deliverableFileKey,
            fileSizeBytes: dummyZipContent.length,
            mimeType: 'application/zip',
            fileExtension: 'zip',
            version: '1.0.0',
            checksumSha256: fileSha256,
            isMain: true,
        });
        console.log('Inserted deliverable file record into asset_files.');
    }

    // 6. Output Asset Testing Manifest
    const port = process.env.PORT || 3001;
    const baseUrl = `http://localhost:${port}`;

    console.log('\n=== ASSET TESTING MANIFEST ===');
    console.log(`ID: ${targetAssetId}`);
    console.log(`Title: ${assetTitle}`);
    console.log(`Slug: ${assetSlug}`);
    console.log(`Relative Thumbnail: /uploads/thumbnails/${manualThumbFileName}`);
    console.log(`Absolute Thumbnail: ${baseUrl}/uploads/thumbnails/${manualThumbFileName}`);
    console.log(`Deliverable File Key: ${deliverableFileKey}`);
    console.log(`Detail Page URL: ${baseUrl}/api/assets/${assetSlug}`);
    console.log(`Status: approved`);
    console.log(`Price: Rp 275.000 (Normal: Rp 350.000)`);
    console.log('Setup successfully completed!');
}

main().catch((err: any) => {
    console.error('\n❌ Failed to setup manual test asset:');
    console.error(`   ${err?.message || err}`);
    console.error('\nTroubleshooting suggestions:');
    console.error('   👉 If database tables/records are missing: run "npm run db:seed"');
    console.error('   👉 If database connection failed: check DATABASE_URL in backend/.env');
    console.error('   👉 If port is already in use: run "npm run port:free"\n');
    process.exit(1);
});
