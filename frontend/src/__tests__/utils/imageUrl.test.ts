import { describe, it, expect } from 'vitest';
import { getAssetImageUrl, getLuxuryPlaceholder } from '../../utils/imageUrl';

describe('imageUrl.ts Frontend Utilities', () => {
  describe('getAssetImageUrl', () => {
    it('returns empty string for null, undefined, or empty url', () => {
      expect(getAssetImageUrl(null)).toBe('');
      expect(getAssetImageUrl(undefined)).toBe('');
      expect(getAssetImageUrl('')).toBe('');
    });

    it('returns full URL unchanged if already http/https or data uri', () => {
      const url = 'https://images.unsplash.com/photo-123';
      const data = 'data:image/svg+xml;utf-8,svg';
      expect(getAssetImageUrl(url)).toBe(url);
      expect(getAssetImageUrl(data)).toBe(data);
    });

    it('prepends backend upload base for relative image paths', () => {
      const relative = 'thumbnails/asset.png';
      const result = getAssetImageUrl(relative);
      expect(result).toContain('/uploads/thumbnails/asset.png');
    });
  });

  describe('getLuxuryPlaceholder', () => {
    it('generates luxury SVG data URI placeholder containing title and category', () => {
      const placeholder = getLuxuryPlaceholder('Atelier Portfolio', 'UI Template');
      expect(placeholder.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);

      const decoded = decodeURIComponent(placeholder);
      expect(decoded).toContain('Atelier Portfolio');
      expect(decoded).toContain('UI TEMPLATE');
    });
  });
});
