import { describe, it, expect } from 'vitest';
import {
  formatBytes,
  mapAssetTypeToCategory,
  validateUploadedFile,
  CATEGORY_VALIDATION_RULES,
} from '../../utils/fileValidation.js';

describe('File Validation Utility Functions', () => {
  describe('formatBytes', () => {
    it('formats 0 or negative bytes as 0 Bytes', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(-100)).toBe('0 Bytes');
    });

    it('formats byte boundaries correctly', () => {
      expect(formatBytes(500)).toBe('500 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
      expect(formatBytes(15.5 * 1024 * 1024)).toBe('15.5 MB');
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('respects decimal precision parameter', () => {
      expect(formatBytes(1536, 2)).toBe('1.5 KB');
      expect(formatBytes(1234567, 3)).toBe('1.177 MB');
    });
  });

  describe('mapAssetTypeToCategory', () => {
    it('maps known asset types to appropriate file categories', () => {
      expect(mapAssetTypeToCategory('ui_template')).toBe('source_code');
      expect(mapAssetTypeToCategory('source_code')).toBe('source_code');
      expect(mapAssetTypeToCategory('3d_model')).toBe('3d');
      expect(mapAssetTypeToCategory('graphic')).toBe('image');
      expect(mapAssetTypeToCategory('audio')).toBe('audio');
      expect(mapAssetTypeToCategory('video')).toBe('video');
      expect(mapAssetTypeToCategory('dataset')).toBe('dataset');
      expect(mapAssetTypeToCategory('document')).toBe('document');
    });

    it('falls back to archive for unknown asset types', () => {
      expect(mapAssetTypeToCategory('custom_bundle')).toBe('archive');
      expect(mapAssetTypeToCategory('')).toBe('archive');
    });
  });

  describe('validateUploadedFile', () => {
    it('rejects null, undefined, or missing files', () => {
      expect(validateUploadedFile(null, 'image').valid).toBe(false);
      expect(validateUploadedFile(undefined, 'image').valid).toBe(false);
      expect(validateUploadedFile({ name: '', size: 100 } as any, 'image').valid).toBe(false);
    });

    it('rejects empty (0 byte) files', () => {
      const result = validateUploadedFile({ name: 'empty.png', size: 0, type: 'image/png' }, 'image');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('is empty (0 bytes)');
    });

    it('rejects files without extensions', () => {
      const result = validateUploadedFile({ name: 'filename-without-ext', size: 1024, type: 'image/png' }, 'image');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('no valid file extension');
    });

    it('validates correct image files successfully', () => {
      const result = validateUploadedFile(
        { name: 'cover-artwork.png', size: 2 * 1024 * 1024, type: 'image/png' },
        'image'
      );
      expect(result.valid).toBe(true);
      expect(result.extension).toBe('.png');
      expect(result.category).toBe('image');
    });

    it('rejects unallowed extensions for category', () => {
      const result = validateUploadedFile(
        { name: 'malicious.exe', size: 1024, type: 'application/x-msdownload' },
        'image'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file extension ".exe"');
    });

    it('rejects files that exceed category size limit', () => {
      const limit = CATEGORY_VALIDATION_RULES.image.maxSizeBytes;
      const result = validateUploadedFile(
        { name: 'huge-poster.png', size: limit + 1024, type: 'image/png' },
        'image'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed limit');
    });

    it('handles category "any" correctly', () => {
      const validAny = validateUploadedFile(
        { name: 'package.custom', size: 5 * 1024 * 1024, type: 'application/octet-stream' },
        'any'
      );
      expect(validAny.valid).toBe(true);
      expect(validAny.category).toBe('any');

      // Exceeds 500MB default limit
      const oversizedAny = validateUploadedFile(
        { name: 'huge.iso', size: 600 * 1024 * 1024, type: 'application/octet-stream' },
        'any'
      );
      expect(oversizedAny.valid).toBe(false);
      expect(oversizedAny.error).toContain('exceeds maximum limit');
    });

    it('honors custom rules overrides', () => {
      const result = validateUploadedFile(
        { name: 'photo.png', size: 5000, type: 'image/png' },
        'image',
        { allowedExtensions: ['.jpg', '.jpeg'] }
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file extension ".png"');
    });
  });
});
