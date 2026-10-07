/**
 * Custom Application Error class
 * Provides consistent error handling across all routes
 * Safe to expose to clients (no stack traces or internal details)
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      message: this.message,
      code: this.code,
    };
  }
}

// Common error factories for type safety
export const Errors = {
  // 400 Bad Request
  badRequest: (message: string, code = 'BAD_REQUEST') =>
    new AppError(message, 400, code),

  validationFailed: (message: string) =>
    new AppError(message, 400, 'VALIDATION_FAILED'),

  invalidInput: (message: string) =>
    new AppError(message, 400, 'INVALID_INPUT'),

  // 401 Unauthorized
  unauthorized: (message = 'Authentication required') =>
    new AppError(message, 401, 'UNAUTHORIZED'),

  invalidCredentials: () =>
    new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS'),

  tokenExpired: () =>
    new AppError('Access token has expired', 401, 'TOKEN_EXPIRED'),

  // 403 Forbidden
  forbidden: (message = 'You do not have permission to perform this action') =>
    new AppError(message, 403, 'FORBIDDEN'),

  insufficientRole: (requiredRole: string) =>
    new AppError(`Requires ${requiredRole} role`, 403, 'INSUFFICIENT_ROLE'),

  // 404 Not Found
  notFound: (resource = 'Resource') =>
    new AppError(`${resource} not found`, 404, 'NOT_FOUND'),

  assetNotFound: () =>
    new AppError('Asset not found', 404, 'ASSET_NOT_FOUND'),

  userNotFound: () =>
    new AppError('User not found', 404, 'USER_NOT_FOUND'),

  transactionNotFound: () =>
    new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND'),

  // 409 Conflict
  conflict: (message: string) =>
    new AppError(message, 409, 'CONFLICT'),

  alreadyExists: (resource: string) =>
    new AppError(`${resource} already exists`, 409, 'ALREADY_EXISTS'),

  emailAlreadyExists: () =>
    new AppError('Email address is already registered', 409, 'EMAIL_EXISTS'),

  assetAlreadyInCart: () =>
    new AppError('Asset is already in your cart', 409, 'ALREADY_IN_CART'),

  paymentAlreadySubmitted: () =>
    new AppError('Payment has already been submitted for this transaction', 409, 'PAYMENT_ALREADY_SUBMITTED'),

  // 410 Gone
  resourceExpired: (resource = 'Resource') =>
    new AppError(`${resource} has expired`, 410, 'RESOURCE_EXPIRED'),

  invoiceExpired: () =>
    new AppError('This invoice has expired. Please create a new order.', 410, 'INVOICE_EXPIRED'),

  // 422 Unprocessable Entity
  unprocessable: (message: string) =>
    new AppError(message, 422, 'UNPROCESSABLE_ENTITY'),

  assetNotApproved: () =>
    new AppError('Asset is not approved for sale', 422, 'ASSET_NOT_APPROVED'),

  insufficientFunds: () =>
    new AppError('Insufficient funds for this transaction', 422, 'INSUFFICIENT_FUNDS'),

  // 429 Too Many Requests
  tooManyRequests: (message = 'Too many requests. Please try again later.') =>
    new AppError(message, 429, 'TOO_MANY_REQUESTS'),

  // 500 Internal Server Error
  internal: (message = 'An unexpected error occurred') =>
    new AppError(message, 500, 'INTERNAL_ERROR'),

  databaseError: () =>
    new AppError('A database error occurred', 500, 'DATABASE_ERROR'),

  uploadFailed: () =>
    new AppError('File upload failed', 500, 'UPLOAD_FAILED'),
};

/**
 * Wrapper for try-catch blocks
 * Logs the full error internally but returns safe error to client
 */
export function handleError(error: unknown, context?: string): AppError {
  if (error instanceof AppError) {
    // Already a safe error, just log context
    if (context) {
      console.error(`[${context}]`, error.message);
    }
    return error;
  }

  // Unknown error - log full details, return generic message
  if (context) {
    console.error(`[${context}] Unexpected error:`, error);
  } else {
    console.error('Unexpected error:', error);
  }

  // Don't leak internal error details
  return Errors.internal('An unexpected error occurred. Please try again later.');
}

/**
 * Check if error is a known constraint violation (e.g., unique constraint)
 */
export function isConstraintError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('unique constraint') ||
      message.includes('duplicate key') ||
      message.includes('duplicate entry') ||
      message.includes('23505') // PostgreSQL unique violation
    );
  }
  return false;
}

/**
 * Log error with full stack trace for debugging
 */
export function logError(error: unknown, context?: string): void {
  if (context) {
    console.error(`[ERROR] ${context}:`, error);
  } else {
    console.error('[ERROR]', error);
  }
}
