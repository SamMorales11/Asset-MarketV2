/**
 * Image Utilities & Luxury Fallbacks for Asset Market
 * Provides resilient image resolution and editorial dark placeholder fallbacks.
 */

export function getAssetImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  let cleanPath = url.startsWith('/') ? url : `/${url}`;
  if (!cleanPath.startsWith('/uploads')) {
    cleanPath = `/uploads${cleanPath}`;
  }
  const apiBase = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';
  const backendBase = apiBase.replace(/\/api\/?$/, '');
  return `${backendBase}${cleanPath}`;
}

/**
 * High-craft luxury SVG placeholder matching the Editorial & Typography-Led design system.
 * Used when an image fails to load or is not yet provided.
 */
export function getLuxuryPlaceholder(title = 'Digital Asset', category = 'Curated Good'): string {
  const safeTitle = (title || 'Digital Asset')
    .replace(/["'<>&]/g, '')
    .slice(0, 36);
  const safeCategory = (category || 'Curated Good')
    .replace(/["'<>&]/g, '')
    .slice(0, 24)
    .toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450" fill="none">
    <defs>
      <radialGradient id="luxBg" cx="50%" cy="38%" r="65%">
        <stop offset="0%" stop-color="#1A1A26"/>
        <stop offset="55%" stop-color="#0F0F16"/>
        <stop offset="100%" stop-color="#08080C"/>
      </radialGradient>
      <linearGradient id="luxBorder" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#D93A0F" stop-opacity="0.4"/>
        <stop offset="50%" stop-color="#2A2A38" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="#00B8B8" stop-opacity="0.3"/>
      </linearGradient>
      <linearGradient id="gemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#D93A0F"/>
        <stop offset="100%" stop-color="#FF6B4A"/>
      </linearGradient>
    </defs>
    <rect width="800" height="450" fill="url(#luxBg)"/>
    <rect x="24" y="24" width="752" height="402" rx="20" stroke="url(#luxBorder)" stroke-width="1.2"/>
    <circle cx="400" cy="180" r="42" fill="#14141E" stroke="#252534" stroke-width="1"/>
    <!-- Geometric Luxury Star Emblem -->
    <path d="M400 152 L406 172 L426 178 L406 184 L400 204 L394 184 L374 178 L394 172 Z" fill="url(#gemGrad)"/>
    <circle cx="400" cy="178" r="3" fill="#FFFFFF"/>
    <text x="400" y="255" text-anchor="middle" font-family="'Instrument Serif', Georgia, serif" font-size="24" font-style="italic" fill="#EEEEF4" letter-spacing="0.3">${safeTitle}</text>
    <text x="400" y="285" text-anchor="middle" font-family="'Satoshi', system-ui, sans-serif" font-size="10" font-weight="700" fill="#717182" letter-spacing="3.5">${safeCategory}</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Event handler for @error on <img> tags
 */
export function handleImageFallback(event: Event, title = 'Digital Asset', category = 'Curated Good') {
  const target = event.target as HTMLImageElement;
  if (!target) return;
  if (target.dataset.fallbackApplied === 'true') return;
  target.dataset.fallbackApplied = 'true';
  target.src = getLuxuryPlaceholder(title, category);
}
