import * as path from 'path';

export type FileCategory =
  | 'image'
  | 'video'
  | 'dataset'
  | '3d'
  | 'audio'
  | 'source_code'
  | 'document'
  | 'archive'
  | 'any';

export interface FileValidationRule {
  allowedMimeTypes?: string[];
  allowedExtensions: string[];
  maxSizeBytes: number;
  categoryLabel: string;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  category?: FileCategory;
  extension?: string;
  sizeBytes?: number;
  mimeType?: string;
}

/**
 * Format bytes into human-readable string (e.g., "15.5 MB")
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes <= 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Default Category Validation Profiles
 */
export const CATEGORY_VALIDATION_RULES: Record<Exclude<FileCategory, 'any'>, FileValidationRule> = {
  image: {
    categoryLabel: 'Image File',
    maxSizeBytes: 15 * 1024 * 1024, // 15 MB
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif'],
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
      'image/avif',
    ],
  },
  video: {
    categoryLabel: 'Video File',
    maxSizeBytes: 500 * 1024 * 1024, // 500 MB
    allowedExtensions: ['.mp4', '.webm', '.mov', '.mkv', '.avi'],
    allowedMimeTypes: [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-matroska',
      'video/x-msvideo',
      'application/octet-stream',
    ],
  },
  dataset: {
    categoryLabel: 'Dataset File',
    maxSizeBytes: 500 * 1024 * 1024, // 500 MB
    allowedExtensions: [
      '.csv',
      '.json',
      '.jsonl',
      '.xml',
      '.parquet',
      '.xlsx',
      '.zip',
      '.tar',
      '.gz',
      '.tgz',
      '.7z',
    ],
    allowedMimeTypes: [
      'text/csv',
      'text/plain',
      'application/json',
      'application/x-ndjson',
      'application/xml',
      'text/xml',
      'application/vnd.apache.parquet',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip',
      'application/x-zip-compressed',
      'application/gzip',
      'application/x-tar',
      'application/x-7z-compressed',
      'application/octet-stream',
    ],
  },
  '3d': {
    categoryLabel: '3D Model File',
    maxSizeBytes: 500 * 1024 * 1024, // 500 MB
    allowedExtensions: [
      '.obj',
      '.fbx',
      '.gltf',
      '.glb',
      '.blend',
      '.stl',
      '.dae',
      '.3ds',
      '.c4d',
      '.max',
      '.zip',
      '.rar',
      '.7z',
    ],
    allowedMimeTypes: [
      'model/gltf+json',
      'model/gltf-binary',
      'model/obj',
      'application/sla',
      'application/x-blender',
      'application/zip',
      'application/x-zip-compressed',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'application/octet-stream',
    ],
  },
  audio: {
    categoryLabel: 'Audio Track',
    maxSizeBytes: 100 * 1024 * 1024, // 100 MB
    allowedExtensions: ['.mp3', '.wav', '.flac', '.ogg', '.aac', '.m4a', '.aiff'],
    allowedMimeTypes: [
      'audio/mpeg',
      'audio/wav',
      'audio/x-wav',
      'audio/flac',
      'audio/ogg',
      'audio/aac',
      'audio/x-m4a',
      'audio/aiff',
      'audio/x-aiff',
      'application/octet-stream',
    ],
  },
  source_code: {
    categoryLabel: 'Source Code / Project Archive',
    maxSizeBytes: 500 * 1024 * 1024, // 500 MB
    allowedExtensions: ['.zip', '.tar', '.gz', '.tgz', '.7z', '.rar', '.bz2'],
    allowedMimeTypes: [
      'application/zip',
      'application/x-zip-compressed',
      'application/x-tar',
      'application/gzip',
      'application/x-7z-compressed',
      'application/x-rar-compressed',
      'application/octet-stream',
    ],
  },
  document: {
    categoryLabel: 'Document / E-Book File',
    maxSizeBytes: 50 * 1024 * 1024, // 50 MB
    allowedExtensions: ['.pdf', '.epub', '.mobi', '.docx', '.doc', '.txt', '.md', '.zip'],
    allowedMimeTypes: [
      'application/pdf',
      'application/epub+zip',
      'application/x-mobipocket-ebook',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'application/zip',
      'application/octet-stream',
    ],
  },
  archive: {
    categoryLabel: 'Compressed Archive',
    maxSizeBytes: 500 * 1024 * 1024, // 500 MB
    allowedExtensions: ['.zip', '.tar', '.gz', '.tgz', '.7z', '.rar', '.bz2'],
    allowedMimeTypes: [
      'application/zip',
      'application/x-zip-compressed',
      'application/x-tar',
      'application/gzip',
      'application/x-7z-compressed',
      'application/x-rar-compressed',
      'application/octet-stream',
    ],
  },
};

/**
 * Maps asset schema assetType to FileCategory
 */
export function mapAssetTypeToCategory(assetType: string): FileCategory {
  switch (assetType) {
    case 'ui_template':
    case 'source_code':
      return 'source_code';
    case '3d_model':
      return '3d';
    case 'graphic':
      return 'image';
    case 'audio':
      return 'audio';
    case 'video':
      return 'video';
    case 'dataset':
      return 'dataset';
    case 'document':
      return 'document';
    default:
      return 'archive';
  }
}

/**
 * Validates an uploaded file (File or object with name, size, type) against rules
 */
export function validateUploadedFile(
  file: { name: string; size: number; type?: string } | null | undefined,
  category: FileCategory,
  customRules?: Partial<FileValidationRule>
): FileValidationResult {
  if (!file || typeof file.size !== 'number' || !file.name) {
    return {
      valid: false,
      error: 'No file was provided or file is empty.',
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      error: `File "${file.name}" is empty (0 bytes).`,
    };
  }

  const extension = path.extname(file.name).toLowerCase();
  const mimeType = file.type?.toLowerCase() || 'application/octet-stream';

  if (!extension) {
    return {
      valid: false,
      error: `File "${file.name}" has no valid file extension.`,
    };
  }

  // Handle 'any' category: allows any file up to 500MB
  if (category === 'any') {
    const maxSizeBytes = customRules?.maxSizeBytes || 500 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `File size (${formatBytes(file.size)}) exceeds maximum limit of ${formatBytes(maxSizeBytes)}.`,
      };
    }
    return {
      valid: true,
      category: 'any',
      extension,
      sizeBytes: file.size,
      mimeType,
    };
  }

  const baseRule = CATEGORY_VALIDATION_RULES[category];
  if (!baseRule) {
    return {
      valid: false,
      error: `Unknown file category validation rule: "${category}".`,
    };
  }

  const maxSizeBytes = customRules?.maxSizeBytes || baseRule.maxSizeBytes;
  const allowedExtensions = customRules?.allowedExtensions || baseRule.allowedExtensions;
  const allowedMimeTypes = customRules?.allowedMimeTypes || baseRule.allowedMimeTypes;

  // 1. Extension Check
  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `Invalid file extension "${extension}" for ${baseRule.categoryLabel}. Allowed extensions: ${allowedExtensions.join(', ')}`,
    };
  }

  // 2. Size Check
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size (${formatBytes(file.size)}) exceeds maximum allowed limit of ${formatBytes(maxSizeBytes)} for ${baseRule.categoryLabel}.`,
    };
  }

  // 3. MIME Type Check (lenient for binary containers where browsers might send application/octet-stream)
  if (
    allowedMimeTypes &&
    allowedMimeTypes.length > 0 &&
    mimeType !== 'application/octet-stream' &&
    !allowedMimeTypes.includes(mimeType)
  ) {
    return {
      valid: false,
      error: `Invalid MIME type "${mimeType}" for ${baseRule.categoryLabel}.`,
    };
  }

  return {
    valid: true,
    category,
    extension,
    sizeBytes: file.size,
    mimeType,
  };
}
