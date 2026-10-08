import { Hono } from 'hono';
import * as crypto from 'crypto';
import { Readable } from 'stream';
import { eq, and, or, desc, asc, isNull, ilike, gte, lte, sql, count } from 'drizzle-orm';
import { db } from '../db/index.js';
import { assets, assetFiles, categories, users } from '../db/schema.js';
import { authMiddleware } from '../middleware/index.js';
import { verifyAccessToken } from '../lib/index.js';
import { Errors, handleError, logError } from '../lib/errors.js';
import { storage } from '../storage/index.js';
import { validateUploadedFile, mapAssetTypeToCategory } from '../utils/fileValidation.js';
import { assetFileService } from '../services/assetFileService.js';
import { formatAssetUrls } from '../utils/url.js';

export const assetRoutes = new Hono();

// Max upload size limits
const MAX_THUMBNAIL_SIZE = 15 * 1024 * 1024; // 15MB
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

/**
 * Generate URL-friendly slug from title
 */
function createSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${base || 'asset'}-${suffix}`;
}

/**
 * POST /assets/upload
 * Handle multipart asset upload (thumbnail + archive file + metadata)
 */
assetRoutes.post('/upload', authMiddleware, async (c) => {
  let createdAssetId: string | null = null;
  let uploadedThumbKey: string | null = null;

  try {
    const sessionUser = c.get('user');
    const formData = await c.req.formData();

    const title = (formData.get('title') as string || '').trim();
    const shortDescription = (formData.get('shortDescription') as string || '').trim();
    const description = (formData.get('description') as string || '').trim();
    const categoryId = (formData.get('categoryId') as string || '').trim();
    const assetType = (formData.get('assetType') as any || 'other').trim();
    const priceStr = (formData.get('price') as string || '0').trim();
    const discountPriceStr = (formData.get('discountPrice') as string || '').trim();
    const demoUrl = (formData.get('demoUrl') as string || '').trim();
    const tagsRaw = (formData.get('tags') as string || '').trim();

    // Files
    const thumbnail = formData.get('thumbnail') as unknown as File | null;
    const assetFile = formData.get('file') as unknown as File | null;

    // Field Validations
    if (!title || title.length < 3) {
      return c.json({ success: false, message: 'Title must be at least 3 characters', code: 'INVALID_INPUT' }, 400);
    }
    if (!description || description.length < 10) {
      return c.json({ success: false, message: 'Description must be at least 10 characters', code: 'INVALID_INPUT' }, 400);
    }
    if (!categoryId) {
      return c.json({ success: false, message: 'Please select a valid category', code: 'INVALID_INPUT' }, 400);
    }

    const price = parseFloat(priceStr);
    if (isNaN(price) || price < 0) {
      return c.json({ success: false, message: 'Price must be a valid non-negative number', code: 'INVALID_INPUT' }, 400);
    }

    const discountPrice = discountPriceStr ? parseFloat(discountPriceStr) : null;
    if (discountPrice !== null && (isNaN(discountPrice) || discountPrice < 0)) {
      return c.json({ success: false, message: 'Discount price must be a valid number', code: 'INVALID_INPUT' }, 400);
    }

    if (discountPrice !== null && discountPrice >= price) {
      return c.json({ success: false, message: 'Discount price must be lower than original price', code: 'INVALID_INPUT' }, 400);
    }

    // Thumbnail Validation
    if (!thumbnail || !(thumbnail instanceof File) || thumbnail.size === 0) {
      return c.json({ success: false, message: 'Please select a valid cover thumbnail image.', code: 'INVALID_FILE' }, 400);
    }

    const thumbValidation = validateUploadedFile(thumbnail, 'image', {
      maxSizeBytes: MAX_THUMBNAIL_SIZE,
    });
    if (!thumbValidation.valid) {
      return c.json({ success: false, message: thumbValidation.error, code: 'INVALID_FILE_TYPE' }, 400);
    }

    // Asset Deliverable Validation
    if (!assetFile || !(assetFile instanceof File) || assetFile.size === 0) {
      return c.json({ success: false, message: 'Please select a valid main digital asset file archive.', code: 'INVALID_FILE' }, 400);
    }

    const targetCategory = mapAssetTypeToCategory(assetType);
    const fileValidation = validateUploadedFile(assetFile, targetCategory, {
      maxSizeBytes: MAX_FILE_SIZE,
    });
    if (!fileValidation.valid) {
      return c.json({ success: false, message: fileValidation.error, code: 'INVALID_FILE_TYPE' }, 400);
    }

    // Parse Tags
    let tags: string[] = [];
    if (tagsRaw) {
      try {
        tags = JSON.parse(tagsRaw);
      } catch {
        tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean);
      }
    }

    // 1. Upload Thumbnail via Storage Provider
    const thumbBuffer = Buffer.from(await thumbnail.arrayBuffer());
    const thumbUpload = await storage.upload({
      buffer: thumbBuffer,
      fileName: thumbnail.name,
      mimeType: thumbValidation.mimeType || thumbnail.type || 'image/jpeg',
      folder: 'thumbnails',
      isPublic: true,
    });
    uploadedThumbKey = thumbUpload.fileKey;
    const finalThumbnailUrl = thumbUpload.publicUrl;

    // 2. Create Asset Record in Database
    const slug = createSlug(title);

    const [newAsset] = await db
      .insert(assets)
      .values({
        sellerId: sessionUser.userId,
        categoryId,
        title,
        slug,
        shortDescription: shortDescription || null,
        description,
        assetType,
        status: 'pending', // Awaiting Admin Review
        price: price.toFixed(2),
        discountPrice: discountPrice !== null ? discountPrice.toFixed(2) : null,
        currency: 'IDR',
        thumbnailUrl: finalThumbnailUrl,
        previewImages: [],
        demoUrl: demoUrl || null,
        tags,
      })
      .returning();

    if (!newAsset) {
      throw new Error('Failed to create asset record in database');
    }
    createdAssetId = newAsset.id;

    // 3. Save Deliverable File & Persist in asset_files table
    const fileBuffer = Buffer.from(await assetFile.arrayBuffer());
    const { fileRecord } = await assetFileService.saveAssetDeliverable({
      assetId: newAsset.id,
      fileBuffer,
      fileName: assetFile.name,
      mimeType: fileValidation.mimeType || assetFile.type || 'application/octet-stream',
      assetType,
      isMain: true,
    });

    return c.json(
      {
        success: true,
        message: 'Asset submitted successfully and is now pending admin approval',
        data: {
          asset: formatAssetUrls(newAsset),
          file: fileRecord,
        },
      },
      201
    );
  } catch (error: any) {
    // Transaction Rollback: Clean up created asset and thumbnail if flow failed midway
    if (createdAssetId) {
      try {
        await db.delete(assets).where(eq(assets.id, createdAssetId));
        logError(`Rolled back asset record ${createdAssetId}`, 'Asset/upload/rollback');
      } catch (rollbackErr) {
        logError(rollbackErr, 'Asset/upload/rollback-db');
      }
    }
    if (uploadedThumbKey) {
      try {
        await storage.delete(uploadedThumbKey);
        logError(`Rolled back thumbnail storage file ${uploadedThumbKey}`, 'Asset/upload/rollback');
      } catch (rollbackErr) {
        logError(rollbackErr, 'Asset/upload/rollback-thumbnail');
      }
    }

    const appError = handleError(error, 'Asset/upload');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * Handler for submitting/resubmitting an asset for admin moderation
 */
async function handleAssetModerationSubmission(c: any) {
  try {
    const sessionUser = c.get('user');
    const assetId = c.req.param('id');

    if (!assetId) {
      return c.json({ success: false, message: 'ID aset wajib disertakan.', code: 'INVALID_INPUT' }, 400);
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assetId);
    const idCondition = isUuid
      ? or(eq(assets.id, assetId), eq(assets.slug, assetId))
      : eq(assets.slug, assetId);

    const [existing] = await db
      .select()
      .from(assets)
      .where(and(idCondition, isNull(assets.deletedAt)))
      .limit(1);

    if (!existing) {
      return c.json({ success: false, message: 'Aset tidak ditemukan.', code: 'NOT_FOUND' }, 404);
    }

    // Permission check: only the seller who uploaded the asset (or admin) can submit it
    if (
      existing.sellerId !== sessionUser.userId &&
      sessionUser.role !== 'admin' &&
      sessionUser.role !== 'superadmin'
    ) {
      return c.json(
        {
          success: false,
          message: 'Akses ditolak: Anda hanya dapat mengajukan aset milik Anda sendiri.',
          code: 'FORBIDDEN',
        },
        403
      );
    }

    // Status validations
    if (existing.status === 'approved') {
      return c.json(
        {
          success: false,
          message: 'Aset ini sudah disetujui dan telah aktif di marketplace.',
          code: 'ASSET_ALREADY_APPROVED',
        },
        400
      );
    }

    if (existing.status === 'pending') {
      return c.json(
        {
          success: false,
          message: 'Aset ini sudah berada dalam antrean moderasi administrator.',
          code: 'ASSET_ALREADY_PENDING',
        },
        409
      );
    }

    // Atomic update status to 'pending' to prevent race conditions on double submit
    const [updatedAsset] = await db
      .update(assets)
      .set({
        status: 'pending',
        rejectionReason: null,
        updatedAt: new Date(),
      })
      .where(and(eq(assets.id, existing.id), eq(assets.status, existing.status)))
      .returning();

    if (!updatedAsset) {
      return c.json(
        {
          success: false,
          message: 'Aset ini telah diperbarui oleh permintaan lain atau statusnya telah berubah.',
          code: 'ASSET_STATE_CONFLICT',
        },
        409
      );
    }

    return c.json({
      success: true,
      message: 'Aset berhasil diajukan untuk moderasi administrator.',
      data: {
        asset: formatAssetUrls(updatedAsset),
      },
    });
  } catch (error: any) {
    const appError = handleError(error, 'Asset/moderation');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
}

/**
 * POST /assets/:id/submit
 * POST /assets/:id/moderation
 * POST /assets/:id/resubmit
 * Submit or resubmit an asset for administrator moderation
 */
assetRoutes.post('/:id/submit', authMiddleware, handleAssetModerationSubmission);
assetRoutes.post('/:id/moderation', authMiddleware, handleAssetModerationSubmission);
assetRoutes.post('/:id/resubmit', authMiddleware, handleAssetModerationSubmission);

/**
 * GET /assets/my
 * Retrieve all assets uploaded by the currently authenticated seller
 */
assetRoutes.get('/my', authMiddleware, async (c) => {
  try {
    const sessionUser = c.get('user');

    const myListings = await db
      .select({
        id: assets.id,
        title: assets.title,
        slug: assets.slug,
        shortDescription: assets.shortDescription,
        description: assets.description,
        assetType: assets.assetType,
        status: assets.status,
        rejectionReason: assets.rejectionReason,
        reviewedAt: assets.reviewedAt,
        price: assets.price,
        discountPrice: assets.discountPrice,
        currency: assets.currency,
        thumbnailUrl: assets.thumbnailUrl,
        demoUrl: assets.demoUrl,
        tags: assets.tags,
        downloadCount: assets.downloadCount,
        viewCount: assets.viewCount,
        ratingAvg: assets.ratingAvg,
        ratingCount: assets.ratingCount,
        createdAt: assets.createdAt,
        updatedAt: assets.updatedAt,
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
        },
      })
      .from(assets)
      .leftJoin(categories, eq(assets.categoryId, categories.id))
      .where(and(eq(assets.sellerId, sessionUser.userId), isNull(assets.deletedAt)))
      .orderBy(desc(assets.createdAt));

    return c.json({
      success: true,
      data: {
        assets: myListings.map(formatAssetUrls),
      },
    });
  } catch (error: any) {
    const appError = handleError(error, 'Asset/my');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * GET /assets
 * Public marketplace listing: retrieves ONLY approved assets with filters and pagination
 */
assetRoutes.get('/', async (c) => {
  try {
    const categoryQuery = c.req.query('category');
    const assetType = c.req.query('type');
    const search = c.req.query('q');
    const minPriceStr = c.req.query('minPrice');
    const maxPriceStr = c.req.query('maxPrice');
    const sort = c.req.query('sort') || 'newest';
    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
    const limit = Math.max(1, Math.min(50, parseInt(c.req.query('limit') || '9', 10)));
    const offset = (page - 1) * limit;

    // Base condition: MUST BE APPROVED and NOT DELETED
    const conditions = [eq(assets.status, 'approved'), isNull(assets.deletedAt)];

    if (categoryQuery) {
      conditions.push(
        or(
          eq(categories.slug, categoryQuery.trim()),
          eq(categories.id, categoryQuery.trim())
        )!
      );
    }

    if (assetType && assetType !== 'all') {
      conditions.push(eq(assets.assetType, assetType as any));
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(assets.title, q),
          ilike(assets.description, q),
          ilike(assets.shortDescription, q)
        )!
      );
    }

    if (minPriceStr) {
      const minP = parseFloat(minPriceStr);
      if (!isNaN(minP)) {
        conditions.push(gte(assets.price, minP.toFixed(2)));
      }
    }

    if (maxPriceStr) {
      const maxP = parseFloat(maxPriceStr);
      if (!isNaN(maxP)) {
        conditions.push(lte(assets.price, maxP.toFixed(2)));
      }
    }

    // Determine Order By clause
    let orderByClause = desc(assets.createdAt);
    if (sort === 'price_asc') {
      orderByClause = asc(assets.price);
    } else if (sort === 'price_desc') {
      orderByClause = desc(assets.price);
    } else if (sort === 'popular') {
      orderByClause = desc(assets.downloadCount);
    } else if (sort === 'rating') {
      orderByClause = desc(assets.ratingAvg);
    }

    const whereClause = and(...conditions);

    // Fetch Total Count for pagination
    const [totalResult] = await db
      .select({ value: count() })
      .from(assets)
      .leftJoin(categories, eq(assets.categoryId, categories.id))
      .where(whereClause);

    const total = Number(totalResult?.value || 0);
    const totalPages = Math.ceil(total / limit) || 1;

    // Fetch Paginated Assets
    const approvedAssets = await db
      .select({
        id: assets.id,
        title: assets.title,
        slug: assets.slug,
        shortDescription: assets.shortDescription,
        assetType: assets.assetType,
        price: assets.price,
        discountPrice: assets.discountPrice,
        currency: assets.currency,
        thumbnailUrl: assets.thumbnailUrl,
        tags: assets.tags,
        downloadCount: assets.downloadCount,
        viewCount: assets.viewCount,
        ratingAvg: assets.ratingAvg,
        ratingCount: assets.ratingCount,
        createdAt: assets.createdAt,
        seller: {
          id: users.id,
          name: users.name,
          avatarUrl: users.avatarUrl,
          isVerifiedSeller: users.isVerifiedSeller,
        },
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
        },
      })
      .from(assets)
      .leftJoin(users, eq(assets.sellerId, users.id))
      .leftJoin(categories, eq(assets.categoryId, categories.id))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    return c.json({
      success: true,
      data: {
        assets: approvedAssets.map(formatAssetUrls),
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      },
    });
  } catch (error: any) {
    const appError = handleError(error, 'Asset/list');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * GET /assets/:id/download
 * Securely stream and download main asset deliverable (validates purchase or ownership)
 */
assetRoutes.get('/:id/download', authMiddleware, async (c) => {
  try {
    const sessionUser = c.get('user');
    const assetId = c.req.param('id') || '';

    const perm = await assetFileService.checkAssetDownloadPermission(assetId, sessionUser);
    if (!perm.allowed || !perm.file || !perm.asset) {
      return c.json(
        {
          success: false,
          message: perm.reason || 'Akses ditolak: Anda belum membeli atau mengklaim aset ini.',
        },
        perm.statusCode as any
      );
    }

    const download = await assetFileService.streamDownload(perm.file, perm.asset);

    const headers: Record<string, string> = {
      'Content-Type': download.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(download.fileName)}"`,
      'Content-Length': download.fileSizeBytes.toString(),
      'Cache-Control': 'private, no-transform, no-store',
    };

    if (download.stream) {
      return c.body(Readable.toWeb(download.stream) as any, 200, headers);
    }
    return c.body(download.buffer as any, 200, headers);
  } catch (error: any) {
    logError(error, 'Asset/download');
    const isNotFound = error?.message?.includes('File not found') || error?.message?.includes('tidak ditemukan');
    const appError = isNotFound
      ? Errors.notFound('File not found on storage server. Please contact support.')
      : Errors.internal('Failed to download asset file');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * GET /assets/files/:fileId/download
 * Securely stream and download a specific file by its file ID
 */
assetRoutes.get('/files/:fileId/download', authMiddleware, async (c) => {
  try {
    const sessionUser = c.get('user');
    const fileId = c.req.param('fileId') || '';

    const perm = await assetFileService.checkDownloadPermission(fileId, sessionUser);
    if (!perm.allowed || !perm.file || !perm.asset) {
      return c.json(
        {
          success: false,
          message: perm.reason || 'Akses ditolak: Anda belum memiliki izin untuk mengunduh berkas ini.',
        },
        perm.statusCode as any
      );
    }

    const download = await assetFileService.streamDownload(perm.file, perm.asset);

    const headers: Record<string, string> = {
      'Content-Type': download.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(download.fileName)}"`,
      'Content-Length': download.fileSizeBytes.toString(),
      'Cache-Control': 'private, no-transform, no-store',
    };

    if (download.stream) {
      return c.body(Readable.toWeb(download.stream) as any, 200, headers);
    }
    return c.body(download.buffer as any, 200, headers);
  } catch (error: any) {
    logError(error, 'Asset/fileDownload');
    const isNotFound = error?.message?.includes('File not found') || error?.message?.includes('tidak ditemukan');
    const appError = isNotFound
      ? Errors.notFound('File not found on storage server. Please contact support.')
      : Errors.internal('Failed to download file');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * POST /assets/:id/claim
 * Claim free asset and add to user's library
 */
assetRoutes.post('/:id/claim', authMiddleware, async (c) => {
  try {
    const sessionUser = c.get('user');
    const assetId = c.req.param('id') || '';

    const [asset] = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, assetId), isNull(assets.deletedAt)))
      .limit(1);

    if (!asset) {
      return c.json({ success: false, message: 'Aset tidak ditemukan' }, 404);
    }

    if (asset.status !== 'approved') {
      return c.json({ success: false, message: 'Aset belum disetujui untuk diklaim' }, 400);
    }

    if (asset.sellerId === sessionUser.userId) {
      return c.json({ success: false, message: 'Anda adalah pemilik aset ini' }, 400);
    }

    const effectivePrice = asset.discountPrice ? Number(asset.discountPrice) : Number(asset.price);
    if (effectivePrice > 0) {
      return c.json({ success: false, message: 'Aset ini berbayar dan harus dibeli melalui checkout' }, 400);
    }

    return c.redirect(`/api/purchases/claim/${asset.id}`, 307);
  } catch (error: any) {
    const appError = handleError(error, 'Asset/claim');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * GET /assets/:identifier
 * Retrieve single asset details by ID or Slug (only approved assets for public)
 */
assetRoutes.get('/:identifier', async (c) => {
  try {
    const identifier = c.req.param('identifier');

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    const identifierCondition = isUuid
      ? or(eq(assets.id, identifier), eq(assets.slug, identifier))
      : eq(assets.slug, identifier);

    // Query asset by ID or Slug
    const [asset] = await db
      .select({
        id: assets.id,
        sellerId: assets.sellerId,
        categoryId: assets.categoryId,
        title: assets.title,
        slug: assets.slug,
        shortDescription: assets.shortDescription,
        description: assets.description,
        assetType: assets.assetType,
        status: assets.status,
        rejectionReason: assets.rejectionReason,
        reviewedAt: assets.reviewedAt,
        price: assets.price,
        discountPrice: assets.discountPrice,
        currency: assets.currency,
        thumbnailUrl: assets.thumbnailUrl,
        previewImages: assets.previewImages,
        demoUrl: assets.demoUrl,
        tags: assets.tags,
        downloadCount: assets.downloadCount,
        viewCount: assets.viewCount,
        ratingAvg: assets.ratingAvg,
        ratingCount: assets.ratingCount,
        createdAt: assets.createdAt,
        updatedAt: assets.updatedAt,
        seller: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
          bio: users.bio,
          isVerifiedSeller: users.isVerifiedSeller,
          createdAt: users.createdAt,
        },
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          description: categories.description,
        },
      })
      .from(assets)
      .leftJoin(users, eq(assets.sellerId, users.id))
      .leftJoin(categories, eq(assets.categoryId, categories.id))
      .where(
        and(
          identifierCondition,
          isNull(assets.deletedAt)
        )
      )
      .limit(1);

    if (!asset) {
      return c.json({ success: false, message: 'Asset not found' }, 404);
    }

    // Security Check: If asset is NOT approved, only author or admin may view
    if (asset.status !== 'approved') {
      const authHeader = c.req.header('Authorization');
      let isAuthorized = false;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = await verifyAccessToken(token);
        if (payload) {
          if (payload.userId === asset.sellerId || payload.role === 'admin' || payload.role === 'superadmin') {
            isAuthorized = true;
          }
        }
      }

      if (!isAuthorized) {
        return c.json(
          {
            success: false,
            message: 'This asset is currently under moderation and is not publicly accessible.',
          },
          403
        );
      }
    }

    // Fetch deliverable public file metadata (excluding private disk keys)
    const files = await db
      .select({
        id: assetFiles.id,
        fileName: assetFiles.fileName,
        fileSizeBytes: assetFiles.fileSizeBytes,
        mimeType: assetFiles.mimeType,
        fileExtension: assetFiles.fileExtension,
        version: assetFiles.version,
        isMain: assetFiles.isMain,
      })
      .from(assetFiles)
      .where(and(eq(assetFiles.assetId, asset.id), isNull(assetFiles.deletedAt)));

    // Safely increment view count asynchronously
    db.update(assets)
      .set({ viewCount: sql`${assets.viewCount} + 1` })
      .where(eq(assets.id, asset.id))
      .catch((err) => console.warn('Failed to increment view count:', err));

    return c.json({
      success: true,
      data: {
        asset: {
          ...formatAssetUrls(asset),
          files,
        },
      },
    });
  } catch (error: any) {
    const appError = handleError(error, 'Asset/detail');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});
