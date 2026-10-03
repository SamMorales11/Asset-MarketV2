import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import { existsSync } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type {
  IStorageProvider,
  StorageDriverType,
  StorageFile,
  UploadedFileResult,
  FileDownloadStream,
} from './types.js';

import { getUploadsRootDir } from '../utils/paths.js';

export class LocalStorageProvider implements IStorageProvider {
  readonly driverName: StorageDriverType = 'local';
  private readonly baseDir: string;
  private readonly baseUrl: string;

  constructor(baseDir?: string, baseUrl?: string) {
    this.baseDir = baseDir || getUploadsRootDir();
    this.baseUrl = baseUrl || '/uploads';
  }

  /**
   * Resolve and validate that relative path stays strictly inside baseDir
   */
  private resolveSafePath(fileKey: string): string {
    const normalizedKey = path.normalize(fileKey).replace(/^(\.\.(\/|\\|$))+/, '');
    let absolutePath = path.resolve(this.baseDir, normalizedKey);

    // If file doesn't exist directly, check common subdirectories
    if (!existsSync(absolutePath) || fsSync.statSync(absolutePath).isDirectory()) {
      const baseName = path.basename(normalizedKey);
      const candidates = [
        path.join(this.baseDir, 'files', normalizedKey),
        path.join(this.baseDir, 'deliverables', normalizedKey),
        path.join(this.baseDir, 'thumbnails', normalizedKey),
        path.join(this.baseDir, 'files', baseName),
        path.join(this.baseDir, 'deliverables', baseName),
        path.join(this.baseDir, baseName),
      ];
      for (const candidate of candidates) {
        if (existsSync(candidate) && !fsSync.statSync(candidate).isDirectory()) {
          absolutePath = candidate;
          break;
        }
      }
    }

    // Guard against directory traversal attacks
    if (!absolutePath.startsWith(path.resolve(this.baseDir))) {
      throw new Error(`Security Violation: Path traversal detected for key "${fileKey}"`);
    }

    return absolutePath;
  }

  /**
   * Save file buffer to local uploads/ directory
   */
  async upload(file: StorageFile): Promise<UploadedFileResult> {
    const rawExt = path.extname(file.fileName).toLowerCase();
    const cleanExt = rawExt ? rawExt.replace('.', '') : 'bin';
    const uniqueId = crypto.randomUUID();
    const diskFileName = `${uniqueId}${rawExt ? `.${cleanExt}` : ''}`;

    const folderName = file.folder || 'files';
    const targetDir = path.resolve(this.baseDir, folderName);

    // Ensure target folder exists
    await fs.mkdir(targetDir, { recursive: true });

    const absolutePath = path.join(targetDir, diskFileName);
    await fs.writeFile(absolutePath, file.buffer);

    // Compute SHA-256 hash for data integrity
    const checksumSha256 = crypto
      .createHash('sha256')
      .update(file.buffer)
      .digest('hex');

    const fileKey = `${folderName}/${diskFileName}`;
    const publicUrl = `${this.baseUrl}/${folderName}/${diskFileName}`;

    return {
      fileKey,
      publicUrl,
      fileName: file.fileName,
      fileSizeBytes: file.buffer.length,
      mimeType: file.mimeType || 'application/octet-stream',
      fileExtension: cleanExt,
      checksumSha256,
      storageDriver: this.driverName,
    };
  }

  /**
   * Read file stream for secure download delivery
   */
  async getStream(fileKey: string): Promise<FileDownloadStream> {
    const absolutePath = this.resolveSafePath(fileKey);

    if (!existsSync(absolutePath) || fsSync.statSync(absolutePath).isDirectory()) {
      throw new Error(`File not found on local storage: ${fileKey}`);
    }

    const stats = fsSync.statSync(absolutePath);
    const fileName = path.basename(absolutePath);
    const readStream = fsSync.createReadStream(absolutePath);

    return {
      stream: readStream,
      fileSizeBytes: stats.size,
      mimeType: 'application/octet-stream',
      fileName,
    };
  }

  /**
   * Delete file from local storage
   */
  async delete(fileKey: string): Promise<boolean> {
    try {
      const absolutePath = this.resolveSafePath(fileKey);
      await fs.unlink(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if file exists
   */
  async exists(fileKey: string): Promise<boolean> {
    try {
      const absolutePath = this.resolveSafePath(fileKey);
      return existsSync(absolutePath);
    } catch {
      return false;
    }
  }

  /**
   * Get public URL for static serving
   */
  getPublicUrl(fileKey: string): string {
    const normalizedKey = fileKey.replace(/\\/g, '/');
    return `${this.baseUrl}/${normalizedKey.replace(/^\/+/, '')}`;
  }
}
