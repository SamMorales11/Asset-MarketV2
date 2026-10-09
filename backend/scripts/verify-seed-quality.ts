import { app } from '../src/app.js';
import * as fs from 'fs';
import * as path from 'path';
import { getUploadsRootDir } from '../src/utils/paths.js';

interface LoginResult {
  email: string;
  success: boolean;
  role?: string;
  token?: string;
  error?: string;
}

async function loginUser(email: string, password: string): Promise<LoginResult> {
  const req = new Request('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const res = await app.fetch(req);
  const data = (await res.json()) as any;
  if (res.ok && data.success) {
    return {
      email,
      success: true,
      role: data.data?.user?.role,
      token: data.data?.accessToken || data.data?.tokens?.accessToken,
    };
  }
  return { email, success: false, error: data.message };
}

async function verifyAll() {
  console.log('====================================================');
  console.log('🔍 VERIFYING SEEDED DATA QUALITY & ENDPOINTS');
  console.log('====================================================\n');

  let allPassed = true;

  // 1. Verify Demo Accounts Authentication
  console.log('1. Testing Demo Accounts Login:');
  const demoLogins = [
    { email: 'superadmin@assetmarket.com', pass: 'SuperAdmin123!', expectedRole: 'superadmin' },
    { email: 'admin@assetmarket.com', pass: 'Admin123!', expectedRole: 'admin' },
    { email: 'user@assetmarket.com', pass: 'User123!', expectedRole: 'user' },
    { email: 'seller@assetmarket.com', pass: 'Seller123!', expectedRole: 'user' },
  ];

  const authTokens: Record<string, string> = {};

  for (const acc of demoLogins) {
    const res = await loginUser(acc.email, acc.pass);
    if (res.success && res.role === acc.expectedRole) {
      console.log(`  ✓ Login OK: ${acc.email} (Role: ${res.role})`);
      authTokens[acc.email] = res.token!;
    } else {
      console.error(`  ✗ Login FAILED: ${acc.email} (${res.error})`);
      allPassed = false;
    }
  }

  // 2. Verify Catalog Assets
  console.log('\n2. Testing Public Catalog (/api/assets):');
  const catalogReq = new Request('http://localhost:3001/api/assets?limit=50');
  const catalogRes = await app.fetch(catalogReq);
  const catalogData = (await catalogRes.json()) as any;
  const assetsList = catalogData.data?.assets || [];
  console.log(`  ✓ Total Assets returned: ${assetsList.length}`);

  const uploadsRoot = getUploadsRootDir();
  console.log(`  Checking thumbnails on disk (${uploadsRoot}/thumbnails):`);
  let validThumbs = 0;
  let corruptedThumbs = 0;

  for (const a of assetsList) {
    const thumbUrl = a.thumbnailUrl;
    if (!thumbUrl) {
      console.error(`  ✗ Asset missing thumbnailUrl: ${a.title}`);
      allPassed = false;
      continue;
    }

    const cleanThumbPath = thumbUrl.replace(/^http:\/\/[^/]+/, '').replace(/^\/uploads\/?/, '');
    const diskPath = path.join(uploadsRoot, cleanThumbPath);

    if (fs.existsSync(diskPath)) {
      const stats = fs.statSync(diskPath);
      if (stats.size > 2000) {
        validThumbs++;
      } else {
        console.warn(`  ⚠️ Thumbnail file too small (${stats.size} bytes): ${diskPath}`);
        corruptedThumbs++;
        allPassed = false;
      }
    } else {
      console.error(`  ✗ Disk file not found for thumbnail: ${diskPath} (URL: ${thumbUrl})`);
      allPassed = false;
    }
  }

  console.log(`  ✓ Valid high-res thumbnails: ${validThumbs}/${assetsList.length}`);
  if (corruptedThumbs > 0) {
    console.error(`  ✗ Corrupted/small thumbnails: ${corruptedThumbs}`);
  }

  // 3. Verify My Assets (Purchased Assets for Demo User)
  console.log('\n3. Testing My Assets / Purchases (/api/users/me/assets) for Demo User:');
  const myAssetsReq = new Request('http://localhost:3001/api/users/me/assets', {
    headers: { Authorization: `Bearer ${authTokens['user@assetmarket.com']}` },
  });
  const myAssetsRes = await app.fetch(myAssetsReq);
  const myAssetsData = (await myAssetsRes.json()) as any;
  const purchasedAssets = myAssetsData.data?.assets || [];
  console.log(`  ✓ Purchased Assets count: ${purchasedAssets.length}`);
  purchasedAssets.forEach((p: any) => {
    const filesCount = p.asset?.files?.length || 0;
    console.log(`    - [${p.invoiceNumber}] ${p.asset?.title} (Files: ${filesCount})`);
  });
  if (purchasedAssets.length === 0) {
    console.error('  ✗ Expected purchased assets for Demo User, but got 0!');
    allPassed = false;
  }

  // 4. Verify Transactions for Demo User
  console.log('\n4. Testing Transactions History (/api/users/me/transactions) for Demo User:');
  const txReq = new Request('http://localhost:3001/api/users/me/transactions', {
    headers: { Authorization: `Bearer ${authTokens['user@assetmarket.com']}` },
  });
  const txRes = await app.fetch(txReq);
  const txData = (await txRes.json()) as any;
  const userTxs = txData.data?.transactions || [];
  console.log(`  ✓ Total Transactions: ${userTxs.length}`);
  console.log(`  ✓ Summary Spent: Rp ${Number(txData.data?.summary?.totalSpent || 0).toLocaleString('id-ID')}`);
  userTxs.forEach((t: any) => {
    console.log(`    - ${t.invoiceNumber} | ${t.status} | Rp ${Number(t.grossAmount).toLocaleString('id-ID')} | ${t.assetTitle}`);
  });

  // 5. Verify My Listings for Demo Seller
  console.log('\n5. Testing My Listings (/api/assets/my) for Demo Seller:');
  const listingsReq = new Request('http://localhost:3001/api/assets/my', {
    headers: { Authorization: `Bearer ${authTokens['seller@assetmarket.com']}` },
  });
  const listingsRes = await app.fetch(listingsReq);
  const listingsData = (await listingsRes.json()) as any;
  const sellerListings = listingsData.data?.assets || [];
  console.log(`  ✓ Seller Listings count: ${sellerListings.length}`);
  sellerListings.forEach((l: any) => {
    console.log(`    - [${l.status.toUpperCase()}] ${l.title} (Price: Rp ${Number(l.price).toLocaleString('id-ID')})`);
  });
  if (sellerListings.length === 0) {
    console.error('  ✗ Expected listings for Demo Seller, but got 0!');
    allPassed = false;
  }

  // 6. Verify Revenue for Demo Seller
  console.log('\n6. Testing Creator Revenue (/api/users/me/revenue) for Demo Seller:');
  const revReq = new Request('http://localhost:3001/api/users/me/revenue', {
    headers: { Authorization: `Bearer ${authTokens['seller@assetmarket.com']}` },
  });
  const revRes = await app.fetch(revReq);
  const revData = (await revRes.json()) as any;
  const revenueSummary = revData.data?.summary;
  const ledgerEntries = revData.data?.ledgerEntries || [];
  console.log(`  ✓ Gross Revenue: Rp ${Number(revenueSummary?.grossSales || 0).toLocaleString('id-ID')}`);
  console.log(`  ✓ Creator 60% Earnings: Rp ${Number(revenueSummary?.creatorEarnings || 0).toLocaleString('id-ID')}`);
  console.log(`  ✓ Platform 40% Commission: Rp ${Number(revenueSummary?.platformFees || 0).toLocaleString('id-ID')}`);
  console.log(`  ✓ Available Balance: Rp ${Number(revenueSummary?.availableBalance || 0).toLocaleString('id-ID')}`);
  console.log(`  ✓ Total Withdrawn: Rp ${Number(revenueSummary?.withdrawnTotal || 0).toLocaleString('id-ID')}`);
  console.log(`  ✓ Total Sales Count: ${revenueSummary?.totalSalesVolume || 0}`);
  console.log(`  ✓ Ledger Mutation Entries: ${ledgerEntries.length}`);

  if (!revenueSummary || Number(revenueSummary.availableBalance) === 0) {
    console.error('  ✗ Expected available balance for Demo Seller, but got 0!');
    allPassed = false;
  }

  // 7. Verify Admin Pending Review Queues
  console.log('\n7. Testing Admin Moderation Queues for Admin Moderator:');
  const pendingAssetsReq = new Request('http://localhost:3001/api/admin/assets/pending', {
    headers: { Authorization: `Bearer ${authTokens['admin@assetmarket.com']}` },
  });
  const pendingAssetsRes = await app.fetch(pendingAssetsReq);
  const pendingAssetsData = (await pendingAssetsRes.json()) as any;
  const pendingAssets = pendingAssetsData.data?.pendingAssets || [];
  console.log(`  ✓ Pending Assets for Review: ${pendingAssets.length}`);
  pendingAssets.forEach((p: any) => {
    console.log(`    - [PENDING] ${p.title} (Seller: ${p.seller?.name || p.seller?.email})`);
  });
  if (pendingAssets.length === 0) {
    console.error('  ✗ Expected at least 1 pending asset for Admin review queue!');
    allPassed = false;
  }

  const pendingPaymentsReq = new Request('http://localhost:3001/api/admin/payments/pending', {
    headers: { Authorization: `Bearer ${authTokens['admin@assetmarket.com']}` },
  });
  const pendingPaymentsRes = await app.fetch(pendingPaymentsReq);
  const pendingPaymentsData = (await pendingPaymentsRes.json()) as any;
  const pendingPayments = pendingPaymentsData.data?.pendingPayments || [];
  console.log(`  ✓ Pending Payments for Verification: ${pendingPayments.length}`);
  pendingPayments.forEach((p: any) => {
    console.log(`    - [PENDING PAYMENT] ${p.transaction?.invoiceNumber || p.invoiceNumber} (Rp ${Number(p.transferAmount).toLocaleString('id-ID')})`);
  });
  if (pendingPayments.length === 0) {
    console.error('  ✗ Expected at least 1 pending payment confirmation for Admin verification queue!');
    allPassed = false;
  }

  console.log('\n====================================================');
  if (allPassed) {
    console.log('🎉 ALL INTEGRATION & QUALITY CHECKS PASSED PERFECTLY!');
  } else {
    console.log('⚠️ SOME CHECKS FAILED. PLEASE REVIEW LOG ABOVE.');
  }
  console.log('====================================================\n');

  process.exit(allPassed ? 0 : 1);
}

verifyAll().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
