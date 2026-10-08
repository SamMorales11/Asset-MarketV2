import type { Context, Next } from 'hono';
import { verifyAccessToken } from '../lib/index.js';
import type { JWTPayload, UserRole } from '../types/index.js';

// Extend Hono ContextVariables type for TypeScript autocomplete
declare module 'hono' {
  interface ContextVariableMap {
    user: JWTPayload;
  }
}

/**
 * Authentication Middleware:
 * Validates the short-lived JWT Access Token from the Authorization header.
 */
export async function authMiddleware(c: Context, next: Next) {
  let token: string | undefined;

  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (c.req.query('token')) {
    token = c.req.query('token')?.trim();
  }

  if (!token) {
    return c.json(
      {
        success: false,
        message: 'Unauthorized: Missing or malformed Authorization token',
        code: 'MISSING_TOKEN',
      },
      401
    );
  }

  const payload = await verifyAccessToken(token);

  if (!payload) {
    return c.json(
      {
        success: false,
        message: 'Unauthorized: Invalid or expired access token',
        code: 'TOKEN_EXPIRED',
      },
      401
    );
  }

  c.set('user', payload);
  return next();
}

/**
 * Role-Based Access Control (RBAC) Middleware:
 * Ensures the authenticated user has one of the allowed roles.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');

    if (!user) {
      return c.json(
        {
          success: false,
          message: 'Unauthorized: Authentication required',
          code: 'UNAUTHORIZED',
        },
        401
      );
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json(
        {
          success: false,
          message: `Forbidden: Requires one of [${allowedRoles.join(', ')}] role`,
          code: 'FORBIDDEN',
        },
        403
      );
    }

    return next();
  };
}
