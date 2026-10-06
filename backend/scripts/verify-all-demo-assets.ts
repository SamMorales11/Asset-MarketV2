import { db } from '../src/db/index.js';
import { assets, categories, assetFiles } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { getUploadsRootDir } from '../src/utils/paths.js';

async function verifyAll() {
  const uploadsDir = getUploadsRootDir();
  const all = await db
    .select({
      id: assets.id,
      title: assets.title,
      slug: assets.slug,
      status: assets.status,
      category: categories.name,
      price: assets.price,
      discountPrice: assets.discountPrice,
      thumbnailUrl: assets.thumbnailUrl,
      previewImages: assets.previewImages,
    })
    .from(assets)
    .leftJoin(categories, eq(assets.categoryId, categories.id));

  console.log(`\n=============================================`);
  console.log(`VERIFYING ${all.length} ASSETS IN DATABASE`);
  console.log(`=============================================\n`);

  let problemCount = 0;

  for (const a of all) {
    const isFree = Number(a.price) === 0;
    const isDiscount = a.discountPrice !== null;
    const priceStr = isFree
      ? 'FREE'
      : isDiscount
      ? `Rp ${Number(a.discountPrice).toLocaleString('id-ID')} (Was: Rp ${Number(a.price).toLocaleString('id-ID')})`
      : `Rp ${Number(a.price).toLocaleString('id-ID')}`;

    // Verify local thumb on disk
    const localThumbName = `${a.slug}-thumb.png`;
    const localThumbPath = path.join(uploadsDir, 'thumbnails', localThumbName);
    const hasLocalThumb = fs.existsSync(localThumbPath);
    const localThumbSize = hasLocalThumb ? fs.statSync(localThumbPath).size : 0;

    // Verify deliverable zip on disk
    const [fileRec] = await db
      .select()
      .from(assetFiles)
      .where(eq(assetFiles.assetId, a.id))
      .limit(1);

    const zipPath = path.join(uploadsDir, 'files', `${a.slug}-package.zip`);
    const hasZip = fs.existsSync(zipPath);

    const isImageValid = a.thumbnailUrl && (a.thumbnailUrl.startsWith('https://') || hasLocalThumb);

    if (!isImageValid || localThumbSize < 1000) {
      problemCount++;
      console.error(`❌ PROBLEM with asset ${a.title}: invalid image!`);
    } else {
      console.log(`✓ [${a.status.toUpperCase()}] [${a.category}] ${a.title}`);
      console.log(`   Price: ${priceStr}`);
      console.log(`   Thumbnail: ${a.thumbnailUrl}`);
      console.log(`   Local file: ${localThumbName} (${localThumbSize} bytes)`);
      console.log(`   Deliverable: ${fileRec?.fileName} (Disk verified: ${hasZip})`);
    }
  }

  console.log(`\n=============================================`);
  console.log(`TOTAL PROBLEMS FOUND: ${problemCount}`);
  console.log(`=============================================\n`);

  process.exit(0);
}

verifyAll().catch(console.error);
