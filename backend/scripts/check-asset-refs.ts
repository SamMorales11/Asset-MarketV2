import { db } from '../src/db/index.js';
import { assets, transactionItems, cartItems, assetFiles } from '../src/db/schema.js';
import { inArray } from 'drizzle-orm';

async function checkReferences() {
  const allAssets = await db.select().from(assets);
  const txItems = await db.select().from(transactionItems);
  const cItems = await db.select().from(cartItems);

  console.log(`Assets: ${allAssets.length}, Transaction Items: ${txItems.length}, Cart Items: ${cItems.length}`);

  const referencedAssetIds = new Set([
    ...txItems.map((t) => t.assetId),
    ...cItems.map((c) => c.assetId),
  ]);

  for (const a of allAssets) {
    const isRef = referencedAssetIds.has(a.id);
    console.log(`[${isRef ? 'REFERENCED' : 'UNREFERENCED'}] ${a.slug} (${a.title})`);
  }

  process.exit(0);
}

checkReferences().catch(console.error);
