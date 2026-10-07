import { Hono } from 'hono';
import { eq, and, isNull, count } from 'drizzle-orm';
import { db } from '../db/index.js';
import { categories, assets } from '../db/schema.js';
import { handleError } from '../lib/errors.js';

export const categoryRoutes = new Hono();

const DEFAULT_CATEGORIES = [
  {
    name: 'UI & Web Templates',
    slug: 'ui-templates',
    description: 'Dashboard templates, landing pages, mobile UI kits, and design components.',
    iconUrl: 'layout',
  },
  {
    name: 'Source Code & Starters',
    slug: 'source-code',
    description: 'Full-stack applications, microservices, backend starters, and APIs.',
    iconUrl: 'code',
  },
  {
    name: '3D Models & Assets',
    slug: '3d-models',
    description: 'High-poly and low-poly 3D models, textures, rigs, and game-ready assets.',
    iconUrl: 'box',
  },
  {
    name: 'Graphics & Vector Kits',
    slug: 'graphics-vectors',
    description: 'Vector illustrations, icon packs, typography, and brand assets.',
    iconUrl: 'palette',
  },
  {
    name: 'Audio & Sound Effects',
    slug: 'audio-sound',
    description: 'Royalty-free music tracks, cinematic SFX, and ambient soundscapes.',
    iconUrl: 'music',
  },
];

/**
 * GET /categories
 * List all active categories with approved asset counts
 */
categoryRoutes.get('/', async (c) => {
  try {
    let allCategories = await db
      .select()
      .from(categories)
      .where(isNull(categories.deletedAt));

    // Auto-seed default categories if database is empty
    if (allCategories.length === 0) {
      await db.insert(categories).values(DEFAULT_CATEGORIES);
      allCategories = await db
        .select()
        .from(categories)
        .where(isNull(categories.deletedAt));
    }

    // Attach approved asset count per category
    const categoriesWithCount = await Promise.all(
      allCategories.map(async (cat) => {
        const [assetCountResult] = await db
          .select({ value: count() })
          .from(assets)
          .where(
            and(
              eq(assets.categoryId, cat.id),
              eq(assets.status, 'approved'),
              isNull(assets.deletedAt)
            )
          );

        return {
          ...cat,
          assetCount: Number(assetCountResult?.value || 0),
        };
      })
    );

    return c.json({
      success: true,
      data: {
        categories: categoriesWithCount,
      },
    });
  } catch (error: any) {
    // Return empty categories instead of default - let client handle empty state
    const appError = handleError(error, 'Categories/list');
    console.warn(`Categories fetch failed, returning empty list: ${appError.message}`);
    return c.json({
      success: true,
      data: {
        categories: [],
      },
    });
  }
});
