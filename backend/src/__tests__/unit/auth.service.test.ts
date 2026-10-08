import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../../lib/index.js';
import type { JWTPayload } from '../../types/index.js';

describe('Auth Services & Crypto / JWT Utilities', () => {
  describe('Password Hashing & Comparison', () => {
    it('hashes passwords using bcrypt with a salt', async () => {
      const plain = 'SecurePassword123!';
      const hash1 = await hashPassword(plain);
      const hash2 = await hashPassword(plain);

      expect(hash1).toBeDefined();
      expect(hash1).not.toBe(plain);
      expect(hash1.startsWith('$2')).toBe(true);
      // Different salts produce different hashes
      expect(hash1).not.toBe(hash2);
    });

    it('successfully verifies correct password against hash', async () => {
      const plain = 'CreativeMaster!2026';
      const hash = await hashPassword(plain);

      const isValid = await comparePassword(plain, hash);
      expect(isValid).toBe(true);
    });

    it('rejects incorrect password against hash', async () => {
      const plain = 'CorrectSecret';
      const wrong = 'IncorrectSecret';
      const hash = await hashPassword(plain);

      const isValid = await comparePassword(wrong, hash);
      expect(isValid).toBe(false);
    });
  });

  describe('JWT Access Token Lifecycle', () => {
    const mockUserPayload: Omit<JWTPayload, 'tokenType'> = {
      userId: 'usr_abc123',
      email: 'creator@assetmarket.com',
      name: 'Elena Rostova',
      role: 'seller',
    };

    it('generates and verifies a valid access token', async () => {
      const token = await generateAccessToken(mockUserPayload);
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);

      const verified = await verifyAccessToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe(mockUserPayload.userId);
      expect(verified?.email).toBe(mockUserPayload.email);
      expect(verified?.name).toBe(mockUserPayload.name);
      expect(verified?.role).toBe(mockUserPayload.role);
      expect(verified?.tokenType).toBe('access');
    });

    it('rejects an invalid or tampered access token', async () => {
      const validToken = await generateAccessToken(mockUserPayload);
      const tamperedToken = validToken.substring(0, validToken.length - 5) + 'xxxxx';

      const result = await verifyAccessToken(tamperedToken);
      expect(result).toBeNull();
    });

    it('rejects completely malformed tokens', async () => {
      const malformed = 'not.a.valid.jwt';
      const result = await verifyAccessToken(malformed);
      expect(result).toBeNull();
    });

    it('does not verify a refresh token as an access token', async () => {
      const refreshToken = await generateRefreshToken(mockUserPayload);
      const result = await verifyAccessToken(refreshToken);
      expect(result).toBeNull();
    });
  });

  describe('JWT Refresh Token Lifecycle', () => {
    const mockAdminPayload: Omit<JWTPayload, 'tokenType'> = {
      userId: 'usr_admin999',
      email: 'admin@assetmarket.com',
      name: 'System Administrator',
      role: 'admin',
    };

    it('generates and verifies a valid refresh token', async () => {
      const token = await generateRefreshToken(mockAdminPayload);
      expect(typeof token).toBe('string');

      const verified = await verifyRefreshToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe(mockAdminPayload.userId);
      expect(verified?.role).toBe('admin');
      expect(verified?.tokenType).toBe('refresh');
    });

    it('does not verify an access token as a refresh token', async () => {
      const accessToken = await generateAccessToken(mockAdminPayload);
      const result = await verifyRefreshToken(accessToken);
      expect(result).toBeNull();
    });

    it('rejects arbitrary corrupted refresh token', async () => {
      const result = await verifyRefreshToken('corrupted.token.payload');
      expect(result).toBeNull();
    });
  });
});
