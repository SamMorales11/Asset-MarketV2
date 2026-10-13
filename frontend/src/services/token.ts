/**
 * In-Memory Access Token Storage
 *
 * Keeps JWT access token exclusively in JavaScript application memory
 * to prevent XSS-based token theft from localStorage/sessionStorage.
 */

let inMemoryAccessToken: string | null = null;

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

export function clearAccessToken(): void {
  inMemoryAccessToken = null;
}
