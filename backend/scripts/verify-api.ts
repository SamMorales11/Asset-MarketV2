const PORT = process.env.PORT || 3001;

async function verify() {
  console.log('Testing Static Serving...');
  const imgRes = await fetch(`http://localhost:${PORT}/uploads/thumbnails/atelier-noir-showcase.png`);
  console.log('Image status:', imgRes.status);
  console.log('Content-Type:', imgRes.headers.get('content-type'));
  console.log('Access-Control-Allow-Origin:', imgRes.headers.get('access-control-allow-origin'));
  console.log('Cross-Origin-Resource-Policy:', imgRes.headers.get('cross-origin-resource-policy'));
  console.log('Image byte size:', (await imgRes.arrayBuffer()).byteLength);

  console.log('\nTesting GET /api/assets...');
  const catRes = await fetch(`http://localhost:${PORT}/api/assets`);
  const catData = await catRes.json() as any;
  console.log('Assets count:', catData.data?.assets?.length);
  const sample = catData.data?.assets?.[0];
  console.log('First Asset Title:', sample?.title);
  console.log('First Asset thumbnailUrl:', sample?.thumbnailUrl);
  console.log('First Asset coverUrl:', sample?.coverUrl);
  console.log('First Asset imageUrl:', sample?.imageUrl);

  console.log('\nTesting GET /api/assets/:identifier...');
  const detailRes = await fetch(`http://localhost:${PORT}/api/assets/atelier-noir-editorial-design-system`);
  const detailData = await detailRes.json() as any;
  console.log('Detail Status:', detailRes.status);
  console.log('Detail Title:', detailData.data?.asset?.title);
  console.log('Detail Thumbnail:', detailData.data?.asset?.thumbnailUrl);
  console.log('Detail CoverUrl:', detailData.data?.asset?.coverUrl);
  console.log('Detail Files:', detailData.data?.asset?.files?.length);
}

verify().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
