/**
 * Custom Application Error class
 * Provides consistent error handling across all routes
 * Safe to expose to clients (no stack traces or internal details)
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly errors?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    errors?: any
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      message: this.message,
      code: this.code,
      ...(this.errors ? { error: this.errors } : {}),
    };
  }
}

// Common error factories for type safety
export const Errors = {
  // 400 Bad Request
  badRequest: (message: string, code = 'BAD_REQUEST', errors?: any) =>
    new AppError(message, 400, code, errors),

  validationFailed: (message: string, errors?: any) =>
    new AppError(message, 400, 'VALIDATION_FAILED', errors),

  invalidInput: (message: string) =>
    new AppError(message, 400, 'INVALID_INPUT'),

  // 401 Unauthorized
  unauthorized: (message = 'Authentication required', code = 'UNAUTHORIZED') =>
    new AppError(message, 401, code),

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
    new AppError('Asset not found or no longer available', 404, 'ASSET_NOT_FOUND'),

  userNotFound: () =>
    new AppError('User not found', 404, 'USER_NOT_FOUND'),

  transactionNotFound: () =>
    new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND'),

  // 409 Conflict
  conflict: (message: string, code = 'CONFLICT') =>
    new AppError(message, 409, code),

  alreadyExists: (resource: string) =>
    new AppError(`${resource} already exists`, 409, 'ALREADY_EXISTS'),

  emailAlreadyExists: () =>
    new AppError('Email address is already registered', 409, 'EMAIL_EXISTS'),

  assetAlreadyInCart: () =>
    new AppError('Asset is already in your cart', 409, 'ALREADY_IN_CART'),

  paymentAlreadySubmitted: () =>
    new AppError('Payment has already been submitted for this transaction', 409, 'PAYMENT_ALREADY_SUBMITTED'),

  paymentAlreadyPending: () =>
    new AppError('A payment confirmation is already pending review for this invoice', 409, 'PAYMENT_ALREADY_PENDING'),

  assetAlreadyPending: () =>
    new AppError('This asset is already pending administrative review', 409, 'ASSET_ALREADY_PENDING'),

  cartItemsUnavailable: (unavailableItems: string[]) =>
    new AppError(
      `Some items in your cart are no longer available: ${unavailableItems.join(', ')}`,
      409,
      'CART_ITEMS_UNAVAILABLE',
      unavailableItems
    ),

  // 410 Gone
  resourceExpired: (resource = 'Resource') =>
    new AppError(`${resource} has expired`, 410, 'RESOURCE_EXPIRED'),

  invoiceExpired: () =>
    new AppError('This invoice has expired. Please create a new order.', 410, 'INVOICE_EXPIRED'),

  // 413 Payload Too Large
  fileTooLarge: (message = 'File size exceeds allowed limit') =>
    new AppError(message, 413, 'FILE_TOO_LARGE'),

  // 415 Unsupported Media Type
  unsupportedFileType: (message = 'File format is not supported') =>
    new AppError(message, 415, 'UNSUPPORTED_MEDIA_TYPE'),

  // 422 Unprocessable Entity
  unprocessable: (message: string, code = 'UNPROCESSABLE_ENTITY') =>
    new AppError(message, 422, code),

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

  databaseError: (message = 'A database error occurred') =>
    new AppError(message, 500, 'DATABASE_ERROR'),

  uploadFailed: (message = 'File upload failed. Please try again.') =>
    new AppError(message, 500, 'UPLOAD_FAILED'),

  diskError: (message = 'Storage operation failed due to a disk error') =>
    new AppError(message, 500, 'DISK_ERROR'),

  // 503 Service Unavailable
  serviceUnavailable: (message = 'Service is temporarily unavailable. Please try again shortly.') =>
    new AppError(message, 503, 'SERVICE_UNAVAILABLE'),

  databaseUnavailable: (message = 'Database service is temporarily unavailable. Please try again shortly.') =>
    new AppError(message, 503, 'DATABASE_UNAVAILABLE'),
};

/**
 * Wrapper for try-catch blocks
 * Logs the full error internally but returns safe, typed error to client
 */
export function handleError(error: unknown, context?: string): AppError {
  if (error instanceof AppError) {
    if (context) {
      console.error(`[${context}] AppError (${error.statusCode} ${error.code}):`, error.message);
    }
    return error;
  }

  const errStr = error instanceof Error ? error.message : String(error);
  const errLower = errStr.toLowerCase();

  // Log full details internally
  if (context) {
    console.error(`[${context}] Unexpected error:`, error);
  } else {
    console.error('Unexpected error:', error);
  }

  // 1. Database Connection & Availability Errors
  if (
    errLower.includes('econnrefused') ||
    errLower.includes('etimedout') ||
    errLower.includes('neondberror') ||
    errLower.includes('connection terminated') ||
    errLower.includes('fetch failed') ||
    errLower.includes('socket hang up')
  ) {
    return Errors.databaseUnavailable();
  }

  // 2. Database Constraint Violations
  if (isConstraintError(error)) {
    return Errors.conflict('Data conflict: A record with this information already exists.');
  }

  if (errLower.includes('23503') || errLower.includes('foreign key constraint')) {
    return Errors.badRequest('Referenced record does not exist or has active dependencies.');
  }

  // 3. Filesystem / Disk Errors
  if (errLower.includes('enospc')) {
    return Errors.diskError('Server storage is currently full. Please try again later.');
  }
  if (errLower.includes('eacces') || errLower.includes('eperm')) {
    return Errors.diskError('Server storage permission denied. Please contact support.');
  }

  // 4. JSON Syntax / Parsing Errors
  if (error instanceof SyntaxError && errLower.includes('json')) {
    return Errors.badRequest('Invalid JSON payload provided.', 'INVALID_JSON');
  }

  // 5. Default Generic Internal Error (No technical details leaked)
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
