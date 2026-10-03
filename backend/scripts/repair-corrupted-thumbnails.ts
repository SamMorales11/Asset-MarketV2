import * as fs from 'fs/promises';
import * as path from 'path';
import { getUploadsRootDir } from '../src/utils/paths.js';

const CURATED_IMAGES = [
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80',
];

async function repair() {
  const uploadsDir = getUploadsRootDir();
  const thumbDir = path.join(uploadsDir, 'thumbnails');
  console.log(`Checking thumbnail directory: ${thumbDir}`);

  const files = await fs.readdir(thumbDir);
  console.log(`Found ${files.length} files in thumbnails directory.`);

  let index = 0;
  for (const filename of files) {
    if (!filename.endsWith('.png') && !filename.endsWith('.jpg') && !filename.endsWith('.jpeg')) continue;
    
    // We keep atelier-noir-showcase.png as it is already working perfectly
    if (filename === 'atelier-noir-showcase.png') {
      console.log(`Skipping already valid atelier-noir-showcase.png`);
      continue;
    }

    const filePath = path.join(thumbDir, filename);
    const imageUrl = CURATED_IMAGES[index % CURATED_IMAGES.length];
    index++;

    try {
      console.log(`Downloading valid curated image for ${filename}...`);
      const res = await fetch(imageUrl, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        await fs.writeFile(filePath, buffer);
        console.log(`✓ Repaired ${filename} with valid image (${buffer.length} bytes)`);
      } else {
        console.warn(`Failed to fetch ${imageUrl}: ${res.status}`);
      }
    } catch (err: any) {
      console.error(`Error repairing ${filename}:`, err.message);
    }
  }

  console.log('Thumbnail repair process completed!');
}

repair().catch(console.error);
