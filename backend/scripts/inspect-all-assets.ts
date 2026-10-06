import { db } from '../src/db/index.js';
import { assets, categories } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

async function listAll() {
  const all = await db
    .select({
      id: assets.id,
      title: assets.title,
      slug: assets.slug,
      status: assets.status,
      category: categories.name,
      price: assets.price,
      thumbnailUrl: assets.thumbnailUrl,
    })
    .from(assets)
    .leftJoin(categories, eq(assets.categoryId, categories.id));

  console.log(`TOTAL ASSETS IN DATABASE: ${all.length}`);
  all.forEach((a, i) => {
    console.log(`[${i + 1}] (${a.status}) [${a.category}] ${a.title} -> ${a.slug} (thumb: ${a.thumbnailUrl})`);
  });

  process.exit(0);
}

listAll().catch(console.error);
