import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPng(width, height, getPixel) {
  // getPixel(x, y) returns [r, g, b, a] (0-255)
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type (RGBA)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(8 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeInt32BE(crc, 8 + len);
    return buf;
  }

  // Simple CRC32 table
  function crc32(buf) {
    let c = -1;
    for (let i = 0; i < buf.length; i++) {
      c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xff];
    }
    return (c ^ -1) | 0;
  }

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', deflated),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

// Ensure directories
const iconsDir = path.join(process.cwd(), 'assets', 'icons');
const charDir = path.join(process.cwd(), 'assets', 'characters', 'roa-cat');
fs.mkdirSync(iconsDir, { recursive: true });
fs.mkdirSync(charDir, { recursive: true });

// 1. Tray icon: 32x32 purple cat ear silhouette
const trayPng = createPng(32, 32, (x, y) => {
  const dx = x - 16;
  const dy = y - 16;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist <= 12) {
    return [99, 102, 241, 255]; // #6366F1
  }
  return [0, 0, 0, 0];
});
fs.writeFileSync(path.join(iconsDir, 'tray.png'), trayPng);

// 2. Character preview: 200x200
const previewPng = createPng(200, 200, (x, y) => {
  const dx = x - 100;
  const dy = y - 100;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist <= 70) {
    return [99, 102, 241, 255];
  }
  return [0, 0, 0, 0];
});
fs.writeFileSync(path.join(charDir, 'preview.png'), previewPng);

// 3. Animation placeholders
const animPng = createPng(128, 128, (x, y) => {
  const dx = x - 64;
  const dy = y - 64;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist <= 48) {
    return [99, 102, 241, 255];
  }
  return [0, 0, 0, 0];
});
fs.writeFileSync(path.join(charDir, 'idle.png'), animPng);
fs.writeFileSync(path.join(charDir, 'happy.png'), animPng);
fs.writeFileSync(path.join(charDir, 'sleep.png'), animPng);

console.log('[Assets] Generated tray and character assets successfully.');
