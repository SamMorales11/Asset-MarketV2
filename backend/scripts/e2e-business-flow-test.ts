import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';
import { db } from '../src/db/index.js';
import { assets, users, categories, assetFiles, transactionItems, transactions, paymentConfirmations, revenueLedger, cartItems } from '../src/db/schema.js';
import { eq, inArray } from 'drizzle-orm';
import { app } from '../src/app.js';
import { getUploadsRootDir } from '../src/utils/paths.js';
import { createLuxuryEditorialPng } from '../src/utils/proceduralAssets.js';

interface TestStepResult {
  step: string;
  passed: boolean;
  details?: string;
}

const testResults: TestStepResult[] = [];

function recordResult(condition: boolean, step: string, details?: string) {
  testResults.push({ step, passed: !!condition, details });
  if (condition) {
    console.log(`✅ [PASS] ${step}`);
    if (details) console.log(`   └─ ${details}`);
  } else {
    console.error(`❌ [FAIL] ${step}`);
    if (details) console.error(`   └─ ${details}`);
  }
}

async function runBusinessFlowE2E() {
  console.log('================================================================');
  console.log('🚀 END-TO-END BUSINESS FLOW: UPLOAD -> ADMIN APPROVE -> LISTING');
  console.log('================================================================\n');

  try {
    const timestamp = Date.now();

    // ----------------------------------------------------
    // SETUP: Get Categories and Seeded Users
    // ----------------------------------------------------
    const [sampleCategory] = await db.select().from(categories).limit(1);
    if (!sampleCategory) throw new Error('No categories available in database.');

    const [seededSeller] = await db.select().from(users).where(eq(users.email, 'seller@assetmarket.com')).limit(1);
    if (!seededSeller) throw new Error('No seeded seller found.');

    const [seededAdmin] = await db.select().from(users).where(eq(users.email, 'admin@assetmarket.com')).limit(1);
    if (!seededAdmin) throw new Error('No seeded admin found.');

    // ----------------------------------------------------
    // 1. AUTHENTICATE USER (SELLER)
    // ----------------------------------------------------
    console.log('\n--- 1. Authenticating User (Seller) ---');
    const sellerLoginRes = await app.fetch(
      new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: seededSeller.email, password: 'Seller123!' }),
      })
    );
    const sellerLoginData = (await sellerLoginRes.json()) as any;
    const sellerToken = sellerLoginData.data?.accessToken;
    recordResult(
      sellerLoginRes.status === 200 && !!sellerToken,
      'User login & token acquisition',
      `Logged in as: ${seededSeller.email}`
    );

    // ----------------------------------------------------
    // 2. AUTHENTICATE ADMIN
    // ----------------------------------------------------
    console.log('\n--- 2. Authenticating Admin ---');
    const adminLoginRes = await app.fetch(
      new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@assetmarket.com', password: 'Admin123!' }),
      })
    );
    const adminLoginData = (await adminLoginRes.json()) as any;
    const adminToken = adminLoginData.data?.accessToken;
    recordResult(
      adminLoginRes.status === 200 && !!adminToken,
      'Admin login & token acquisition',
      'Logged in as: admin@assetmarket.com'
    );

    // ----------------------------------------------------
    // 3. USER UPLOADS ASSET 1 (TO BE APPROVED)
    // ----------------------------------------------------
    console.log('\n--- 3. User Uploads Asset with Image & Deliverable Archive ---');
    // Prepare luxury editorial PNG buffer (high resolution, no 1x1 green placeholder)
    const validPngBuffer = createLuxuryEditorialPng(800, 500, 1);
    const validZipBuffer = Buffer.from('PK\x05\x06' + '\x00'.repeat(18));

    const asset1Title = `Kinetix Luxury UI System ${timestamp}`;
    const uploadForm1 = new FormData();
    uploadForm1.append('title', asset1Title);
    uploadForm1.append('shortDescription', 'Modern luxury dark editorial component architecture for fintech.');
    uploadForm1.append('description', 'Comprehensive design system crafted with Vue 3, TypeScript, and Tailwind CSS with 80+ handcrafted widgets.');
    uploadForm1.append('categoryId', sampleCategory.id);
    uploadForm1.append('assetType', 'ui_template');
    uploadForm1.append('price', '350000');
    uploadForm1.append('discountPrice', '280000');
    uploadForm1.append('tags', JSON.stringify(['Vue 3', 'Editorial', 'Luxury']));
    uploadForm1.append('thumbnail', new File([validPngBuffer], `cover-${timestamp}.png`, { type: 'image/png' }));
    uploadForm1.append('file', new File([validZipBuffer], `kinetix-deliverable-${timestamp}.zip`, { type: 'application/zip' }));

    const uploadRes1 = await app.fetch(
      new Request('http://localhost:3000/api/assets/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: uploadForm1,
      })
    );
    const uploadData1 = (await uploadRes1.json()) as any;
    const asset1 = uploadData1.data?.asset;

    recordResult(
      uploadRes1.status === 201 && uploadData1.success && !!asset1?.id,
      'Asset upload successful',
      `Asset ID: ${asset1?.id}, Status: ${asset1?.status}`
    );

    // Verify initial status is pending
    recordResult(
      asset1?.status === 'pending',
      'Asset initial status is "pending"',
      `Status: ${asset1?.status}`
    );

    // Verify image URL is full and valid
    recordResult(
      asset1?.thumbnailUrl?.includes('/uploads/thumbnails/'),
      'Thumbnail URL is fully resolved with /uploads/thumbnails/',
      `thumbnailUrl: ${asset1?.thumbnailUrl}`
    );

    // Verify physical file exists on disk
    const diskFileName1 = path.basename(asset1.thumbnailUrl);
    const physicalThumbPath1 = path.join(getUploadsRootDir(), 'thumbnails', diskFileName1);
    const fileExists1 = fs.existsSync(physicalThumbPath1);
    recordResult(
      fileExists1 && fs.statSync(physicalThumbPath1).size === validPngBuffer.length,
      'Physical thumbnail file stored on disk with matching byte length',
      `Path: ${physicalThumbPath1} (${validPngBuffer.length} bytes)`
    );

    // ----------------------------------------------------
    // 4. VERIFY IMAGE STATIC SERVING VIA HTTP
    // ----------------------------------------------------
    console.log('\n--- 4. Verify Static File Serving for Uploaded Image ---');
    const imageHttpRes = await app.fetch(new Request(asset1.thumbnailUrl));
    const imageContentType = imageHttpRes.headers.get('content-type');
    const imageCors = imageHttpRes.headers.get('access-control-allow-origin');
    const imageCorp = imageHttpRes.headers.get('cross-origin-resource-policy');

    recordResult(
      imageHttpRes.status === 200 && imageContentType === 'image/png',
      'HTTP GET to thumbnail URL returns 200 OK with Content-Type: image/png',
      `Status: ${imageHttpRes.status}, Content-Type: ${imageContentType}, Length: ${imageHttpRes.headers.get('content-length')} bytes`
    );

    recordResult(
      imageCors === '*' && imageCorp === 'cross-origin',
      'CORS & Cross-Origin-Resource-Policy headers allow frontend display',
      `Access-Control-Allow-Origin: ${imageCors}, CORP: ${imageCorp}`
    );

    // ----------------------------------------------------
    // 5. VERIFY SELLER "MANAGE MY LISTINGS" SHOWS PENDING ASSET
    // ----------------------------------------------------
    console.log('\n--- 5. Verify Seller "Manage My Listings" Page Data ---');
    const myListingsRes = await app.fetch(
      new Request('http://localhost:3000/api/assets/my', {
        headers: { Authorization: `Bearer ${sellerToken}` },
      })
    );
    const myListingsData = (await myListingsRes.json()) as any;
    const foundInMyListings = myListingsData.data?.assets?.find((a: any) => a.id === asset1.id);

    recordResult(
      !!foundInMyListings && foundInMyListings.status === 'pending',
      'Asset appears in Seller\'s "Manage My Listings" with status "pending"',
      `Title: ${foundInMyListings?.title}, Status: ${foundInMyListings?.status}`
    );

    recordResult(
      foundInMyListings?.thumbnailUrl === asset1.thumbnailUrl,
      'Image URL correctly provided for Seller Listing Card',
      `Card Image: ${foundInMyListings?.thumbnailUrl}`
    );

    // ----------------------------------------------------
    // 6. VERIFY PUBLIC CATALOG HIDES PENDING ASSET
    // ----------------------------------------------------
    console.log('\n--- 6. Verify Public Catalog Hides Pending Asset ---');
    const catalogBeforeRes = await app.fetch(new Request('http://localhost:3000/api/assets'));
    const catalogBeforeData = (await catalogBeforeRes.json()) as any;
    const listedBefore = catalogBeforeData.data?.assets?.some((a: any) => a.id === asset1.id);

    recordResult(
      !listedBefore,
      'Public Catalog strictly hides asset while status is "pending"',
      'Asset not present in public listing before approval'
    );

    // ----------------------------------------------------
    // 7. ADMIN REVIEWS PENDING QUEUE
    // ----------------------------------------------------
    console.log('\n--- 7. Admin Reviews Pending Queue ---');
    const pendingQueueRes = await app.fetch(
      new Request('http://localhost:3000/api/admin/assets/pending', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    );
    const pendingQueueData = (await pendingQueueRes.json()) as any;
    const foundInAdminQueue = pendingQueueData.data?.pendingAssets?.find((a: any) => a.id === asset1.id);

    recordResult(
      !!foundInAdminQueue,
      'Asset appears in Admin Moderation Queue',
      `Queue Item: ${foundInAdminQueue?.title} (ID: ${foundInAdminQueue?.id})`
    );

    recordResult(
      foundInAdminQueue?.thumbnailUrl?.includes('/uploads/thumbnails/'),
      'Admin moderation queue displays asset cover thumbnail URL',
      `Admin Thumbnail: ${foundInAdminQueue?.thumbnailUrl}`
    );

    // ----------------------------------------------------
    // 8. ADMIN APPROVES ASSET
    // ----------------------------------------------------
    console.log('\n--- 8. Admin Approves the Asset ---');
    const approveRes = await app.fetch(
      new Request(`http://localhost:3000/api/admin/assets/${asset1.id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    );
    const approveData = (await approveRes.json()) as any;

    recordResult(
      approveRes.status === 200 && approveData.success && approveData.data?.asset?.status === 'approved',
      'Admin approves asset successfully',
      `Updated Status: ${approveData.data?.asset?.status}`
    );

    // Verify it is no longer in the pending queue
    const pendingQueueAfterRes = await app.fetch(
      new Request('http://localhost:3000/api/admin/assets/pending', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    );
    const pendingQueueAfterData = (await pendingQueueAfterRes.json()) as any;
    const inQueueAfter = pendingQueueAfterData.data?.pendingAssets?.some((a: any) => a.id === asset1.id);

    recordResult(
      !inQueueAfter,
      'Approved asset is cleared from Admin Review Queue',
      'Queue no longer contains approved asset'
    );

    // ----------------------------------------------------
    // 9. VERIFY ASSET APPEARS IN PUBLIC CATALOG & CARDS
    // ----------------------------------------------------
    console.log('\n--- 9. Verify Asset Now Appears Live in Public Catalog ---');
    const catalogAfterRes = await app.fetch(new Request('http://localhost:3000/api/assets'));
    const catalogAfterData = (await catalogAfterRes.json()) as any;
    const catalogItem = catalogAfterData.data?.assets?.find((a: any) => a.id === asset1.id);

    recordResult(
      !!catalogItem,
      'Approved asset immediately visible in public Catalog (AssetCard)',
      `Found in Catalog: ${catalogItem?.title}`
    );

    recordResult(
      catalogItem?.thumbnailUrl === asset1.thumbnailUrl && !!catalogItem?.coverUrl,
      'Catalog Card contains complete cover thumbnail URL for browser display',
      `thumbnailUrl: ${catalogItem?.thumbnailUrl}`
    );

    // ----------------------------------------------------
    // 10. VERIFY ASSET DETAIL PAGE ACCESSIBLE BY ID / SLUG
    // ----------------------------------------------------
    console.log('\n--- 10. Verify Public Asset Detail Page ---');
    const detailRes = await app.fetch(new Request(`http://localhost:3000/api/assets/${asset1.slug}`));
    const detailData = (await detailRes.json()) as any;
    const detailAsset = detailData.data?.asset;

    recordResult(
      detailRes.status === 200 && detailData.success && detailAsset?.id === asset1.id,
      'Public Asset Detail page loads 200 OK by slug',
      `Title: ${detailAsset?.title}, Slug: ${detailAsset?.slug}`
    );

    recordResult(
      detailAsset?.thumbnailUrl === asset1.thumbnailUrl && !!detailAsset?.coverUrl,
      'Asset Detail Hero image URL is properly populated',
      `Hero Image: ${detailAsset?.thumbnailUrl}`
    );

    recordResult(
      Array.isArray(detailAsset?.files) && detailAsset.files.length > 0,
      'Asset Detail deliverable files metadata is attached',
      `Deliverable: ${detailAsset?.files?.[0]?.fileName} (${detailAsset?.files?.[0]?.fileSizeBytes} bytes)`
    );

    // ----------------------------------------------------
    // 11. VERIFY SELLER LISTING NOW SHOWS "APPROVED"
    // ----------------------------------------------------
    console.log('\n--- 11. Verify Seller Listings Updated to "Approved" ---');
    const myListingsApprovedRes = await app.fetch(
      new Request('http://localhost:3000/api/assets/my', {
        headers: { Authorization: `Bearer ${sellerToken}` },
      })
    );
    const myListingsApprovedData = (await myListingsApprovedRes.json()) as any;
    const updatedSellerAsset = myListingsApprovedData.data?.assets?.find((a: any) => a.id === asset1.id);

    recordResult(
      updatedSellerAsset?.status === 'approved',
      'Seller "Manage My Listings" card reflects status "approved" with Live badge',
      `Status in Seller Dashboard: ${updatedSellerAsset?.status}`
    );

    // ----------------------------------------------------
    // 12. TEST REJECT LIFECYCLE (ASSET 2)
    // ----------------------------------------------------
    console.log('\n--- 12. Testing Rejection Flow for Asset 2 ---');
    const asset2Title = `Draft Prototype Widget ${timestamp}`;
    const uploadForm2 = new FormData();
    uploadForm2.append('title', asset2Title);
    uploadForm2.append('shortDescription', 'Quick draft prototype needing feedback.');
    uploadForm2.append('description', 'Sample prototype for testing administrative review rejection and curator feedback lifecycle.');
    uploadForm2.append('categoryId', sampleCategory.id);
    uploadForm2.append('assetType', 'source_code');
    uploadForm2.append('price', '150000');
    uploadForm2.append('tags', JSON.stringify(['Draft', 'Prototype']));
    uploadForm2.append('thumbnail', new File([validPngBuffer], `cover-reject-${timestamp}.png`, { type: 'image/png' }));
    uploadForm2.append('file', new File([validZipBuffer], `draft-${timestamp}.zip`, { type: 'application/zip' }));

    const uploadRes2 = await app.fetch(
      new Request('http://localhost:3000/api/assets/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: uploadForm2,
      })
    );
    const uploadData2 = (await uploadRes2.json()) as any;
    const asset2 = uploadData2.data?.asset;

    recordResult(
      uploadRes2.status === 201 && !!asset2?.id,
      'Second asset uploaded in "pending" status for rejection test',
      `Asset 2 ID: ${asset2?.id}`
    );

    // Admin Rejects Asset 2
    const rejectionReasonText = 'Berkas arsip tidak memuat dokumentasi lisensi open-source dan cover thumbnail belum memenuhi standar resolusi 16:9.';
    const rejectRes = await app.fetch(
      new Request(`http://localhost:3000/api/admin/assets/${asset2.id}/reject`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rejectionReason: rejectionReasonText }),
      })
    );
    const rejectData = (await rejectRes.json()) as any;

    recordResult(
      rejectRes.status === 200 && rejectData.success && rejectData.data?.asset?.status === 'rejected',
      'Admin rejects asset with feedback reason recorded',
      `Status: ${rejectData.data?.asset?.status}, Reason: "${rejectionReasonText}"`
    );

    // Verify Rejected Asset is NOT in Public Catalog
    const catalogRejectRes = await app.fetch(new Request('http://localhost:3000/api/assets'));
    const catalogRejectData = (await catalogRejectRes.json()) as any;
    const isRejectedListed = catalogRejectData.data?.assets?.some((a: any) => a.id === asset2.id);

    recordResult(
      !isRejectedListed,
      'Rejected asset is NOT visible in public marketplace catalog',
      'Correctly excluded from public exploration'
    );

    // Verify Seller Sees Rejection Reason in "Manage My Listings"
    const myListingsRejectRes = await app.fetch(
      new Request('http://localhost:3000/api/assets/my', {
        headers: { Authorization: `Bearer ${sellerToken}` },
      })
    );
    const myListingsRejectData = (await myListingsRejectRes.json()) as any;
    const sellerRejectedAsset = myListingsRejectData.data?.assets?.find((a: any) => a.id === asset2.id);

    recordResult(
      sellerRejectedAsset?.status === 'rejected' && sellerRejectedAsset?.rejectionReason === rejectionReasonText,
      'Seller "Manage My Listings" displays "rejected" status with Curator Rejection Feedback',
      `Feedback received: "${sellerRejectedAsset?.rejectionReason}"`
    );

    recordResult(
      !!sellerRejectedAsset?.thumbnailUrl,
      'Rejected asset card maintains cover thumbnail image display for seller review',
      `Thumbnail: ${sellerRejectedAsset?.thumbnailUrl}`
    );

    // ----------------------------------------------------
    // CLEANUP TRANSIENT TEST ASSETS
    // ----------------------------------------------------
    console.log('\n--- Cleaning up transient test assets ---');
    try {
      const createdAssetIds = [asset1?.id, asset2?.id].filter(Boolean);
      if (createdAssetIds.length > 0) {
        const txItems = await db
          .select({ id: transactionItems.id, transactionId: transactionItems.transactionId })
          .from(transactionItems)
          .where(inArray(transactionItems.assetId, createdAssetIds));

        if (txItems.length > 0) {
          const txItemIds = txItems.map((t) => t.id);
          const txIds = [...new Set(txItems.map((t) => t.transactionId))];
          await db.delete(paymentConfirmations).where(inArray(paymentConfirmations.transactionId, txIds));
          await db.delete(revenueLedger).where(inArray(revenueLedger.transactionId, txIds));
          await db.delete(revenueLedger).where(inArray(revenueLedger.transactionItemId, txItemIds));
          await db.delete(transactionItems).where(inArray(transactionItems.id, txItemIds));
          await db.delete(transactions).where(inArray(transactions.id, txIds));
        }

        await db.delete(cartItems).where(inArray(cartItems.assetId, createdAssetIds));
        await db.delete(assetFiles).where(inArray(assetFiles.assetId, createdAssetIds));
        await db.delete(assets).where(inArray(assets.id, createdAssetIds));
        console.log(`✓ Cleaned up ${createdAssetIds.length} transient test assets. Catalog remains pristine.`);
      }
    } catch (cleanupErr) {
      console.warn('⚠️ Teardown cleanup notice:', cleanupErr);
    }

    // ----------------------------------------------------
    // SUMMARY
    // ----------------------------------------------------
    const failedSteps = testResults.filter((r) => !r.passed);
    console.log('\n================================================================');
    console.log(`📊 END-TO-END TEST SUITE SUMMARY: ${testResults.length} STEPS EXECUTED`);
    console.log(`   Passed: ${testResults.length - failedSteps.length}`);
    console.log(`   Failed: ${failedSteps.length}`);
    console.log('================================================================');

    if (failedSteps.length > 0) {
      console.error('\n❌ SOME STEPS FAILED:');
      failedSteps.forEach((s) => console.error(`  - ${s.step}: ${s.details || ''}`));
      process.exit(1);
    } else {
      console.log('\n🎉 ALL CORE BUSINESS FLOW REQUIREMENTS PASSED WITH 100% SUCCESS!');
      process.exit(0);
    }
  } catch (err: any) {
    console.error('Fatal Test Execution Error:', err);
    process.exit(1);
  }
}

runBusinessFlowE2E();
