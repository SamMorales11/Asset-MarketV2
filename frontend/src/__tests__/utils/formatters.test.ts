import { describe, it, expect } from 'vitest';
import { formatCurrency, formatFileSize } from '../../utils/formatters';

describe('formatters.ts Frontend Utilities', () => {
  describe('formatCurrency', () => {
    it('formats amount into IDR Indonesian currency', () => {
      const formatted = formatCurrency(250000);
      expect(formatted).toContain('250.000');
      expect(formatted).toContain('Rp');
    });

    it('formats USD currency correctly', () => {
      const formatted = formatCurrency(49.99, 'USD');
      expect(formatted).toContain('49.99');
      expect(formatted).toContain('$');
    });
  });

  describe('formatFileSize', () => {
    it('formats 0 bytes as 0 Bytes', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
    });

    it('formats KB, MB, and GB', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(15.5 * 1024 * 1024)).toBe('15.5 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });
  });
});
