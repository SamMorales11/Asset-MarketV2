import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { getUploadsRootDir, ensureUploadDirs } from '../../utils/paths.js';
import { toAbsoluteUrl, formatAssetUrls } from '../../utils/url.js';

describe('Paths and URL Utility Functions', () => {
  describe('paths.ts', () => {
    it('returns a valid string for uploads root directory', () => {
      const rootDir = getUploadsRootDir();
      expect(typeof rootDir).toBe('string');
      expect(rootDir.length).toBeGreaterThan(0);
      expect(rootDir).toContain('uploads');
    });

    it('ensures standard upload directories exist without throwing', () => {
      expect(() => ensureUploadDirs()).not.toThrow();
      const rootDir = getUploadsRootDir();
      expect(fs.existsSync(rootDir)).toBe(true);
    });
  });

  describe('url.ts', () => {
    const originalEnv = process.env.APP_URL;

    beforeEach(() => {
      process.env.APP_URL = 'http://api.assetmarket.test:3001';
    });

    afterEach(() => {
      process.env.APP_URL = originalEnv;
    });

    it('returns null for null, undefined, or empty path', () => {
      expect(toAbsoluteUrl(null)).toBeNull();
      expect(toAbsoluteUrl(undefined)).toBeNull();
      expect(toAbsoluteUrl('')).toBeNull();
    });

    it('preserves existing absolute URLs (http, https, data:)', () => {
      const httpsUrl = 'https://images.unsplash.com/photo-123';
      const dataUri = 'data:image/png;base64,iVBORw0KGgo';
      expect(toAbsoluteUrl(httpsUrl)).toBe(httpsUrl);
      expect(toAbsoluteUrl(dataUri)).toBe(dataUri);
    });

    it('formats relative upload paths to absolute URLs', () => {
      const result = toAbsoluteUrl('thumbnails/cover.png');
      expect(result).toBe('http://api.assetmarket.test:3001/uploads/thumbnails/cover.png');
    });

    it('avoids double-prefixing /uploads if already present', () => {
      const result = toAbsoluteUrl('/uploads/payments/receipt.jpg');
      expect(result).toBe('http://api.assetmarket.test:3001/uploads/payments/receipt.jpg');
    });

    it('formatAssetUrls normalizes all thumbnail/cover attributes on asset objects', () => {
      const rawAsset = {
        id: 'asset_123',
        title: '3D Cyber Car',
        thumbnailUrl: 'thumbnails/car.png',
        previewImages: ['preview1.png', 'https://remote.cdn/preview2.png'],
      };

      const formatted = formatAssetUrls(rawAsset);
      expect(formatted.thumbnailUrl).toBe('http://api.assetmarket.test:3001/uploads/thumbnails/car.png');
      expect(formatted.previewImages[0]).toBe('http://api.assetmarket.test:3001/uploads/preview1.png');
      expect(formatted.previewImages[1]).toBe('https://remote.cdn/preview2.png');
    });

    it('returns null/falsy input gracefully in formatAssetUrls', () => {
      expect(formatAssetUrls(null as any)).toBeNull();
      expect(formatAssetUrls(undefined as any)).toBeUndefined();
    });
  });
});
