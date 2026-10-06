import * as zlib from 'zlib';

const crcTable: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i] ?? 0;
    const tableVal = crcTable[(crc ^ b) & 0xff] ?? 0;
    crc = tableVal ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

/**
 * Creates an elegant dark editorial luxury PNG buffer (800x500) matching Asset Market theme
 */
export function createLuxuryEditorialPng(width = 800, height = 500, variant = 0): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);
  ihdrData.writeUInt8(2, 9);
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  const rawRowSize = 1 + width * 3;
  const rawBuffer = Buffer.alloc(height * rawRowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rawRowSize;
    rawBuffer[rowOffset] = 0;
    const yRatio = y / height;

    for (let x = 0; x < width; x++) {
      const xRatio = x / width;
      const pxOffset = rowOffset + 1 + x * 3;
      const distFromCenter = Math.hypot(xRatio - 0.5, yRatio - 0.5);

      let r = 22, g = 22, b = 28;
      const mod = variant % 5;

      if (mod === 0) {
        // Ember gradient (#D93A0F inspired)
        r = Math.floor(22 + Math.max(0, 1 - distFromCenter * 1.5) * 190);
        g = Math.floor(18 + Math.max(0, 1 - distFromCenter * 1.8) * 55);
        b = Math.floor(24 + Math.max(0, 1 - distFromCenter * 1.6) * 20 + yRatio * 15);
      } else if (mod === 1) {
        // Cosmic Teal (#00B8B8 inspired)
        r = Math.floor(14 + Math.max(0, 1 - distFromCenter * 1.8) * 20);
        g = Math.floor(20 + Math.max(0, 1 - distFromCenter * 1.5) * 165);
        b = Math.floor(26 + Math.max(0, 1 - distFromCenter * 1.4) * 180);
      } else {
        // Obsidian Luxury
        r = Math.floor(20 + Math.max(0, 1 - distFromCenter * 1.6) * 120);
        g = Math.floor(22 + Math.max(0, 1 - distFromCenter * 1.6) * 130);
        b = Math.floor(28 + Math.max(0, 1 - distFromCenter * 1.5) * 150);
      }

      rawBuffer[pxOffset] = Math.min(255, Math.max(0, r));
      rawBuffer[pxOffset + 1] = Math.min(255, Math.max(0, g));
      rawBuffer[pxOffset + 2] = Math.min(255, Math.max(0, b));
    }
  }

  const compressedData = zlib.deflateSync(rawBuffer);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}
