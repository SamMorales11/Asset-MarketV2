export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  shouldRetry?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

/**
 * Determine if an error is transient and safe to retry.
 * Only retry on network errors, timeouts, or transient 5xx server errors.
 * Never retry 4xx client errors (e.g. 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404, 409, 422).
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false;

  // Explicit network or timeout codes
  if (
    error.code === 'NETWORK_ERROR' ||
    error.code === 'TIMEOUT' ||
    error.code === 'ECONNABORTED'
  ) {
    return true;
  }

  // Check HTTP status code
  const status = error.statusCode || error.response?.status;
  if (status) {
    // 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout, 500 Server Error
    if (status === 502 || status === 503 || status === 504 || status === 500) {
      return true;
    }
    // 4xx errors should never be retried automatically
    if (status >= 400 && status < 500) {
      return false;
    }
  }

  // Check error message hints
  const msg = String(error.message || '').toLowerCase();
  if (
    msg.includes('network error') ||
    msg.includes('timeout') ||
    msg.includes('connection reset') ||
    msg.includes('koneksi terputus')
  ) {
    return true;
  }

  return false;
}

/**
 * Executes an asynchronous function with exponential backoff retry.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 8000,
    backoffFactor = 2,
    shouldRetry = isRetryableError,
    onRetry,
  } = options;

  let attempt = 0;
  let delay = initialDelayMs;

  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > maxRetries || !shouldRetry(err)) {
        throw err;
      }

      if (onRetry) {
        onRetry(attempt, err);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffFactor, maxDelayMs);
    }
  }
}
