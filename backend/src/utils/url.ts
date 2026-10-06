/**
 * URL Utilities for Asset Market API
 * Normalizes relative asset paths to absolute URLs accessible by client applications.
 */

export function toAbsoluteUrl(urlPath: string | null | undefined): string | null {
  if (!urlPath) return null;
  
  // Already absolute URL or data URI
  if (urlPath.startsWith('http://') || urlPath.startsWith('https://') || urlPath.startsWith('data:')) {
    return urlPath;
  }

  const appUrl = (process.env.APP_URL || `http://localhost:${process.env.PORT || 3001}`).replace(/\/+$/, '');
  let cleanPath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;

  // Ensure path starts with /uploads for static file resolution
  if (!cleanPath.startsWith('/uploads')) {
    cleanPath = `/uploads${cleanPath}`;
  }

  return `${appUrl}${cleanPath}`;
}

export function formatAssetUrls<T extends Record<string, any>>(asset: T): T {
  if (!asset) return asset;

  const rawUrl =
    asset.thumbnailUrl ||
    asset.thumbnail ||
    asset.thumbnail_url ||
    asset.cover_url ||
    asset.coverUrl ||
    asset.image_url ||
    asset.imageUrl;

  const absUrl = toAbsoluteUrl(rawUrl);

  const previewImages = Array.isArray(asset.previewImages)
    ? asset.previewImages.map((p: string) => toAbsoluteUrl(p) || p)
    : asset.previewImages;

  return {
    ...asset,
    thumbnailUrl: absUrl,
    thumbnail_url: absUrl,
    thumbnail: absUrl,
    coverUrl: absUrl,
    cover_url: absUrl,
    imageUrl: absUrl,
    image_url: absUrl,
    previewImages,
  };
}

