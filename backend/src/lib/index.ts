import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import type { JWTPayload } from '../types/index.js';

dotenv.config();

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || 'super_secret_access_jwt_key_min_32_chars_asset_market_2026'
);

const REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_jwt_key_min_32_chars_asset_market_2026'
);

const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Hash raw password using bcrypt with salt rounds 10.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare plain password against stored bcrypt hash.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate short-lived Access Token (15m default).
 */
export async function generateAccessToken(payload: Omit<JWTPayload, 'tokenType'>): Promise<string> {
  return new SignJWT({ ...payload, tokenType: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRES_IN)
    .sign(ACCESS_SECRET);
}

/**
 * Generate long-lived Refresh Token (7d default).
 */
export async function generateRefreshToken(payload: Omit<JWTPayload, 'tokenType'>): Promise<string> {
  return new SignJWT({ ...payload, tokenType: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRES_IN)
    .sign(REFRESH_SECRET);
}

/**
 * Verify Access Token.
 */
export async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET);
    if (payload.tokenType !== 'access') return null;
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Verify Refresh Token.
 */
export async function verifyRefreshToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET);
    if (payload.tokenType !== 'refresh') return null;
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}
