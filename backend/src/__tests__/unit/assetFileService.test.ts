import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssetFileService } from '../../services/assetFileService.js';
import type { JWTPayload } from '../../types/index.js';

// Mock DB and Storage
vi.mock('../../db/index.js', () => {
  return {
    db: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    },
  };
});

vi.mock('../../storage/index.js', () => {
  return {
    storage: {
      upload: vi.fn(),
      delete: vi.fn(),
      getStream: vi.fn(),
    },
  };
});

import { db } from '../../db/index.js';
import { storage } from '../../storage/index.js';

describe('AssetFileService Unit Tests', () => {
  let service: AssetFileService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AssetFileService();
  });

  const dummyFile = {
    id: 'file_001',
    assetId: 'asset_123',
    fileName: 'bundle.zip',
    fileKey: 'files/bundle.zip',
    fileSizeBytes: 1024,
    mimeType: 'application/zip',
    isMain: true,
    deletedAt: null,
  };

  const dummyAsset = {
    id: 'asset_123',
    sellerId: 'user_seller_99',
    title: 'Cyberpunk 3D Kit',
    price: '250000.00',
    discountPrice: null,
    status: 'approved',
    deletedAt: null,
  };

  describe('checkDownloadPermission', () => {
    it('returns 404 when deliverable file is not found or soft-deleted', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const user: JWTPayload = {
        userId: 'user_buyer_1',
        email: 'buyer@test.com',
        name: 'Buyer',
        role: 'user',
        tokenType: 'access',
      };

      const result = await service.checkDownloadPermission('nonexistent_file', user);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.reason).toContain('file was not found');
    });

    it('returns 404 when parent asset is not found', async () => {
      // First select finds file, second select fails to find asset
      vi.mocked(db.select)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([dummyFile]),
            }),
          }),
        } as any)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        } as any);

      const user: JWTPayload = {
        userId: 'user_buyer_1',
        email: 'buyer@test.com',
        name: 'Buyer',
        role: 'user',
        tokenType: 'access',
      };

      const result = await service.checkDownloadPermission('file_001', user);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.reason).toContain('Associated asset product was not found');
    });

    it('grants permission to Platform Admin regardless of ownership', async () => {
      vi.mocked(db.select)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([dummyFile]),
            }),
          }),
        } as any)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([dummyAsset]),
            }),
          }),
        } as any);

      const adminUser: JWTPayload = {
        userId: 'admin_user_0',
        email: 'admin@assetmarket.com',
        name: 'Admin',
        role: 'admin',
        tokenType: 'access',
      };

      const result = await service.checkDownloadPermission('file_001', adminUser);
      expect(result.allowed).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.file?.id).toBe(dummyFile.id);
    });

    it('grants permission to the Asset Creator / Seller', async () => {
      vi.mocked(db.select)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([dummyFile]),
            }),
          }),
        } as any)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([dummyAsset]),
            }),
          }),
        } as any);

      const sellerUser: JWTPayload = {
        userId: 'user_seller_99',
        email: 'seller@test.com',
        name: 'Creator',
        role: 'user',
        tokenType: 'access',
      };

      const result = await service.checkDownloadPermission('file_001', sellerUser);
      expect(result.allowed).toBe(true);
      expect(result.statusCode).toBe(200);
    });

    it('grants permission to Verified Buyer who has paid transaction', async () => {
      // 1. File query
      // 2. Asset query
      // 3. Paid purchase query
      vi.mocked(db.select)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([dummyFile]),
            }),
          }),
        } as any)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([dummyAsset]),
            }),
          }),
        } as any)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: 'tx_item_1' }]),
              }),
            }),
          }),
        } as any);

      const buyerUser: JWTPayload = {
        userId: 'buyer_confirmed_123',
        email: 'buyer@test.com',
        name: 'Buyer',
        role: 'user',
        tokenType: 'access',
      };

      const result = await service.checkDownloadPermission('file_001', buyerUser);
      expect(result.allowed).toBe(true);
      expect(result.statusCode).toBe(200);
    });

    it('denies permission with 403 to unverified buyer with no paid transaction', async () => {
      // 1. File query
      // 2. Asset query
      // 3. Paid purchase query -> empty
      vi.mocked(db.select)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([dummyFile]),
            }),
          }),
        } as any)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([dummyAsset]),
            }),
          }),
        } as any)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        } as any);

      const unverifiedBuyer: JWTPayload = {
        userId: 'unverified_stranger',
        email: 'stranger@test.com',
        name: 'Stranger',
        role: 'user',
        tokenType: 'access',
      };

      const result = await service.checkDownloadPermission('file_001', unverifiedBuyer);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(403);
      expect(result.reason).toContain('Akses Ditolak');
    });
  });

  describe('saveAssetDeliverable Validation', () => {
    it('throws validation error if deliverable file is invalid or empty', async () => {
      await expect(
        service.saveAssetDeliverable({
          assetId: 'asset_1',
          fileBuffer: Buffer.from(''),
          fileName: 'empty.zip',
          mimeType: 'application/zip',
          assetType: 'source_code',
        })
      ).rejects.toThrow('empty (0 bytes)');
    });

    it('throws validation error if file extension is disallowed for asset type', async () => {
      await expect(
        service.saveAssetDeliverable({
          assetId: 'asset_1',
          fileBuffer: Buffer.from('fake data content'),
          fileName: 'script.exe',
          mimeType: 'application/x-msdownload',
          assetType: 'source_code',
        })
      ).rejects.toThrow('Invalid file extension');
    });

    it('uploads file and inserts DB record on valid file data', async () => {
      vi.mocked(storage.upload).mockResolvedValue({
        fileKey: 'files/test.zip',
        fileName: 'test.zip',
        fileSizeBytes: 120,
        mimeType: 'application/zip',
        fileExtension: '.zip',
        checksumSha256: 'abc123sha',
        publicUrl: '/uploads/files/test.zip',
        storageDriver: 'local',
      });

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 'file_created_123',
              assetId: 'asset_1',
              fileName: 'test.zip',
              fileKey: 'files/test.zip',
            },
          ]),
        }),
      } as any);

      const result = await service.saveAssetDeliverable({
        assetId: 'asset_1',
        fileBuffer: Buffer.from('valid zip binary mock data'),
        fileName: 'test.zip',
        mimeType: 'application/zip',
        assetType: 'source_code',
      });

      expect(result.fileRecord.id).toBe('file_created_123');
      expect(result.uploadResult.fileKey).toBe('files/test.zip');
      expect(storage.upload).toHaveBeenCalledTimes(1);
    });
  });
});
