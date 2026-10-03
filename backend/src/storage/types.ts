import type { Readable } from 'stream';

export type StorageDriverType = 'local' | 's3' | 'r2' | 'uploadthing';

export interface StorageFile {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  folder: 'thumbnails' | 'files' | 'previews' | 'avatars' | 'payments';
  isPublic?: boolean;
}

export interface UploadedFileResult {
  fileKey: string;           // Internal identifier / relative path, e.g. "files/uuid.zip"
  publicUrl: string;          // Direct HTTP access URL (for public files) or download API URI
  fileName: string;          // Original sanitized file name
  fileSizeBytes: number;     // File size in bytes
  mimeType: string;          // MIME type
  fileExtension: string;     // File extension without leading dot, e.g. "zip"
  checksumSha256: string;    // SHA-256 hash for data integrity
  storageDriver: StorageDriverType;
}

export interface FileDownloadStream {
  stream?: Readable;
  buffer?: Buffer;
  mimeType: string;
  fileSizeBytes: number;
  fileName: string;
}

export interface IStorageProvider {
  readonly driverName: StorageDriverType;

  /**
   * Upload file buffer to target storage folder
   */
  upload(file: StorageFile): Promise<UploadedFileResult>;

  /**
   * Read file content for streaming downloads
   */
  getStream(fileKey: string): Promise<FileDownloadStream>;

  /**
   * Delete file from storage
   */
  delete(fileKey: string): Promise<boolean>;

  /**
   * Check if file exists in storage
   */
  exists(fileKey: string): Promise<boolean>;

  /**
   * Get public or serving URL for a fileKey
   */
  getPublicUrl(fileKey: string): string;
}
