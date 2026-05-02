// Generates PWA icons (192x192, 512x512) and a favicon, using node-canvas-free
// approach: emit a deterministic PNG by hand. Simple solid background + text.
//
// Run: node scripts/generate-icons.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');
const ICONS_DIR = join(PUBLIC_DIR, 'icons');
mkdirSync(ICONS_DIR, { recursive: true });

const PRIMARY = [0x00, 0x35, 0x27]; // #003527
const ACCENT = [0xb0, 0xf0, 0xd6]; // #b0f0d6

/**
 * Stylised "sun + S" icon procedurally drawn into an RGBA buffer.
 * Center: filled circle (accent). Around: rays. Padding around to be safe-area
 * compatible for maskable.
 */
function buildIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const padding = size * 0.1;
  const sunR = size * 0.28;
  const rayInner = sunR + size * 0.04;
  const rayOuter = size / 2 - padding - size * 0.02;
  const rayHalfWidth = size * 0.018;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Background = primary
      buf[i] = PRIMARY[0];
      buf[i + 1] = PRIMARY[1];
      buf[i + 2] = PRIMARY[2];
      buf[i + 3] = 0xff;

      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      // Sun core
      if (dist <= sunR) {
        buf[i] = ACCENT[0];
        buf[i + 1] = ACCENT[1];
        buf[i + 2] = ACCENT[2];
        continue;
      }

      // Rays — 8 spokes spaced 45°, drawn as a thin band along each spoke direction
      if (dist >= rayInner && dist <= rayOuter) {
        const spoke = Math.round((angle / (Math.PI / 4)) * 1) * (Math.PI / 4);
        const sx = Math.cos(spoke);
        const sy = Math.sin(spoke);
        // distance from spoke axis
        const along = dx * sx + dy * sy;
        const perp = Math.abs(dx * -sy + dy * sx);
        if (along > 0 && perp <= rayHalfWidth) {
          buf[i] = ACCENT[0];
          buf[i + 1] = ACCENT[1];
          buf[i + 2] = ACCENT[2];
        }
      }
    }
  }
  return buf;
}

function writePng(filename, size) {
  const rgba = buildIcon(size);
  const png = encodePNG(rgba, size, size);
  writeFileSync(filename, png);
  console.log(`✓ ${filename} (${size}x${size}, ${png.length} bytes)`);
}

function encodePNG(rgba, width, height) {
  // Build IHDR + IDAT + IEND chunks for a 32-bit RGBA PNG.
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Apply scanline filter type 0 (None) per row
  const stride = width * 4;
  const filtered = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    filtered[y * (stride + 1)] = 0;
    rgba.copy(filtered, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idatData = deflateSync(filtered);

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcSrc = Buffer.concat([typeBuf, data]);
  const crc = crc32(crcSrc);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

let crcTable = null;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of buf) crc = (crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)) >>> 0;
  return (crc ^ 0xffffffff) >>> 0;
}

writePng(join(ICONS_DIR, 'icon-192.png'), 192);
writePng(join(ICONS_DIR, 'icon-512.png'), 512);

// Also a small SVG favicon — light + crisp at any size
const favicon = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#003527"/>
  <circle cx="32" cy="32" r="13" fill="#b0f0d6"/>
  ${[0, 45, 90, 135, 180, 225, 270, 315]
    .map(
      (a) =>
        `<rect x="30" y="6" width="4" height="10" rx="2" fill="#b0f0d6" transform="rotate(${a} 32 32)"/>`
    )
    .join('\n  ')}
</svg>
`;
writeFileSync(join(PUBLIC_DIR, 'favicon.svg'), favicon);
console.log(`✓ public/favicon.svg`);

// Verify hashes for manifest debugging
for (const file of ['icon-192.png', 'icon-512.png']) {
  const p = join(ICONS_DIR, file);
  const data = await import('node:fs/promises').then((fs) => fs.readFile(p));
  const hash = createHash('sha256').update(data).digest('hex').slice(0, 8);
  console.log(`  sha256(${file})[0..8] = ${hash}`);
}
