import { app } from '../src/app.js';

async function run() {
  console.log('=== TEST 1: Full subfolder static path ===');
  const req1 = new Request('http://localhost:3000/uploads/thumbnails/atelier-noir-showcase.png');
  const res1 = await app.fetch(req1);
  console.log('Status:', res1.status);
  console.log('Content-Type:', res1.headers.get('content-type'));
  console.log('CORS Origin:', res1.headers.get('access-control-allow-origin'));
  console.log('CORP:', res1.headers.get('cross-origin-resource-policy'));
  console.log('Length:', res1.headers.get('content-length'));

  console.log('\n=== TEST 2: Direct static path fallback (/uploads/atelier-noir-showcase.png) ===');
  const req2 = new Request('http://localhost:3000/uploads/atelier-noir-showcase.png');
  const res2 = await app.fetch(req2);
  console.log('Status:', res2.status);
  console.log('Content-Type:', res2.headers.get('content-type'));
  console.log('CORS Origin:', res2.headers.get('access-control-allow-origin'));

  console.log('\n=== TEST 3: Security block on protected deliverable file ===');
  const req3 = new Request('http://localhost:3000/uploads/files/secret-archive.zip');
  const res3 = await app.fetch(req3);
  console.log('Status (expect 403):', res3.status);
  const data3 = await res3.json();
  console.log('Message:', (data3 as any).message);

  console.log('\n=== TEST 4: API Assets response image fields ===');
  const req4 = new Request('http://localhost:3000/api/assets');
  const res4 = await app.fetch(req4);
  const data4 = (await res4.json()) as any;
  const sample = data4.data?.assets?.[0];
  console.log('Sample Asset Title:', sample?.title);
  console.log('thumbnailUrl:', sample?.thumbnailUrl);
  console.log('thumbnail:', sample?.thumbnail);
  console.log('thumbnail_url:', sample?.thumbnail_url);
  console.log('cover_url:', sample?.cover_url);
  console.log('image_url:', sample?.image_url);

  console.log('\nALL BACKEND UNIT CHECKS COMPLETED!');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
