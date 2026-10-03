import { eq, and, isNull, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  assets,
  assetFiles,
  transactions,
  transactionItems,
} from '../db/schema.js';
import { storage } from '../storage/index.js';
import type { UploadedFileResult, FileDownloadStream } from '../storage/types.js';
import {
  validateUploadedFile,
  mapAssetTypeToCategory,
  type FileCategory,
} from '../utils/fileValidation.js';
import type { JWTPayload } from '../types/index.js';

export interface SaveDeliverableOptions {
  assetId: string;
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  assetType?: string;
  version?: string;
  isMain?: boolean;
}

export interface PermissionCheckResult {
  allowed: boolean;
  statusCode: number;
  reason?: string;
  file?: typeof assetFiles.$inferSelect;
  asset?: typeof assets.$inferSelect;
}

export class AssetFileService {
  /**
   * Validate, store, and record asset deliverable in the database
   */
  async saveAssetDeliverable(options: SaveDeliverableOptions): Promise<{
    fileRecord: typeof assetFiles.$inferSelect;
    uploadResult: UploadedFileResult;
  }> {
    const {
      assetId,
      fileBuffer,
      fileName,
      mimeType,
      assetType = 'other',
      version = '1.0.0',
      isMain = true,
    } = options;

    // 1. Validate File
    const category: FileCategory = mapAssetTypeToCategory(assetType);
    const validation = validateUploadedFile(
      { name: fileName, size: fileBuffer.length, type: mimeType },
      category
    );

    if (!validation.valid) {
      throw new Error(validation.error || 'Asset file validation failed.');
    }

    // 2. Upload file through active storage provider
    const uploadResult = await storage.upload({
      buffer: fileBuffer,
      fileName,
      mimeType: validation.mimeType || mimeType,
      folder: 'files',
      isPublic: false,
    });

    // 3. Persist record in asset_files table
    const [fileRecord] = await db
      .insert(assetFiles)
      .values({
        assetId,
        fileName: uploadResult.fileName,
        fileKey: uploadResult.fileKey,
        fileSizeBytes: uploadResult.fileSizeBytes,
        mimeType: uploadResult.mimeType,
        fileExtension: uploadResult.fileExtension,
        version,
        checksumSha256: uploadResult.checksumSha256,
        isMain,
      })
      .returning();

    if (!fileRecord) {
      // Rollback file upload on DB failure
      await storage.delete(uploadResult.fileKey).catch(() => {});
      throw new Error('Failed to record asset file metadata into database.');
    }

    return { fileRecord, uploadResult };
  }

  /**
   * Verify if user is entitled to download the given file:
   * 1. Creator/Owner of the asset
   * 2. Platform Admin or SuperAdmin
   * 3. Buyer who has completed purchase (transaction status: 'paid')
   */
  async checkDownloadPermission(
    fileId: string,
    user: JWTPayload
  ): Promise<PermissionCheckResult> {
    // 1. Retrieve file record
    const [file] = await db
      .select()
      .from(assetFiles)
      .where(and(eq(assetFiles.id, fileId), isNull(assetFiles.deletedAt)))
      .limit(1);

    if (!file) {
      return {
        allowed: false,
        statusCode: 404,
        reason: 'Asset deliverable file was not found or has been deleted.',
      };
    }

    // 2. Retrieve parent asset
    const [asset] = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, file.assetId), isNull(assets.deletedAt)))
      .limit(1);

    if (!asset) {
      return {
        allowed: false,
        statusCode: 404,
        reason: 'Associated asset product was not found.',
      };
    }

    // 3. Role: Admin / SuperAdmin
    if (user.role === 'admin' || user.role === 'superadmin') {
      return { allowed: true, statusCode: 200, file, asset };
    }

    // 4. Role: Asset Creator / Seller
    if (asset.sellerId === user.userId) {
      return { allowed: true, statusCode: 200, file, asset };
    }

    // 5. Role: Verified Buyer (has paid transaction for this asset)
    const [purchase] = await db
      .select({ id: transactionItems.id })
      .from(transactionItems)
      .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
      .where(
        and(
          eq(transactions.buyerId, user.userId),
          eq(transactions.status, 'paid'),
          eq(transactionItems.assetId, asset.id)
        )
      )
      .limit(1);

    if (purchase) {
      return { allowed: true, statusCode: 200, file, asset };
    }

    // 6. Role: Free Asset Claim (Price is 0 or Free Promo)
    const effectivePrice = asset.discountPrice ? Number(asset.discountPrice) : Number(asset.price);
    if (effectivePrice === 0 && asset.status === 'approved') {
      try {
        const invNum = `INV-FREE-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const [freeTx] = await db
          .insert(transactions)
          .values({
            invoiceNumber: invNum,
            buyerId: user.userId,
            subtotal: '0.00',
            taxAmount: '0.00',
            totalAmount: '0.00',
            status: 'paid',
            paidAt: new Date(),
            paymentMethod: 'manual_transfer',
            notes: 'Free Digital Asset Direct Claim',
          })
          .returning();

        if (freeTx) {
          await db.insert(transactionItems).values({
            transactionId: freeTx.id,
            assetId: asset.id,
            sellerId: asset.sellerId,
            price: '0.00',
            sellerRatePercent: '60.00',
            platformRatePercent: '40.00',
            sellerAmount: '0.00',
            platformAmount: '0.00',
            licenseType: 'standard',
          });
        }
      } catch (e) {
        console.warn('Auto-claim transaction notice:', e);
      }
      return { allowed: true, statusCode: 200, file, asset };
    }

    return {
      allowed: false,
      statusCode: 403,
      reason: 'Akses Ditolak: Anda belum membeli atau mengklaim aset ini.',
      file,
      asset,
    };
  }

  /**
   * Verify download permission by Asset ID (resolves main deliverable file)
   */
  async checkAssetDownloadPermission(
    assetId: string,
    user: JWTPayload
  ): Promise<PermissionCheckResult> {
    const [file] = await db
      .select()
      .from(assetFiles)
      .where(
        and(
          eq(assetFiles.assetId, assetId),
          eq(assetFiles.isMain, true),
          isNull(assetFiles.deletedAt)
        )
      )
      .limit(1);

    if (!file) {
      // Fallback: any active file for this asset
      const [anyFile] = await db
        .select()
        .from(assetFiles)
        .where(and(eq(assetFiles.assetId, assetId), isNull(assetFiles.deletedAt)))
        .limit(1);

      if (!anyFile) {
        return {
          allowed: false,
          statusCode: 404,
          reason: 'No deliverables found for this asset.',
        };
      }

      return this.checkDownloadPermission(anyFile.id, user);
    }

    return this.checkDownloadPermission(file.id, user);
  }

  /**
   * Securely stream file data and increment download statistics
   */
  async streamDownload(
    file: typeof assetFiles.$inferSelect,
    asset: typeof assets.$inferSelect
  ): Promise<FileDownloadStream> {
    const downloadStream = await storage.getStream(file.fileKey);

    // Increment asset download count asynchronously
    db.update(assets)
      .set({ downloadCount: sql`${assets.downloadCount} + 1` })
      .where(eq(assets.id, asset.id))
      .catch((err) => console.warn('Failed to increment downloadCount:', err));

    return {
      ...downloadStream,
      fileName: file.fileName,
      mimeType: file.mimeType || 'application/octet-stream',
      fileSizeBytes: file.fileSizeBytes,
    };
  }
}

export const assetFileService = new AssetFileService();
