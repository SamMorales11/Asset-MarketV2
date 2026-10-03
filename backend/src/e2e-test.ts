import { app } from './app.js';
import { db } from './db/index.js';
import { users, assets, categories, transactions } from './db/schema.js';
import { eq } from 'drizzle-orm';

interface TestResult {
  step: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, step: string, details?: string) {
  results.push({ step, passed: !!condition, details });
  if (!condition) {
    console.error(`❌ FAILED: ${step}`, details || '');
  } else {
    console.log(`✅ PASSED: ${step}`);
  }
}

async function runE2E() {
  console.log('\n======================================================');
  console.log('🚀 RUNNING END-TO-END SYSTEM INTEGRATION TEST');
  console.log('======================================================\n');

  try {
    const timestamp = Date.now();
    const sellerEmail = `seller_${timestamp}@test.com`;
    const buyerEmail = `buyer_${timestamp}@test.com`;
    const password = 'Password123!';

    // ----------------------------------------------------
    // TEST 1: AUTHENTICATION FLOW
    // ----------------------------------------------------
    console.log('\n--- 1. Testing Registration & Authentication ---');

    // 1.1 Register Seller
    const regSellerRes = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Auto Test Seller',
        email: sellerEmail,
        password,
      }),
    });
    const regSellerData = (await regSellerRes.json()) as any;
    assert(regSellerRes.status === 201 && regSellerData.success, 'Register new Seller account');

    // 1.2 Login Seller
    const loginSellerRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: sellerEmail, password }),
    });
    const loginSellerData = (await loginSellerRes.json()) as any;
    const sellerToken = loginSellerData.data?.accessToken;
    assert(loginSellerRes.status === 200 && !!sellerToken, 'Login as Seller and acquire JWT Access Token');

    // 1.3 Register Buyer
    const regBuyerRes = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Auto Test Buyer',
        email: buyerEmail,
        password,
      }),
    });
    const regBuyerData = (await regBuyerRes.json()) as any;
    assert(regBuyerRes.status === 201 && regBuyerData.success, 'Register new Buyer account');

    // 1.4 Login Buyer
    const loginBuyerRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: buyerEmail, password }),
    });
    const loginBuyerData = (await loginBuyerRes.json()) as any;
    const buyerToken = loginBuyerData.data?.accessToken;
    assert(loginBuyerRes.status === 200 && !!buyerToken, 'Login as Buyer and acquire JWT Access Token');

    // 1.5 Login Admin (from seed)
    const loginAdminRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@assetmarket.com', password: 'Admin123!' }),
    });
    const loginAdminData = (await loginAdminRes.json()) as any;
    const adminToken = loginAdminData.data?.accessToken;
    assert(loginAdminRes.status === 200 && !!adminToken, 'Login as Seeded Admin');

    // 1.6 Login SuperAdmin (from seed)
    const loginSuperAdminRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'superadmin@assetmarket.com', password: 'SuperAdmin123!' }),
    });
    const loginSuperAdminData = (await loginSuperAdminRes.json()) as any;
    const superAdminToken = loginSuperAdminData.data?.accessToken;
    assert(loginSuperAdminRes.status === 200 && !!superAdminToken, 'Login as Seeded SuperAdmin');

    // ----------------------------------------------------
    // TEST 2: ASSET UPLOAD & ADMIN APPROVAL FLOW
    // ----------------------------------------------------
    console.log('\n--- 2. Testing Asset Upload & Approval Lifecycle ---');

    // Get a valid category
    const [sampleCategory] = await db.select().from(categories).limit(1);
    assert(!!sampleCategory, 'Retrieve active category for upload');

    // 2.1 Upload Asset as Seller
    const formData = new FormData();
    formData.append('title', `Editorial Luxury Template ${timestamp}`);
    formData.append('shortDescription', 'A stunning editorial template for testing');
    formData.append('description', 'Comprehensive description of the test digital asset with high craftsmanship.');
    formData.append('categoryId', sampleCategory!.id);
    formData.append('assetType', 'ui_template');
    formData.append('price', '250000');
    formData.append('tags', JSON.stringify(['Vue 3', 'Editorial']));

    const validPngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    const dummyThumb = new File([validPngBuffer], 'cover.png', { type: 'image/png' });
    const dummyArchive = new File([Buffer.from('fake-zip-archive-deliverable-bytes')], 'deliverable.zip', {
      type: 'application/zip',
    });
    formData.append('thumbnail', dummyThumb);
    formData.append('file', dummyArchive);

    const uploadRes = await app.request('/api/assets/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: formData,
    });
    const uploadData = (await uploadRes.json()) as any;
    assert(uploadRes.status === 201 && uploadData.success, 'Upload new digital asset deliverable as Seller');

    const createdAssetId = uploadData.data?.asset?.id;
    assert(!!createdAssetId, 'Asset record successfully created in DB');

    // 2.2 Verify asset is in 'pending' status
    const [pendingDb] = await db.select().from(assets).where(eq(assets.id, createdAssetId));
    assert(pendingDb?.status === 'pending', 'Asset is initially in pending moderation status');

    // 2.3 Verify public catalog does NOT show pending asset
    const publicCatalogRes = await app.request('/api/assets');
    const publicCatalogData = (await publicCatalogRes.json()) as any;
    const isListedBefore = publicCatalogData.data?.assets?.some((a: any) => a.id === createdAssetId);
    assert(!isListedBefore, 'Pending asset is hidden from public explore catalog');

    // 2.4 Verify Admin can view asset in Pending Queue
    const adminQueueRes = await app.request('/api/admin/assets/pending', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminQueueData = (await adminQueueRes.json()) as any;
    const inQueue = adminQueueData.data?.pendingAssets?.some((a: any) => a.id === createdAssetId);
    assert(inQueue, 'Pending asset is present in Admin Review Queue');

    // 2.5 Admin Approves the Asset
    const approveRes = await app.request(`/api/admin/assets/${createdAssetId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const approveData = (await approveRes.json()) as any;
    assert(approveRes.status === 200 && approveData.success, 'Admin approves asset publication');

    // 2.6 Verify public catalog NOW lists the approved asset
    const publicCatalogAfterRes = await app.request('/api/assets');
    const publicCatalogAfterData = (await publicCatalogAfterRes.json()) as any;
    const isListedAfter = publicCatalogAfterData.data?.assets?.some((a: any) => a.id === createdAssetId);
    assert(isListedAfter, 'Approved asset is now live in public marketplace catalog');

    // ----------------------------------------------------
    // TEST 3: CART, CHECKOUT, ESCROW & 60/40 SPLIT
    // ----------------------------------------------------
    console.log('\n--- 3. Testing Cart, Checkout, & Payment Verification ---');

    // 3.1 Buyer Adds Asset to Cart
    const addCartRes = await app.request('/api/cart/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({ assetId: createdAssetId }),
    });
    const addCartData = (await addCartRes.json()) as any;
    assert([200, 201].includes(addCartRes.status) && addCartData.success, 'Buyer adds asset to cart');

    // 3.2 Buyer Checks Out from Cart
    const checkoutRes = await app.request('/api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({
        paymentMethod: 'manual_transfer',
        destinationBank: 'BCA',
        notes: 'Testing checkout flow',
      }),
    });
    const checkoutData = (await checkoutRes.json()) as any;
    assert(checkoutRes.status === 201 && checkoutData.success, 'Buyer executes checkout and generates invoice');

    const invoiceNumber = checkoutData.data?.invoiceNumber || checkoutData.data?.transaction?.invoiceNumber;
    assert(!!invoiceNumber, `Generated Invoice Number: ${invoiceNumber}`);

    // 3.3 Buyer checks initial transaction status -> 'pending'
    const txStatusRes = await app.request(`/api/transactions/${invoiceNumber}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const txStatusData = (await txStatusRes.json()) as any;
    assert(txStatusData.data?.transaction?.status === 'pending', 'Initial transaction status is pending payment');

    // 3.4 Buyer attempts to download deliverable BEFORE payment verification -> MUST BE 403 FORBIDDEN!
    const earlyDownloadRes = await app.request(`/api/assets/${createdAssetId}/download`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    assert(earlyDownloadRes.status === 403, 'Unauthorized buyer is blocked from downloading unconfirmed asset (403)');

    // 3.5 Buyer Submits Payment Confirmation with Receipt
    const confirmForm = new FormData();
    confirmForm.append('invoiceNumber', invoiceNumber);
    confirmForm.append('senderBank', 'BCA');
    confirmForm.append('senderAccountNumber', '8271928371');
    confirmForm.append('senderAccountName', 'Auto Test Buyer');
    confirmForm.append('destinationBank', 'BCA');
    confirmForm.append('transferAmount', '250000');
    confirmForm.append('transferDate', new Date().toISOString());

    const validJpegBuffer = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
    const dummyReceipt = new File([validJpegBuffer], 'receipt.jpg', { type: 'image/jpeg' });
    confirmForm.append('proofImage', dummyReceipt);

    const submitProofRes = await app.request('/api/payments/confirm', {
      method: 'POST',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: confirmForm,
    });
    const submitProofData = (await submitProofRes.json()) as any;
    assert([200, 201].includes(submitProofRes.status) && submitProofData.success, 'Buyer submits transfer receipt confirmation');

    // 3.6 Check transaction status -> now 'processing'
    const [processingTx] = await db.select().from(transactions).where(eq(transactions.invoiceNumber, invoiceNumber));
    assert(processingTx?.status === 'processing', 'Transaction transitions to processing status awaiting admin verification');

    // 3.7 Admin Verifies Payment & Triggers 60/40 Split
    const adminPaymentsRes = await app.request('/api/admin/payments/pending', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminPaymentsData = (await adminPaymentsRes.json()) as any;
    const pendingPaymentItem = adminPaymentsData.data?.pendingPayments?.find(
      (p: any) => p.transaction.invoiceNumber === invoiceNumber
    );
    assert(!!pendingPaymentItem, 'Admin pending payments queue contains the invoice');

    const verifyRes = await app.request(`/api/admin/payments/${pendingPaymentItem.id}/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const verifyData = (await verifyRes.json()) as any;
    assert(verifyRes.status === 200 && verifyData.success, 'Admin verifies payment confirmation successfully');

    // ----------------------------------------------------
    // TEST 4: MY ASSETS, DOWNLOAD & REVENUE 60/40
    // ----------------------------------------------------
    console.log('\n--- 4. Testing My Assets, Downloads, & Revenue Ledger ---');

    // 4.1 Verify Transaction is now 'paid'
    const [paidTx] = await db.select().from(transactions).where(eq(transactions.invoiceNumber, invoiceNumber));
    assert(paidTx?.status === 'paid', 'Transaction status is officially updated to paid');

    // 4.2 Buyer retrieves purchased assets
    const myPurchasesRes = await app.request('/api/purchases/my', {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const myPurchasesData = (await myPurchasesRes.json()) as any;
    const hasPurchasedAsset = myPurchasesData.data?.purchases?.some(
      (p: any) => p.invoiceNumber === invoiceNumber
    );
    assert(hasPurchasedAsset, 'Purchased asset appears in Buyer My Assets vault');

    // 4.3 Buyer Downloads Deliverable File Securely
    const deliverableDownloadRes = await app.request(`/api/assets/${createdAssetId}/download`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    assert(
      deliverableDownloadRes.status === 200,
      'Authorized buyer successfully downloads deliverable file (200 OK)'
    );

    // 4.4 Seller checks Creator Revenue (60% split = 150,000 IDR)
    const sellerRevenueRes = await app.request('/api/users/me/revenue', {
      headers: { Authorization: `Bearer ${sellerToken}` },
    });
    const sellerRevenueData = (await sellerRevenueRes.json()) as any;
    const creatorEarnings = Number(sellerRevenueData.data?.summary?.creatorEarnings || 0);
    const availableBalance = Number(sellerRevenueData.data?.summary?.availableBalance || 0);
    assert(
      creatorEarnings === 150000 && availableBalance === 150000,
      `Seller 60% revenue credited correctly: ${creatorEarnings} IDR (60% of 250,000)`
    );

    // ----------------------------------------------------
    // TEST 5: ROLE-BASED ACCESS CONTROL (RBAC)
    // ----------------------------------------------------
    console.log('\n--- 5. Testing Role-Based Protection & Security Matrix ---');

    // 5.1 Buyer (role: 'user') tries to access Admin route -> 403 Forbidden
    const buyerAdminAccessRes = await app.request('/api/admin/dashboard', {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    assert(buyerAdminAccessRes.status === 403, 'Regular User is strictly blocked from Admin routes (403)');

    // 5.2 Admin (role: 'admin') tries to access SuperAdmin-only manage admins route -> 403 Forbidden
    const adminManageAdminRes = await app.request('/api/admin/admins', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminManageAdminRes.status === 403, 'Standard Admin is strictly blocked from SuperAdmin manage admins (403)');

    // 5.3 SuperAdmin (role: 'superadmin') accesses manage admins -> 200 OK
    const superAdminManageRes = await app.request('/api/admin/admins', {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert(superAdminManageRes.status === 200, 'SuperAdmin has full access to manage admins (200 OK)');

    // 5.4 SuperAdmin tries to delete self -> 400 Bad Request
    const [superAdminDb] = await db.select().from(users).where(eq(users.email, 'superadmin@assetmarket.com')).limit(1);
    assert(!!superAdminDb, 'Seeded SuperAdmin user exists in database');
    const deleteSelfRes = await app.request(`/api/admin/admins/${superAdminDb!.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert(deleteSelfRes.status === 400, 'SuperAdmin is prevented from deleting self (400)');

    const failedSteps = results.filter((r) => !r.passed);
    if (failedSteps.length > 0) {
      console.error(`\n❌ TEST SUITE FAILED with ${failedSteps.length} failed steps!`);
      process.exit(1);
    }

    console.log('\n======================================================');
    console.log('🎉 ALL INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
    console.log('======================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('Fatal E2E Error:', error);
    process.exit(1);
  }
}

runE2E();
