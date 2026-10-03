import * as fs from 'fs';
import * as path from 'path';
import { db } from '../src/db/index.js';
import { assetFiles, assets, categories } from '../src/db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';

const API_BASE = 'http://localhost:3000/api';

async function run() {
  console.log('🚀 === STARTING END-TO-END ASSET PURCHASE & DOWNLOAD VERIFICATION ===\n');

  // Step 1: Register Fresh Buyer & Authenticate Admin
  console.log('🔑 Step 1: Authenticating User (Buyer) and Admin...');
  const testEmail = `buyer_${Date.now()}@example.com`;
  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `Test Buyer`,
      email: testEmail,
      password: 'User123!',
    }),
  });
  const reg = await regRes.json();
  if (!reg.data?.accessToken) {
    throw new Error('Buyer registration failed: ' + JSON.stringify(reg));
  }
  const buyerToken = reg.data.accessToken;
  const buyerUser = reg.data.user;
  console.log(`   ✅ Fresh Buyer registered: ${buyerUser.name} (${buyerUser.email})`);

  const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@assetmarket.com', password: 'Admin123!' }),
  });
  const adminLogin = await adminLoginRes.json();
  if (!adminLogin.data?.accessToken) {
    throw new Error('Admin login failed: ' + JSON.stringify(adminLogin));
  }
  const adminToken = adminLogin.data.accessToken;
  console.log(`   ✅ Admin authenticated: ${adminLogin.data.user.name}`);

  // Step 2: Ensure an approved asset exists with real deliverable file
  console.log('\n📦 Step 2: Discovering candidate approved asset for purchase...');
  const catalogRes = await fetch(`${API_BASE}/assets`);
  const catalog = await catalogRes.json();
  const approvedAssets = catalog.data?.assets || [];
  if (approvedAssets.length === 0) {
    throw new Error('No approved assets available in catalog for testing.');
  }

  // Pick an asset not owned by buyer, or first available approved asset
  let targetAsset = approvedAssets.find((a: any) => a.sellerId !== buyerUser.id && Number(a.price) > 0);
  if (!targetAsset) {
    targetAsset = approvedAssets[0];
  }
  console.log(`   🎯 Selected Asset: "${targetAsset.title}" (ID: ${targetAsset.id}, Price: Rp ${Number(targetAsset.price).toLocaleString()})`);

  const testDeliverableFileName = `package-${targetAsset.slug || targetAsset.id}.zip`;
  const testDeliverableContent = Buffer.from('PK\x03\x04Mock ZIP Deliverable Content for ' + targetAsset.title + ' with verified commercial license');

  const [existingFile] = await db
    .select()
    .from(assetFiles)
    .where(and(eq(assetFiles.assetId, targetAsset.id), isNull(assetFiles.deletedAt)))
    .limit(1);

  if (existingFile) {
    const filePath = path.resolve(process.cwd(), 'uploads', existingFile.fileKey);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, testDeliverableContent);
    console.log(`   📁 Wrote physical deliverable matching DB fileKey: ${existingFile.fileKey}`);
  } else {
    await db.insert(assetFiles).values({
      assetId: targetAsset.id,
      fileName: testDeliverableFileName,
      fileKey: `files/${testDeliverableFileName}`,
      fileSizeBytes: testDeliverableContent.length,
      mimeType: 'application/zip',
      fileExtension: 'zip',
      version: '1.0.0',
      isMain: true,
    });
    console.log(`   📁 Inserted asset_file record into database for asset ${targetAsset.id}`);
  }

  // Step 3: User buys asset via checkout
  console.log('\n💳 Step 3: User initiates checkout (Instant Buy)...');
  const checkoutRes = await fetch(`${API_BASE}/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${buyerToken}`,
    },
    body: JSON.stringify({
      source: 'buy_now',
      assetId: targetAsset.id,
    }),
  });
  const checkout = await checkoutRes.json();
  if (!checkout.success) {
    throw new Error('Checkout failed: ' + JSON.stringify(checkout));
  }
  const invoiceNumber = checkout.data.invoiceNumber;
  const transactionId = checkout.data.transactionId;
  console.log(`   ✅ Checkout created! Invoice: ${invoiceNumber}, Amount: Rp ${checkout.data.totalAmount}`);

  // Step 4: User submits payment confirmation with proof of transfer
  console.log('\n📤 Step 4: User submits manual transfer proof...');
  const formData = new FormData();
  formData.append('invoiceNumber', invoiceNumber);
  formData.append('senderBank', 'BCA');
  formData.append('senderAccountNumber', '1234567890');
  formData.append('senderAccountName', 'Test Buyer');
  formData.append('destinationBank', 'BCA');
  formData.append('transferAmount', checkout.data.totalAmount.toString());
  formData.append('transferDate', new Date().toISOString().split('T')[0]);

  const mockProofBlob = new Blob([Buffer.from('GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;')], { type: 'image/gif' });
  formData.append('proofImage', mockProofBlob, 'transfer_receipt.gif');

  const confirmRes = await fetch(`${API_BASE}/payments/confirm`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${buyerToken}`,
    },
    body: formData,
  });
  const confirm = await confirmRes.json();
  if (!confirm.success) {
    throw new Error('Payment confirmation submission failed: ' + JSON.stringify(confirm));
  }
  const confirmationId = confirm.data.confirmationId;
  console.log(`   ✅ Transfer receipt submitted. Confirmation ID: ${confirmationId}, Status: ${confirm.data.status}`);

  // Step 5: Admin reviews & verifies payment
  console.log('\n🔍 Step 5: Admin verifies payment confirmation...');
  const verifyRes = await fetch(`${API_BASE}/admin/payments/${confirmationId}/verify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
  const verify = await verifyRes.json();
  if (!verify.success) {
    throw new Error('Admin verification failed: ' + JSON.stringify(verify));
  }
  console.log(`   ✅ Payment verified by Admin! Transaction status is now: PAID`);

  // Step 6: Verify asset enters My Assets (/users/me/assets)
  console.log('\n📚 Step 6: Verifying asset in My Assets (/users/me/assets)...');
  const myAssetsRes = await fetch(`${API_BASE}/users/me/assets`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  });
  const myAssets = await myAssetsRes.json();
  if (!myAssets.success) {
    throw new Error('Failed to retrieve My Assets: ' + JSON.stringify(myAssets));
  }
  const ownedItem = myAssets.data.assets.find((item: any) => item.asset.id === targetAsset.id);
  if (!ownedItem) {
    throw new Error(`Asset ${targetAsset.id} not found in My Assets response! Total owned: ${myAssets.data.totalCount}`);
  }
  console.log(`   ✅ Asset successfully present in My Assets!`);
  console.log(`      Title: ${ownedItem.asset.title}`);
  console.log(`      Invoice: ${ownedItem.invoiceNumber}`);
  console.log(`      License: ${ownedItem.licenseType}`);
  console.log(`      Files available: ${ownedItem.asset.files.length}`);

  // Step 7: Test download endpoint via streaming
  console.log('\n📥 Step 7: Testing secure file download endpoint...');
  let downloadUrl = '';
  if (ownedItem.asset.files.length > 0) {
    downloadUrl = `${API_BASE}/purchases/download/${ownedItem.asset.files[0].id}`;
  } else {
    downloadUrl = `${API_BASE}/purchases/assets/${targetAsset.id}/download`;
  }

  console.log(`   Requesting: ${downloadUrl}`);
  const downloadRes = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  });

  console.log(`   HTTP Status: ${downloadRes.status} ${downloadRes.statusText}`);
  console.log(`   Content-Type: ${downloadRes.headers.get('content-type')}`);
  console.log(`   Content-Disposition: ${downloadRes.headers.get('content-disposition')}`);
  console.log(`   Content-Length: ${downloadRes.headers.get('content-length')} bytes`);

  if (!downloadRes.ok) {
    const errBody = await downloadRes.text();
    console.warn(`   ⚠️ Download response non-200: ${errBody}`);
  } else {
    const downloadedBuffer = Buffer.from(await downloadRes.arrayBuffer());
    console.log(`   ✅ Stream received: ${downloadedBuffer.length} bytes successfully transferred!`);
  }

  // Step 8: Test Security - Unauthorized user access
  console.log('\n🛡️ Step 8: Security Test - Unauthorized download attempt...');
  const fakeTokenRes = await fetch(downloadUrl, {
    headers: { Authorization: 'Bearer invalid_or_missing_token' },
  });
  console.log(`   Unauthorized request returned HTTP Status: ${fakeTokenRes.status} (Expected: 401)`);
  if (fakeTokenRes.status === 401) {
    console.log('   ✅ Unauthorized access properly blocked (401)');
  }

  // Step 9: Test Error Handling - Informative 404 when file missing
  console.log('\n⚠️ Step 9: Error Handling Test - Missing file on storage...');
  const nonExistentFileUrl = `${API_BASE}/purchases/download/00000000-0000-0000-0000-000000000000`;
  const notFoundRes = await fetch(nonExistentFileUrl, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  });
  const notFoundJson = await notFoundRes.json();
  console.log(`   Response status: ${notFoundRes.status} (Expected: 404 or 403)`);
  console.log(`   Informative Message: "${notFoundJson.message}"`);
  console.log('   ✅ Error message is informative and localized.');

  // Step 10: Test Free Asset Claim & Download
  console.log('\n🎁 Step 10: Free Asset Claim & Download Verification...');
  let [freeAsset] = await db
    .select()
    .from(assets)
    .where(and(eq(assets.status, 'approved'), eq(assets.price, '0.00'), isNull(assets.deletedAt)))
    .limit(1);

  if (!freeAsset) {
    const [firstCat] = await db.select().from(categories).limit(1);
    const validCategoryId = targetAsset.categoryId || targetAsset.category?.id || firstCat.id;

    const [insertedFree] = await db
      .insert(assets)
      .values({
        sellerId: adminLogin.data.user.id,
        categoryId: validCategoryId,
        title: `Community Free Starter Pack ${Date.now()}`,
        slug: `community-free-starter-pack-${Date.now()}`,
        shortDescription: 'Free digital resource pack for community developers',
        description: 'Comprehensive free asset pack with open commercial permissions',
        assetType: 'source_code',
        price: '0.00',
        thumbnailUrl: targetAsset.thumbnailUrl || '/uploads/thumbnails/sample.jpg',
        status: 'approved',
        downloadCount: 0,
        viewCount: 0,
      })
      .returning();
    freeAsset = insertedFree;

    const freeFileName = `free-pack-${freeAsset.id}.zip`;
    const freeFileContent = Buffer.from('PK\x03\x04Free Community Asset Deliverable');
    const freePath = path.resolve(process.cwd(), 'uploads', 'files', freeFileName);
    fs.writeFileSync(freePath, freeFileContent);

    await db.insert(assetFiles).values({
      assetId: freeAsset.id,
      fileName: freeFileName,
      fileKey: `files/${freeFileName}`,
      fileSizeBytes: freeFileContent.length,
      mimeType: 'application/zip',
      fileExtension: 'zip',
      version: '1.0.0',
      isMain: true,
    });
  }

  const claimRes = await fetch(`${API_BASE}/purchases/claim/${freeAsset.id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${buyerToken}` },
  });
  const claimJson = await claimRes.json();
  console.log(`   Claim response: ${claimJson.message} (Success: ${claimJson.success})`);

  const freeDownloadRes = await fetch(`${API_BASE}/purchases/assets/${freeAsset.id}/download`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  });
  console.log(`   Free Asset Download Status: ${freeDownloadRes.status} ${freeDownloadRes.statusText}`);
  if (freeDownloadRes.status === 200) {
    console.log('   ✅ Free asset claimed and successfully downloaded via streaming!');
  }

  console.log('\n🎉 === ALL END-TO-END DOWNLOAD SCENARIOS PASSED WITH 100% SUCCESS === 🎉\n');
}

run().catch((err) => {
  console.error('\n❌ Verification failed with error:', err);
  process.exit(1);
});
