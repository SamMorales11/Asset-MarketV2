import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

/**
 * Robust helper to locate and guarantee the backend root uploads directory.
 * Works seamlessly whether Node is launched from workspace root or backend folder.
 */
export function getUploadsRootDir(): string {
  // 1. Direct uploads in current working directory
  const cwdUploads = path.resolve(process.cwd(), 'uploads');
  if (fs.existsSync(cwdUploads)) {
    return cwdUploads;
  }

  // 2. Running from workspace root -> backend/uploads
  const backendUploads = path.resolve(process.cwd(), 'backend', 'uploads');
  if (fs.existsSync(backendUploads)) {
    return backendUploads;
  }

  // 3. Relative to this source file (dist/utils or src/utils)
  const metaDir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));
  const relativeUploads = path.resolve(metaDir, '..', '..', 'uploads');
  if (fs.existsSync(relativeUploads)) {
    return relativeUploads;
  }

  // Default fallback: create cwd/uploads
  return cwdUploads;
}

/**
 * Ensure all standard upload subdirectories exist.
 */
export function ensureUploadDirs(): void {
  const root = getUploadsRootDir();
  const subDirs = ['', 'thumbnails', 'payments', 'files', 'deliverables'];
  for (const sub of subDirs) {
    const fullPath = sub ? path.join(root, sub) : root;
    if (!fs.existsSync(fullPath)) {
      try {
        fs.mkdirSync(fullPath, { recursive: true });
      } catch (err) {
        console.warn(`Warning: Could not create upload directory ${fullPath}:`, err);
      }
    }
  }
}
