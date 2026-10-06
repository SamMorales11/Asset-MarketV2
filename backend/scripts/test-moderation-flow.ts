
const PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${PORT}/api`;

async function run() {
  console.log('=== TESTING MODERATION FLOW END-TO-END ===\n');

  // 1. Seller Login
  console.log('1. Logging in as Demo Seller...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'seller@assetmarket.com',
      password: 'Seller123!',
    }),
  });
  const loginData: any = await loginRes.json();
  if (!loginData.success || !loginData.data?.accessToken) {
    throw new Error('Seller login failed: ' + JSON.stringify(loginData));
  }
  const sellerToken = loginData.data.accessToken;
  console.log('✓ Seller logged in successfully.');

  // 2. Fetch My Listings
  console.log('\n2. Fetching seller listings (GET /assets/my)...');
  const myListingsRes = await fetch(`${BASE_URL}/assets/my`, {
    headers: { Authorization: `Bearer ${sellerToken}` },
  });
  const myListingsData: any = await myListingsRes.json();
  const sellerAssets: any[] = myListingsData.data?.assets || [];
  console.log(`✓ Retrieved ${sellerAssets.length} seller assets.`);

  const rejectedAsset = sellerAssets.find((a) => a.status === 'rejected');
  if (!rejectedAsset) {
    console.log('Current statuses:', sellerAssets.map((a) => `${a.slug}: ${a.status}`));
    throw new Error('Expected at least one rejected asset in seller listings.');
  }
  console.log(`✓ Found rejected asset: "${rejectedAsset.title}" (ID: ${rejectedAsset.id}, Status: ${rejectedAsset.status})`);
  console.log(`  Rejection feedback: "${rejectedAsset.rejectionReason}"`);

  // 3. Test submitting the rejected asset for moderation
  console.log('\n3. Submitting rejected asset for moderation (POST /assets/:id/submit)...');
  const submitRes = await fetch(`${BASE_URL}/assets/${rejectedAsset.id}/submit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sellerToken}`,
      'Content-Type': 'application/json',
    },
  });
  const submitData: any = await submitRes.json();
  console.log('Submit response status:', submitRes.status);
  console.log('Submit response body:', submitData);

  if (!submitRes.ok || !submitData.success || submitData.data?.asset?.status !== 'pending') {
    throw new Error('Expected status to become pending!');
  }
  console.log('✓ Asset successfully submitted and status is now pending!');

  // 4. Test submitting again while already pending (edge case: should return 400)
  console.log('\n4. Testing duplicate submission while pending (edge case)...');
  const dupRes = await fetch(`${BASE_URL}/assets/${rejectedAsset.id}/submit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sellerToken}`,
      'Content-Type': 'application/json',
    },
  });
  const dupData: any = await dupRes.json();
  console.log('Duplicate submit status:', dupRes.status);
  console.log('Duplicate submit message:', dupData.message);
  if (dupRes.status !== 400) {
    throw new Error('Expected 400 for already pending asset');
  }
  console.log('✓ Correctly rejected duplicate submission with 400 Bad Request.');

  // 5. Test submitting with non-existent asset ID (edge case)
  console.log('\n5. Testing submission of non-existent asset ID (edge case)...');
  const fakeRes = await fetch(`${BASE_URL}/assets/00000000-0000-0000-0000-000000000000/submit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sellerToken}`,
      'Content-Type': 'application/json',
    },
  });
  console.log('Fake asset submit status:', fakeRes.status);
  if (fakeRes.status !== 404) {
    throw new Error('Expected 404 for non-existent asset');
  }
  console.log('✓ Correctly returned 404 Not Found for non-existent asset.');

  // 6. Test submitting without auth token (edge case)
  console.log('\n6. Testing submission without auth token (edge case)...');
  const unauthRes = await fetch(`${BASE_URL}/assets/${rejectedAsset.id}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  console.log('Unauthenticated submit status:', unauthRes.status);
  if (unauthRes.status !== 401) {
    throw new Error('Expected 401 Unauthorized');
  }
  console.log('✓ Correctly returned 401 Unauthorized when missing auth token.');

  // 7. Verify asset in GET /assets/my now shows status 'pending'
  console.log('\n7. Verifying seller listings reflect status change immediately...');
  const afterRes = await fetch(`${BASE_URL}/assets/my`, {
    headers: { Authorization: `Bearer ${sellerToken}` },
  });
  const afterData: any = await afterRes.json();
  const updatedItem = afterData.data.assets.find((a: any) => a.id === rejectedAsset.id);
  console.log(`Updated asset status in listings: ${updatedItem?.status}`);
  if (updatedItem?.status !== 'pending') {
    throw new Error('Expected asset to be pending in listings');
  }
  console.log('✓ Asset is now "pending" in seller listings.');

  // 8. Admin review: login as admin and check pending queue
  console.log('\n8. Logging in as Admin to check moderation queue...');
  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@assetmarket.com',
      password: 'Admin123!',
    }),
  });
  const adminLoginData: any = await adminLoginRes.json();
  const adminToken = adminLoginData.data.accessToken;

  const pendingRes = await fetch(`${BASE_URL}/admin/assets/pending`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const pendingData: any = await pendingRes.json();
  const inQueue = pendingData.data?.pendingAssets?.some((a: any) => a.id === rejectedAsset.id);
  console.log(`Asset present in admin queue: ${inQueue}`);
  if (!inQueue) {
    throw new Error('Asset should appear in admin pending queue!');
  }
  console.log('✓ Asset is visible in Admin Moderation Queue.');

  // 9. Admin rejects asset again with feedback
  console.log('\n9. Admin rejects asset with revision notes...');
  const rejectRes = await fetch(`${BASE_URL}/admin/assets/${rejectedAsset.id}/reject`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      rejectionReason: 'Harap perbarui file lisensi komersial dan format dokumentasi.',
    }),
  });
  const rejectData: any = await rejectRes.json();
  console.log('Admin reject status:', rejectRes.status, rejectData.message);

  // 10. Seller resubmits again (full cycle test)
  console.log('\n10. Seller resubmits asset again after curator rejection...');
  const resubmitRes = await fetch(`${BASE_URL}/assets/${rejectedAsset.id}/submit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sellerToken}`,
      'Content-Type': 'application/json',
    },
  });
  const resubmitData: any = await resubmitRes.json();
  console.log('Resubmit status:', resubmitRes.status, resubmitData.message);
  if (!resubmitRes.ok || resubmitData.data?.asset?.status !== 'pending') {
    throw new Error('Resubmit failed');
  }
  console.log('✓ Seller successfully resubmitted asset to admin moderation queue!');

  // Finally: Reset to 'rejected' so the demo seller account retains a rejected item ready for manual testing
  console.log('\n11. Setting back to rejected status with curator note for user evaluation...');
  await fetch(`${BASE_URL}/admin/assets/${rejectedAsset.id}/reject`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      rejectionReason: 'Berkas deliverable belum menyertakan file lisensi komersial dan format dokumentasi lisensi perlu diperbaiki.',
    }),
  });
  console.log('✓ Asset primed in "rejected" state for interactive evaluation.');

  console.log('\n🎉 ALL TESTS PASSED! END-TO-END MODERATION FLOW IS 100% OPERATIONAL.');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
