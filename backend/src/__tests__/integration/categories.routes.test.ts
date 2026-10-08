import { describe, it, expect } from 'vitest';
import { app } from '../../app.js';

describe('Categories API Routes (/api/categories)', () => {
  it('retrieves active marketplace categories with asset counts', async () => {
    const res = await app.request('/api/categories');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.categories)).toBe(true);
    expect(body.data.categories.length).toBeGreaterThan(0);

    const firstCat = body.data.categories[0];
    expect(firstCat.id).toBeDefined();
    expect(firstCat.name).toBeDefined();
    expect(firstCat.slug).toBeDefined();
    expect(typeof firstCat.assetCount).toBe('number');
  });
});
