import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, isNull } from 'drizzle-orm';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../lib/index.js';
import { handleError, isConstraintError, logError } from '../lib/errors.js';
import { authMiddleware, authRateLimiter } from '../middleware/index.js';
import { registerSchema, loginSchema, validationErrorResponse } from '../lib/validation.js';
import type { SafeUser } from '../types/index.js';

export const authRoutes = new Hono();

const REFRESH_COOKIE_NAME = 'refresh_token';

function setRefreshCookie(c: any, refreshToken: string) {
  const isProduction = process.env.NODE_ENV === 'production';
  setCookie(c, REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'None' : 'Lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });
}

/**
 * POST /auth/register
 * Register a new user account.
 */
authRoutes.post('/register', authRateLimiter, async (c) => {
  try {
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ success: false, message: 'Invalid JSON request body', code: 'MALFORMED_JSON' }, 400);
    }

    const validated = registerSchema.safeParse(body);

    if (!validated.success) {
      return validationErrorResponse(c, validated.error, 'Validation failed');
    }

    const { name, email, password } = validated.data;

    // Check if email already registered
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);

    if (existing) {
      return c.json(
        {
          success: false,
          message: 'Email is already registered. Please sign in instead.',
        },
        409
      );
    }

    const passwordHashed = await hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash: passwordHashed,
        role: 'user',
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        avatarUrl: users.avatarUrl,
        isVerifiedSeller: users.isVerifiedSeller,
        bankName: users.bankName,
        bankAccountNumber: users.bankAccountNumber,
        bankAccountHolder: users.bankAccountHolder,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    const safeUser = newUser as SafeUser;

    // Generate tokens
    const tokenPayload = {
      userId: safeUser.id,
      email: safeUser.email,
      role: safeUser.role,
    };

    const accessToken = await generateAccessToken(tokenPayload);
    const refreshToken = await generateRefreshToken(tokenPayload);

    // Set HttpOnly refresh token cookie
    setRefreshCookie(c, refreshToken);

    return c.json(
      {
        success: true,
        message: 'Account created successfully',
        data: {
          accessToken,
          user: safeUser,
        },
      },
      201
    );
  } catch (error: any) {
    // Check for unique constraint violation (e.g., duplicate email)
    if (isConstraintError(error)) {
      logError(error, 'Auth/register');
      return c.json(
        {
          success: false,
          message: 'Email is already registered. Please sign in instead.',
        },
        409
      );
    }

    const appError = handleError(error, 'Auth/register');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * POST /auth/login
 * Authenticate user with email and password.
 */
authRoutes.post('/login', authRateLimiter, async (c) => {
  try {
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ success: false, message: 'Invalid JSON request body', code: 'MALFORMED_JSON' }, 400);
    }

    const validated = loginSchema.safeParse(body);

    if (!validated.success) {
      return validationErrorResponse(c, validated.error, 'Validation failed');
    }

    const { email, password } = validated.data;

    // Lookup user by email
    const [foundUser] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);

    if (!foundUser) {
      return c.json(
        {
          success: false,
          message: 'Invalid email or password',
        },
        401
      );
    }

    const isMatch = await comparePassword(password, foundUser.passwordHash);
    if (!isMatch) {
      return c.json(
        {
          success: false,
          message: 'Invalid email or password',
        },
        401
      );
    }

    const safeUser: SafeUser = {
      id: foundUser.id,
      email: foundUser.email,
      name: foundUser.name,
      role: foundUser.role,
      avatarUrl: foundUser.avatarUrl,
      isVerifiedSeller: foundUser.isVerifiedSeller,
      bankName: foundUser.bankName,
      bankAccountNumber: foundUser.bankAccountNumber,
      bankAccountHolder: foundUser.bankAccountHolder,
      createdAt: foundUser.createdAt,
      updatedAt: foundUser.updatedAt,
    };

    const tokenPayload = {
      userId: safeUser.id,
      email: safeUser.email,
      role: safeUser.role,
    };

    const accessToken = await generateAccessToken(tokenPayload);
    const refreshToken = await generateRefreshToken(tokenPayload);

    // Set HttpOnly refresh token cookie
    setRefreshCookie(c, refreshToken);

    return c.json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        user: safeUser,
      },
    });
  } catch (error: any) {
    const appError = handleError(error, 'Auth/login');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * POST /auth/refresh
 * Exchange valid HttpOnly refresh token for a fresh access token.
 */
authRoutes.post('/refresh', async (c) => {
  try {
    const refreshToken = getCookie(c, REFRESH_COOKIE_NAME);

    if (!refreshToken) {
      return c.json(
        {
          success: false,
          message: 'Refresh token cookie is missing',
        },
        401
      );
    }

    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      deleteCookie(c, REFRESH_COOKIE_NAME, { path: '/' });
      return c.json(
        {
          success: false,
          message: 'Invalid or expired refresh token. Please sign in again.',
        },
        401
      );
    }

    // Verify user still exists in database
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        avatarUrl: users.avatarUrl,
        isVerifiedSeller: users.isVerifiedSeller,
        bankName: users.bankName,
        bankAccountNumber: users.bankAccountNumber,
        bankAccountHolder: users.bankAccountHolder,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(and(eq(users.id, payload.userId), isNull(users.deletedAt)))
      .limit(1);

    if (!user) {
      deleteCookie(c, REFRESH_COOKIE_NAME, { path: '/' });
      return c.json(
        {
          success: false,
          message: 'User account no longer exists or has been deactivated',
        },
        401
      );
    }

    const safeUser = user as SafeUser;

    const tokenPayload = {
      userId: safeUser.id,
      email: safeUser.email,
      role: safeUser.role,
    };

    // Issue new access token and rotate refresh token
    const newAccessToken = await generateAccessToken(tokenPayload);
    const newRefreshToken = await generateRefreshToken(tokenPayload);

    setRefreshCookie(c, newRefreshToken);

    return c.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
        user: safeUser,
      },
    });
  } catch (error: any) {
    const appError = handleError(error, 'Auth/refresh');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * POST /auth/logout
 * Clear refresh token cookie.
 */
authRoutes.post('/logout', (c) => {
  deleteCookie(c, REFRESH_COOKIE_NAME, { path: '/' });
  return c.json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * GET /auth/me
 * Return currently authenticated user profile.
 */
authRoutes.get('/me', authMiddleware, async (c) => {
  try {
    const sessionUser = c.get('user');

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        avatarUrl: users.avatarUrl,
        phone: users.phone,
        bio: users.bio,
        isVerifiedSeller: users.isVerifiedSeller,
        bankName: users.bankName,
        bankAccountNumber: users.bankAccountNumber,
        bankAccountHolder: users.bankAccountHolder,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(and(eq(users.id, sessionUser.userId), isNull(users.deletedAt)))
      .limit(1);

    if (!user) {
      return c.json(
        {
          success: false,
          message: 'User not found',
        },
        404
      );
    }

    return c.json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error: any) {
    const appError = handleError(error, 'Auth/me');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});
