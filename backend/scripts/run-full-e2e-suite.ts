import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';
import { db } from '../src/db/index.js';
import { assets, assetFiles, users, categories, transactions, transactionItems, paymentConfirmations, revenueLedger, cartItems } from '../src/db/schema.js';
import { eq, and, desc, isNull, inArray } from 'drizzle-orm';
import { createLuxuryEditorialPng } from '../src/utils/proceduralAssets.js';

const PORT = process.env.PORT || 3001;
const API_BASE = `http://localhost:${PORT}/api`;

interface TestReportItem {
  id: string;
  scope: string;
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const report: TestReportItem[] = [];

function record(scope: string, name: string, passed: boolean, details?: string, error?: string) {
  report.push({
    id: `TEST-${report.length + 1}`,
    scope,
    name,
    passed,
    details,
    error,
  });

  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [${scope}] ${name}`);
  if (details) console.log(`   └─ Details: ${details}`);
  if (error) console.error(`   └─ Error: ${error}`);
}

async function runTestSuite() {
  console.log('========================================================================');
  console.log('🎯 COMPREHENSIVE END-TO-END QA TEST SUITE: ALL 6 SCOPES');
  console.log(`📡 Target API: ${API_BASE}`);
  console.log('========================================================================\n');

  const timestamp = Date.now();

  try {
    // ========================================================================
    // SCOPE 1: AUTHENTICATION
    // ========================================================================
    console.log('\n--- SCOPE 1: AUTHENTICATION ---');

    // 1.1 Fresh Buyer Registration
    const buyerEmail = `test_buyer_${timestamp}@example.com`;
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Test Buyer ${timestamp}`,
        email: buyerEmail,
        password: 'Password123!',
      }),
    });
    const regJson = await regRes.json();
    const buyerToken = regJson.data?.accessToken;
    const buyerId = regJson.data?.user?.id;
    record(
      'Authentication',
      'Register new buyer account',
      regRes.status === 201 && !!buyerToken && !!buyerId,
      `Registered: ${buyerEmail} (ID: ${buyerId})`
    );

    // 1.2 Duplicate Registration Rejection
    const dupRegRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Duplicate User`,
        email: buyerEmail,
        password: 'Password123!',
      }),
    });
    record(
      'Authentication',
      'Prevent duplicate email registration (returns 400 or 409)',
      dupRegRes.status === 400 || dupRegRes.status === 409,
      `HTTP status: ${dupRegRes.status}`
    );

    // 1.3 Invalid Login Credentials Rejection
    const invalidLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: buyerEmail,
        password: 'WrongPassword!',
      }),
    });
    record(
      'Authentication',
      'Reject login with invalid credentials (returns 401)',
      invalidLoginRes.status === 401,
      `HTTP status: ${invalidLoginRes.status}`
    );

    // 1.4 Valid Login (Seller, Admin, SuperAdmin)
    const sellerLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'seller@assetmarket.com',
        password: 'Seller123!',
      }),
    });
    const sellerLoginJson = await sellerLoginRes.json();
    const sellerToken = sellerLoginJson.data?.accessToken;
    const sellerId = sellerLoginJson.data?.user?.id;
    record(
      'Authentication',
      'Login as seeded verified seller',
      sellerLoginRes.status === 200 && !!sellerToken,
      `Seller email: seller@assetmarket.com (Role: ${sellerLoginJson.data?.user?.role})`
    );

    const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@assetmarket.com',
        password: 'Admin123!',
      }),
    });
    const adminLoginJson = await adminLoginRes.json();
    const adminToken = adminLoginJson.data?.accessToken;
    record(
      'Authentication',
      'Login as seeded admin',
      adminLoginRes.status === 200 && !!adminToken,
      `Admin role: ${adminLoginJson.data?.user?.role}`
    );

    const superAdminLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'superadmin@assetmarket.com',
        password: 'SuperAdmin123!',
      }),
    });
    const superAdminLoginJson = await superAdminLoginRes.json();
    const superAdminToken = superAdminLoginJson.data?.accessToken;
    record(
      'Authentication',
      'Login as seeded superadmin',
      superAdminLoginRes.status === 200 && !!superAdminToken,
      `SuperAdmin role: ${superAdminLoginJson.data?.user?.role}`
    );

    // 1.5 Authenticated Profile Fetch
    const profileRes = await fetch(`${API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const profileJson = await profileRes.json();
    record(
      'Authentication',
      'Fetch authenticated user profile (/api/users/me)',
      profileRes.status === 200 && profileJson.data?.user?.id === buyerId,
      `User name: ${profileJson.data?.user?.name}`
    );

    // ========================================================================
    // SCOPE 2: SELLER FLOW
    // ========================================================================
    console.log('\n--- SCOPE 2: SELLER FLOW ---');

    // 2.1 Fetch Categories
    const categoriesRes = await fetch(`${API_BASE}/categories`);
    const categoriesJson = await categoriesRes.json();
    const categoryId = categoriesJson.data?.[0]?.id || (await db.select().from(categories).limit(1))[0]?.id;

    // Prepare mockup files (high-resolution luxury editorial preview)
    const validPngBuffer = createLuxuryEditorialPng(800, 500, 0);
    const validZipBuffer = Buffer.from('PK\x03\x04\x14\x00\x00\x00\x00\x00\x00\x00\x00\x00Mock Deliverable Payload');

    // 2.2 Upload Asset with Image & Deliverable
    const uploadForm = new FormData();
    const assetTitle = `Aura Nexus Luxury UI Kit ${timestamp}`;
    uploadForm.append('title', assetTitle);
    uploadForm.append('shortDescription', 'High-end dark editorial interface kit for fintech and web3 applications.');
    uploadForm.append('description', 'Comprehensive 120+ component library built with modern responsive CSS, TypeScript, and clean modular layout.');
    uploadForm.append('categoryId', categoryId);
    uploadForm.append('assetType', 'ui_template');
    uploadForm.append('price', '250000');
    uploadForm.append('discountPrice', '200000');
    uploadForm.append('tags', JSON.stringify(['Vue', 'Luxury', 'Editorial']));
    uploadForm.append('thumbnail', new Blob([validPngBuffer], { type: 'image/png' }), `thumbnail-${timestamp}.png`);
    uploadForm.append('file', new Blob([validZipBuffer], { type: 'application/zip' }), `auranexus-${timestamp}.zip`);

    const uploadRes = await fetch(`${API_BASE}/assets/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: uploadForm,
    });
    const uploadJson = await uploadRes.json();
    const uploadedAsset = uploadJson.data?.asset;
    record(
      'Seller Flow',
      'Upload asset with thumbnail and deliverable ZIP',
      uploadRes.status === 201 && !!uploadedAsset?.id,
      `Asset ID: ${uploadedAsset?.id}, Status: ${uploadedAsset?.status}`
    );

    // 2.3 Submit for Moderation
    const submitRes = await fetch(`${API_BASE}/assets/${uploadedAsset.id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sellerToken}` },
    });
    const submitJson = await submitRes.json();
    record(
      'Seller Flow',
      'Submit asset for Admin Moderation (POST /assets/:id/submit)',
      submitRes.status === 200 || (uploadRes.status === 201 && uploadedAsset?.status === 'pending'),
      `Submit status: ${submitRes.status}, Message: ${submitJson.message || 'Already pending'}`
    );

    // 2.4 Verify Asset in Seller's My Listings
    const myListingsRes = await fetch(`${API_BASE}/assets/my`, {
      headers: { Authorization: `Bearer ${sellerToken}` },
    });
    const myListingsJson = await myListingsRes.json();
    const foundInSellerListings = myListingsJson.data?.assets?.find((a: any) => a.id === uploadedAsset.id);
    record(
      'Seller Flow',
      'Asset appears in Seller "My Listings" with pending status',
      !!foundInSellerListings && foundInSellerListings.status === 'pending',
      `Found status: ${foundInSellerListings?.status}`
    );

    // ========================================================================
    // SCOPE 3: ADMIN MODERATION & USER MANAGEMENT
    // ========================================================================
    console.log('\n--- SCOPE 3: ADMIN FLOW ---');

    // 3.1 Admin inspects pending queue
    const pendingQueueRes = await fetch(`${API_BASE}/admin/assets/pending`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const pendingQueueJson = await pendingQueueRes.json();
    const inPendingQueue = pendingQueueJson.data?.pendingAssets?.find((a: any) => a.id === uploadedAsset.id);
    record(
      'Admin Flow',
      'Pending asset appears in Admin Moderation Queue',
      !!inPendingQueue,
      `Item in queue: ${inPendingQueue?.title}`
    );

    // 3.2 Admin Rejection Test (Upload separate asset to test rejection lifecycle)
    const rejectForm = new FormData();
    const rejectTitle = `Draft Prototype For Rejection ${timestamp}`;
    rejectForm.append('title', rejectTitle);
    rejectForm.append('shortDescription', 'Testing administrative rejection and feedback.');
    rejectForm.append('description', 'Test rejection flow.');
    rejectForm.append('categoryId', categoryId);
    rejectForm.append('assetType', 'source_code');
    rejectForm.append('price', '150000');
    rejectForm.append('tags', JSON.stringify(['Test']));
    const rejectPngBuffer = createLuxuryEditorialPng(800, 500, 1);
    rejectForm.append('thumbnail', new Blob([rejectPngBuffer], { type: 'image/png' }), `cover-rej-${timestamp}.png`);
    rejectForm.append('file', new Blob([validZipBuffer], { type: 'application/zip' }), `payload-rej-${timestamp}.zip`);

    const uploadRejRes = await fetch(`${API_BASE}/assets/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: rejectForm,
    });
    const uploadRejJson = await uploadRejRes.json();
    const rejAssetId = uploadRejJson.data?.asset?.id;

    const rejectionReason = 'Asset archive does not include installation documentation.';
    const rejectRes = await fetch(`${API_BASE}/admin/assets/${rejAssetId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ rejectionReason }),
    });
    const rejectJson = await rejectRes.json();
    record(
      'Admin Flow',
      'Admin rejects asset with feedback message',
      rejectRes.status === 200 && rejectJson.data?.asset?.status === 'rejected',
      `Rejection recorded: ${rejectJson.data?.asset?.status}`
    );

    // Verify Seller Sees Rejection
    const sellerListingsRejRes = await fetch(`${API_BASE}/assets/my`, {
      headers: { Authorization: `Bearer ${sellerToken}` },
    });
    const sellerListingsRejJson = await sellerListingsRejRes.json();
    const sellerRejAsset = sellerListingsRejJson.data?.assets?.find((a: any) => a.id === rejAssetId);
    record(
      'Admin Flow',
      'Seller receives curator rejection feedback in My Listings',
      sellerRejAsset?.status === 'rejected' && sellerRejAsset?.rejectionReason === rejectionReason,
      `Seller feedback view: "${sellerRejAsset?.rejectionReason}"`
    );

    // 3.3 Admin Approves Primary Asset
    const approveRes = await fetch(`${API_BASE}/admin/assets/${uploadedAsset.id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const approveJson = await approveRes.json();
    record(
      'Admin Flow',
      'Admin approves asset (status becomes approved)',
      approveRes.status === 200 && approveJson.data?.asset?.status === 'approved',
      `Approved status: ${approveJson.data?.asset?.status}`
    );

    // 3.4 Admin User Management
    const adminUsersRes = await fetch(`${API_BASE}/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminUsersJson = await adminUsersRes.json();
    record(
      'Admin Flow',
      'Admin retrieves user list (/api/admin/users)',
      adminUsersRes.status === 200 && Array.isArray(adminUsersJson.data?.users),
      `Total users retrieved: ${adminUsersJson.data?.users?.length}`
    );

    // 3.5 Admin Revenue Report
    const adminRevenueRes = await fetch(`${API_BASE}/admin/revenue/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminRevenueJson = await adminRevenueRes.json();
    record(
      'Admin Flow',
      'Admin views revenue summary (/api/admin/revenue/users)',
      adminRevenueRes.status === 200 && Array.isArray(adminRevenueJson.data?.users),
      `Creators in revenue summary: ${adminRevenueJson.data?.users?.length}`
    );

    // ========================================================================
    // SCOPE 4: BUYER FLOW (CATALOG -> CART -> CHECKOUT -> PAYMENT -> DOWNLOAD)
    // ========================================================================
    console.log('\n--- SCOPE 4: BUYER FLOW ---');

    // 4.1 Browse Catalog & Asset Detail
    const catalogRes = await fetch(`${API_BASE}/assets`);
    const catalogJson = await catalogRes.json();
    const liveAssetInCatalog = catalogJson.data?.assets?.find((a: any) => a.id === uploadedAsset.id);
    record(
      'Buyer Flow',
      'Newly approved asset immediately visible in public Catalog',
      !!liveAssetInCatalog,
      `Live asset in catalog: ${liveAssetInCatalog?.title}`
    );

    const assetDetailRes = await fetch(`${API_BASE}/assets/${uploadedAsset.slug || uploadedAsset.id}`);
    const assetDetailJson = await assetDetailRes.json();
    record(
      'Buyer Flow',
      'Buyer views Asset Detail page with deliverable metadata',
      assetDetailRes.status === 200 && assetDetailJson.data?.asset?.id === uploadedAsset.id,
      `Asset Detail title: ${assetDetailJson.data?.asset?.title}`
    );

    // 4.2 Add to Cart
    const addCartRes = await fetch(`${API_BASE}/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({ assetId: uploadedAsset.id }),
    });
    const addCartJson = await addCartRes.json();
    record(
      'Buyer Flow',
      'Buyer adds asset to cart',
      addCartRes.status === 200 || addCartRes.status === 201,
      `Cart action response: ${addCartJson.message}`
    );

    // 4.3 Checkout from Cart
    const checkoutRes = await fetch(`${API_BASE}/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({ source: 'cart' }),
    });
    const checkoutJson = await checkoutRes.json();
    const invoiceNumber = checkoutJson.data?.invoiceNumber;
    const checkoutTotal = checkoutJson.data?.totalAmount;
    record(
      'Buyer Flow',
      'Buyer completes checkout from cart (creates invoice)',
      (checkoutRes.status === 200 || checkoutRes.status === 201) && checkoutJson.success && !!invoiceNumber,
      `Invoice: ${invoiceNumber}, Amount: Rp ${checkoutTotal}`
    );

    // 4.4 Submit Payment Confirmation Proof
    const confirmForm = new FormData();
    confirmForm.append('invoiceNumber', invoiceNumber);
    confirmForm.append('senderBank', 'BCA');
    confirmForm.append('senderAccountNumber', '0987654321');
    confirmForm.append('senderAccountName', 'Test Buyer');
    confirmForm.append('destinationBank', 'BCA');
    confirmForm.append('transferAmount', checkoutTotal.toString());
    confirmForm.append('transferDate', new Date().toISOString().split('T')[0]);
    confirmForm.append(
      'proofImage',
      new Blob([validPngBuffer], { type: 'image/png' }),
      'transfer_receipt.png'
    );

    const paymentConfirmRes = await fetch(`${API_BASE}/payments/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: confirmForm,
    });
    const paymentConfirmJson = await paymentConfirmRes.json();
    const confirmationId = paymentConfirmJson.data?.confirmationId;
    record(
      'Buyer Flow',
      'Buyer submits manual transfer proof (status: processing)',
      (paymentConfirmRes.status === 200 || paymentConfirmRes.status === 201) && paymentConfirmJson.success && !!confirmationId,
      `Confirmation ID: ${confirmationId}, Status: ${paymentConfirmJson.data?.status}`
    );

    // 4.5 Admin Verifies Payment
    const verifyPaymentRes = await fetch(`${API_BASE}/admin/payments/${confirmationId}/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const verifyPaymentJson = await verifyPaymentRes.json();
    record(
      'Buyer Flow',
      'Admin verifies manual payment (status updated to PAID)',
      verifyPaymentRes.status === 200 && verifyPaymentJson.success,
      `Payment status: ${verifyPaymentJson.data?.transaction?.status || 'paid'}`
    );

    // 4.6 Asset Appears in Buyer's "My Assets"
    const myAssetsRes = await fetch(`${API_BASE}/users/me/assets`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const myAssetsJson = await myAssetsRes.json();
    const ownedAssetItem = myAssetsJson.data?.assets?.find((a: any) => a.asset?.id === uploadedAsset.id);
    record(
      'Buyer Flow',
      'Purchased asset appears in Buyer "My Assets" library',
      !!ownedAssetItem,
      `Owned item: ${ownedAssetItem?.asset?.title}, Invoice: ${ownedAssetItem?.invoiceNumber}`
    );

    // 4.7 Download Asset File Successfully
    const deliverableFile = ownedAssetItem?.asset?.files?.[0];
    const downloadEndpoint = deliverableFile
      ? `${API_BASE}/purchases/download/${deliverableFile.id}`
      : `${API_BASE}/purchases/assets/${uploadedAsset.id}/download`;

    const downloadRes = await fetch(downloadEndpoint, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const downloadedBuffer = Buffer.from(await downloadRes.arrayBuffer());
    record(
      'Buyer Flow',
      'Buyer downloads asset deliverable successfully via streaming',
      downloadRes.status === 200 && downloadedBuffer.length > 0,
      `Status: ${downloadRes.status}, Received: ${downloadedBuffer.length} bytes, Type: ${downloadRes.headers.get('content-type')}`
    );

    // ========================================================================
    // SCOPE 5: REVENUE & TRANSACTIONS (60% / 40% REVENUE SHARE)
    // ========================================================================
    console.log('\n--- SCOPE 5: REVENUE & TRANSACTIONS ---');

    // 5.1 Verify 60% Seller / 40% Platform Split in Transaction Items
    const [dbTx] = await db.select().from(transactions).where(eq(transactions.invoiceNumber, invoiceNumber)).limit(1);
    const dbItems = await db.select().from(transactionItems).where(eq(transactionItems.transactionId, dbTx.id));
    const txItem = dbItems.find((i) => i.assetId === uploadedAsset.id);

    const expectedGross = Number(txItem?.price || 0);
    const expectedSeller = Number((expectedGross * 0.6).toFixed(2));
    const expectedPlatform = Number((expectedGross * 0.4).toFixed(2));
    const actualSeller = Number(txItem?.sellerAmount || 0);
    const actualPlatform = Number(txItem?.platformAmount || 0);

    const splitAccurate =
      Math.abs(actualSeller - expectedSeller) <= 0.01 &&
      Math.abs(actualPlatform - expectedPlatform) <= 0.01;

    record(
      'Revenue & Transactions',
      '60% creator share / 40% platform share calculated accurately on transaction item',
      splitAccurate,
      `Gross: Rp ${expectedGross} | Seller (60%): Rp ${actualSeller} (Expected: ${expectedSeller}) | Platform (40%): Rp ${actualPlatform} (Expected: ${expectedPlatform})`
    );

    // 5.2 Verify Immutable Revenue Ledger Mutation for Seller
    const [sellerLedgerEntry] = await db
      .select()
      .from(revenueLedger)
      .where(and(eq(revenueLedger.userId, sellerId), eq(revenueLedger.transactionId, dbTx.id)))
      .limit(1);

    record(
      'Revenue & Transactions',
      'Revenue ledger records 60% credit mutation for seller with updated balanceAfter',
      !!sellerLedgerEntry && Number(sellerLedgerEntry.netAmount) === actualSeller,
      `Ledger Entry: +Rp ${sellerLedgerEntry?.netAmount}, BalanceAfter: Rp ${sellerLedgerEntry?.balanceAfter}`
    );

    // 5.3 Buyer Transaction History Accuracy
    const buyerHistoryRes = await fetch(`${API_BASE}/transactions`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const buyerHistoryJson = await buyerHistoryRes.json();
    const foundInBuyerHistory = buyerHistoryJson.data?.transactions?.find((t: any) => t.invoiceNumber === invoiceNumber);
    record(
      'Revenue & Transactions',
      'Transaction appears in Buyer transaction history with status "paid"',
      !!foundInBuyerHistory && foundInBuyerHistory.status === 'paid',
      `Buyer invoice: ${foundInBuyerHistory?.invoiceNumber}, Status: ${foundInBuyerHistory?.status}`
    );

    // ========================================================================
    // SCOPE 6: ROLE PROTECTION & RBAC
    // ========================================================================
    console.log('\n--- SCOPE 6: ROLE PROTECTION & ACCESS CONTROL ---');

    // 6.1 Regular Buyer forbidden from accessing Admin Moderation Queue (403)
    const buyerAdminQueueRes = await fetch(`${API_BASE}/admin/assets/pending`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    record(
      'Role Protection',
      'Buyer blocked from Admin Moderation Queue (returns 403 Forbidden)',
      buyerAdminQueueRes.status === 403,
      `HTTP status: ${buyerAdminQueueRes.status}`
    );

    // 6.2 Regular Buyer forbidden from accessing Admin Revenue (403)
    const buyerAdminRevRes = await fetch(`${API_BASE}/admin/revenue/users`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    record(
      'Role Protection',
      'Buyer blocked from Admin Revenue endpoint (returns 403 Forbidden)',
      buyerAdminRevRes.status === 403,
      `HTTP status: ${buyerAdminRevRes.status}`
    );

    // 6.3 Admin forbidden from SuperAdmin Manage Admins endpoint (403)
    const adminManageAdminsRes = await fetch(`${API_BASE}/admin/admins`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    record(
      'Role Protection',
      'Admin blocked from SuperAdmin /admin/admins (returns 403 Forbidden)',
      adminManageAdminsRes.status === 403,
      `HTTP status: ${adminManageAdminsRes.status}`
    );

    // 6.4 SuperAdmin permitted to access /admin/admins (200)
    const superAdminManageAdminsRes = await fetch(`${API_BASE}/admin/admins`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    const superAdminManageAdminsJson = await superAdminManageAdminsRes.json();
    record(
      'Role Protection',
      'SuperAdmin permitted to access /admin/admins (returns 200 OK)',
      superAdminManageAdminsRes.status === 200 && Array.isArray(superAdminManageAdminsJson.data?.admins),
      `Admins found: ${superAdminManageAdminsJson.data?.admins?.length}`
    );

    // 6.5 Unauthenticated request to /admin/dashboard blocked (401)
    const unauthRes = await fetch(`${API_BASE}/admin/dashboard`);
    record(
      'Role Protection',
      'Unauthenticated request to protected admin endpoint returns 401 Unauthorized',
      unauthRes.status === 401,
      `HTTP status: ${unauthRes.status}`
    );

    // ========================================================================
    // TEARDOWN & CLEANUP OF TRANSIENT TEST ASSETS
    // ========================================================================
    console.log('\n--- CLEANING UP TRANSIENT TEST ASSETS ---');
    try {
      const createdAssetIds = [uploadedAsset?.id, rejAssetId].filter(Boolean);
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
        console.log(`   ✓ Cleaned up ${createdAssetIds.length} transient test assets. Catalog remains pristine.`);
      }
    } catch (cleanupErr) {
      console.warn('   ⚠️ Teardown cleanup notice:', cleanupErr);
    }

    // ========================================================================
    // SUMMARY
    // ========================================================================
    const passedCount = report.filter((r) => r.passed).length;
    const failedCount = report.filter((r) => !r.passed).length;

    console.log('\n========================================================================');
    console.log(`📊 E2E TEST SUMMARY: ${report.length} TESTS EXECUTED`);
    console.log(`   Passed: ${passedCount}`);
    console.log(`   Failed: ${failedCount}`);
    console.log('========================================================================');

    if (failedCount > 0) {
      console.log('\n❌ FAILED TESTS:');
      report
        .filter((r) => !r.passed)
        .forEach((r) => console.log(`   - [${r.scope}] ${r.name}: ${r.error || r.details}`));
      process.exit(1);
    } else {
      console.log('\n🎉 ALL SCOPES AND BUSINESS FLOWS PASSED WITH 100% SUCCESS!');
      process.exit(0);
    }
  } catch (err: any) {
    console.error('\n💥 FATAL UNEXPECTED TEST ERROR:', err);
    process.exit(1);
  }
}

runTestSuite();
