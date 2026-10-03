import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';
import { db } from '../src/db/index.js';
import { assets, users, categories } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { app } from '../src/app.js';
import { getUploadsRootDir } from '../src/utils/paths.js';

async function testUploadAndApprove() {
  console.log('====================================================');
  console.log('🧪 FULL-STACK VERIFICATION: UPLOAD, APPROVE & VERIFY');
  console.log('====================================================\n');

  // 1. Get Category & Seller
  const [category] = await db.select().from(categories).limit(1);
  if (!category) throw new Error('No categories found. Run db:seed first.');

  const [seller] = await db.select().from(users).where(eq(users.role, 'user')).limit(1);
  if (!seller) throw new Error('No user found. Run db:seed first.');

  // 2. Login as Seller to get token
  console.log(`[Step 1] Authenticating as Seller (${seller.email})...`);
  const loginRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: seller.email, password: 'User123!' }),
    })
  );
  const loginData = (await loginRes.json()) as any;
  const sellerToken = loginData.data?.accessToken;
  if (!sellerToken) throw new Error('Failed to login as seller: ' + JSON.stringify(loginData));
  console.log('✓ Seller authenticated successfully');

  // 3. Prepare real image and deliverable zip for upload
  console.log('\n[Step 2] Preparing image and deliverable files...');
  // Use existing valid image atelier-noir-showcase.png as source thumbnail buffer
  const sampleImagePath = path.join(getUploadsRootDir(), 'thumbnails', 'atelier-noir-showcase.png');
  const imageBuffer = fs.readFileSync(sampleImagePath);
  const zipBuffer = Buffer.from('PK\x05\x06' + '\x00'.repeat(18)); // Valid minimal zip

  const uniqueId = Date.now();
  const testTitle = `Modern SaaS UI Framework ${uniqueId}`;

  const formData = new FormData();
  formData.append('title', testTitle);
  formData.append('shortDescription', 'Enterprise-grade React and Vue component library with 120+ widgets.');
  formData.append('description', 'Comprehensive multi-framework design system for high-converting fintech and SaaS applications.');
  formData.append('categoryId', category.id);
  formData.append('assetType', 'ui_template');
  formData.append('price', '299000');
  formData.append('discountPrice', '199000');
  formData.append('tags', JSON.stringify(['SaaS', 'UI Kit', 'Enterprise']));
  formData.append(
    'thumbnail',
    new File([imageBuffer], `saas-preview-${uniqueId}.png`, { type: 'image/png' })
  );
  formData.append(
    'file',
    new File([zipBuffer], `saas-bundle-${uniqueId}.zip`, { type: 'application/zip' })
  );

  console.log('\n[Step 3] Uploading asset via POST /api/assets/upload...');
  const uploadRes = await app.fetch(
    new Request('http://localhost:3000/api/assets/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: formData,
    })
  );

  const uploadData = (await uploadRes.json()) as any;
  if (!uploadRes.ok || !uploadData.success) {
    throw new Error('Upload failed: ' + JSON.stringify(uploadData));
  }
  const uploadedAsset = uploadData.data?.asset;
  console.log('✓ Asset uploaded successfully!');
  console.log('  Asset ID:', uploadedAsset.id);
  console.log('  Title:', uploadedAsset.title);
  console.log('  Status:', uploadedAsset.status);
  console.log('  thumbnailUrl:', uploadedAsset.thumbnailUrl);

  // 4. Verify Physical File on Disk
  console.log('\n[Step 4] Verifying physical file on disk vs database record...');
  const diskFileName = path.basename(uploadedAsset.thumbnailUrl);
  const physicalFilePath = path.join(getUploadsRootDir(), 'thumbnails', diskFileName);
  const existsOnDisk = fs.existsSync(physicalFilePath);

  console.log('  URL Path filename:', diskFileName);
  console.log('  Physical file path:', physicalFilePath);
  console.log('  File exists on disk?:', existsOnDisk);

  if (!existsOnDisk) {
    throw new Error(`CRITICAL: Physical file was NOT saved to disk at ${physicalFilePath}!`);
  }

  const fileStats = fs.statSync(physicalFilePath);
  console.log(`  Physical file size: ${fileStats.size} bytes (matches input: ${fileStats.size === imageBuffer.length})`);

  // Query Database to verify record
  const [dbAsset] = await db.select().from(assets).where(eq(assets.id, uploadedAsset.id));
  console.log('  DB stored thumbnailUrl:', dbAsset.thumbnailUrl);
  const dbFileName = path.basename(dbAsset.thumbnailUrl);
  console.log('  DB filename matches disk filename?:', dbFileName === diskFileName);
  if (dbFileName !== diskFileName) {
    throw new Error(`CRITICAL: DB filename (${dbFileName}) does not match disk filename (${diskFileName})!`);
  }

  // 5. Authenticate as Admin and Approve
  console.log('\n[Step 5] Authenticating as Admin and approving asset...');
  const adminLoginRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@assetmarket.com', password: 'Admin123!' }),
    })
  );
  const adminLoginData = (await adminLoginRes.json()) as any;
  const adminToken = adminLoginData.data?.accessToken;
  if (!adminToken) throw new Error('Failed to login as admin: ' + JSON.stringify(adminLoginData));

  const approveRes = await app.fetch(
    new Request(`http://localhost:3000/api/admin/assets/${uploadedAsset.id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    })
  );
  const approveData = (await approveRes.json()) as any;
  if (!approveRes.ok || !approveData.success) {
    throw new Error('Approval failed: ' + JSON.stringify(approveData));
  }
  console.log('✓ Asset approved successfully!');
  console.log('  New Status:', approveData.data?.asset?.status);
  console.log('  Approved asset thumbnailUrl:', approveData.data?.asset?.thumbnailUrl);
  console.log('  Approved asset cover_url:', approveData.data?.asset?.cover_url);
  console.log('  Approved asset image_url:', approveData.data?.asset?.image_url);

  // 6. Test Public Listing API
  console.log('\n[Step 6] Verifying asset appears in GET /api/assets public marketplace...');
  const publicListRes = await app.fetch(new Request('http://localhost:3000/api/assets?limit=10'));
  const publicListData = (await publicListRes.json()) as any;
  const foundInCatalog = publicListData.data?.assets?.find((a: any) => a.id === uploadedAsset.id);

  if (!foundInCatalog) {
    throw new Error('Approved asset NOT found in public marketplace list!');
  }
  console.log('✓ Found approved asset in public listing:');
  console.log('  Title:', foundInCatalog.title);
  console.log('  thumbnailUrl:', foundInCatalog.thumbnailUrl);
  console.log('  thumbnail:', foundInCatalog.thumbnail);
  console.log('  cover_url:', foundInCatalog.cover_url);
  console.log('  image_url:', foundInCatalog.image_url);

  // 7. Test Direct Static File Serving via HTTP
  console.log('\n[Step 7] Testing static file serving for this new asset image...');
  const staticUrl = foundInCatalog.thumbnailUrl;
  const staticRes = await app.fetch(new Request(staticUrl));
  console.log('  HTTP Status:', staticRes.status);
  console.log('  Content-Type:', staticRes.headers.get('content-type'));
  console.log('  CORS Access-Control-Allow-Origin:', staticRes.headers.get('access-control-allow-origin'));
  console.log('  Cross-Origin-Resource-Policy:', staticRes.headers.get('cross-origin-resource-policy'));
  console.log('  Content-Length:', staticRes.headers.get('content-length'));

  if (staticRes.status !== 200) {
    throw new Error(`Failed to fetch static image: HTTP ${staticRes.status}`);
  }

  console.log('\n====================================================');
  console.log('🎉 ALL BACKEND UPLOAD & VERIFICATION CHECKS PASSED!');
  console.log(`Created Asset Slug: ${uploadedAsset.slug}`);
  console.log('====================================================');

  return {
    assetId: uploadedAsset.id,
    slug: uploadedAsset.slug,
    title: uploadedAsset.title,
    thumbnailUrl: foundInCatalog.thumbnailUrl,
  };
}

testUploadAndApprove()
  .then((res) => {
    console.log(JSON.stringify(res));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Test Failed:', err);
    process.exit(1);
  });
