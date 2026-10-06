import { db } from '../src/db/index.js';
import {
  assets,
  assetFiles,
  transactionItems,
  paymentConfirmations,
  transactions,
  revenueLedger,
  cartItems,
} from '../src/db/schema.js';
import { inArray, notInArray } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { getUploadsRootDir } from '../src/utils/paths.js';

// Slugs of approved & valid curated demo assets to KEEP
const VALID_SLUGS = [
  'atelier-noir-editorial-design-system',
  'chronos-trading-engine',
  'vogue-velvet-3d-interior',
  'aura-display-typography-kit',
  'lumina-saas-dashboard',
  'cyberpunk-humanoid-rigged-3d',
  'hyperion-microservices-ecommerce',
  'obsidian-minimalist-vector-icons',
  'cinematic-ambient-soundscapes-audio',
  'zenith-mobile-banking-ui-kit',
  'prism-iridescent-abstract-3d-glass',
  'quantum-nextjs-agency-platform',
  'minimalist-wireframe-starter-kit',
  'essential-developer-cli-tools',
  'velvet-mirage-3d-scene',
];

async function cleanup() {
  console.log('🧹 Cleaning up stale and corrupted assets from database & disk...');

  // 1. Find all assets that do not belong to the curated demo set
  const junkAssets = await db
    .select({ id: assets.id, slug: assets.slug, title: assets.title })
    .from(assets)
    .where(notInArray(assets.slug, VALID_SLUGS));

  console.log(`Found ${junkAssets.length} junk/stale assets to remove:`);
  junkAssets.forEach((j) => console.log(` - [${j.slug}] ${j.title}`));

  if (junkAssets.length > 0) {
    const junkIds = junkAssets.map((j) => j.id);

    // Find transaction items referencing junk assets
    const txItems = await db
      .select({ id: transactionItems.id, transactionId: transactionItems.transactionId })
      .from(transactionItems)
      .where(inArray(transactionItems.assetId, junkIds));

    if (txItems.length > 0) {
      const txItemIds = txItems.map((t) => t.id);
      const txIds = [...new Set(txItems.map((t) => t.transactionId))];

      console.log(`Removing ${txItemIds.length} transaction items and related records for junk assets...`);

      // Delete payment confirmations for these transactions
      await db.delete(paymentConfirmations).where(inArray(paymentConfirmations.transactionId, txIds));

      // Delete revenue ledger entries
      await db.delete(revenueLedger).where(inArray(revenueLedger.transactionId, txIds));
      await db.delete(revenueLedger).where(inArray(revenueLedger.transactionItemId, txItemIds));

      // Delete transaction items and transactions
      await db.delete(transactionItems).where(inArray(transactionItems.id, txItemIds));
      await db.delete(transactions).where(inArray(transactions.id, txIds));
    }

    // Delete cart items referencing junk assets
    await db.delete(cartItems).where(inArray(cartItems.assetId, junkIds));

    // Delete asset files
    await db.delete(assetFiles).where(inArray(assetFiles.assetId, junkIds));

    // Delete the junk assets themselves
    await db.delete(assets).where(inArray(assets.id, junkIds));
    console.log(`✓ Deleted ${junkAssets.length} junk assets from database.`);
  }

  // 2. Remove corrupted/dummy 1x1 image files (< 1000 bytes) from uploads/thumbnails
  const uploadsDir = getUploadsRootDir();
  const thumbDir = path.join(uploadsDir, 'thumbnails');

  if (fs.existsSync(thumbDir)) {
    const files = fs.readdirSync(thumbDir);
    let deletedFilesCount = 0;

    for (const f of files) {
      const p = path.join(thumbDir, f);
      try {
        const stats = fs.statSync(p);
        if (stats.size < 1000) {
          fs.unlinkSync(p);
          console.log(`✓ Removed dummy/corrupted file (< 1000 bytes): ${f} (${stats.size} bytes)`);
          deletedFilesCount++;
        }
      } catch (err) {
        // Ignore file access errors
      }
    }
    console.log(`✓ Removed ${deletedFilesCount} dummy files from disk.`);
  }

  console.log('✨ Cleanup completed successfully!\n');
  process.exit(0);
}

cleanup().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
