import { LocalStorageProvider } from './local.js';
import { S3StorageProvider } from './s3.js';
import type { IStorageProvider, StorageDriverType } from './types.js';

let defaultStorageInstance: IStorageProvider | null = null;

/**
 * Storage Provider Factory
 * Returns active storage driver based on configuration or environment variable.
 */
export function getStorageProvider(preferredDriver?: StorageDriverType): IStorageProvider {
  const driver = (preferredDriver || process.env.STORAGE_DRIVER || 'local') as StorageDriverType;

  switch (driver) {
    case 's3':
      return new S3StorageProvider(undefined, 's3');
    case 'r2':
      return new S3StorageProvider(undefined, 'r2');
    case 'local':
    default:
      return new LocalStorageProvider();
  }
}

/**
 * Global Singleton Storage Instance
 */
export const storage: IStorageProvider = defaultStorageInstance || (defaultStorageInstance = getStorageProvider());

export * from './types.js';
export { LocalStorageProvider } from './local.js';
export { S3StorageProvider } from './s3.js';
