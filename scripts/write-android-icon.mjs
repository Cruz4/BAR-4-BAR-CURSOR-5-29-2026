/**
 * Android home-screen icons only — sourced from public/AKAsheet_burgerlogo.png.
 * Does not touch Logo.png, favicon, apple-icon, or public/app-icon.png.
 */

import { deflateSync, inflateSync } from 'node:zlib';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(pixels, size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[(size * 4 + 1) * y] = 0;
    pixels.copy(raw, (size * 4 + 1) * y + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function decodePng(buf) {
  let off = 8;
  const chunks = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.slice(off + 4, off + 8).toString();
    const data = buf.slice(off + 8, off + 8 + len);
    if (type === 'IDAT') chunks.push(data);
    if (type === 'IEND') break;
    off += 12 + len;
  }
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  const raw = inflateSync(Buffer.concat(chunks));
  const bpp = 4;
  const stride = w * bpp;
  const out = Buffer.alloc(h * stride);
  const paeth = (a, c, d) => {
    const p = a + c - d;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - c);
    const pc = Math.abs(p - d);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return c;
    return d;
  };
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    for (let i = 0; i < stride; i++) {
      const x = raw[src + i];
      const a = i >= bpp ? out[dst + i - bpp] : 0;
      const bv = y > 0 ? out[dst - stride + i] : 0;
      const c = y > 0 && i >= bpp ? out[dst - stride + i - bpp] : 0;
      const v =
        f === 0 ? x : f === 1 ? x + a : f === 2 ? x + bv : f === 3 ? x + Math.floor((a + bv) / 2) : x + paeth(a, bv, c);
      out[dst + i] = v & 255;
    }
  }
  return { w, h, px: out };
}

/** Nearest-neighbor scale — burger art is already composed for the launcher. */
function scaleNearest(src, size) {
  const { w, h, px } = src;
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    const sy = Math.min(h - 1, Math.floor((y + 0.5) * (h / size)));
    for (let x = 0; x < size; x++) {
      const sx = Math.min(w - 1, Math.floor((x + 0.5) * (w / size)));
      const si = (sy * w + sx) * 4;
      const di = (y * size + x) * 4;
      out[di] = px[si];
      out[di + 1] = px[si + 1];
      out[di + 2] = px[si + 2];
      out[di + 3] = px[si + 3];
    }
  }
  return out;
}

const LAUNCHER = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

/** Adaptive foreground is 108dp across densities. */
const FOREGROUND = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const res = join(root, 'android', 'app', 'src', 'main', 'res');
const burger = decodePng(readFileSync(join(root, 'public', 'AKAsheet_burgerlogo.png')));

for (const [folder, size] of Object.entries(LAUNCHER)) {
  const dir = join(res, folder);
  mkdirSync(dir, { recursive: true });
  const png = encodePng(scaleNearest(burger, size), size);
  writeFileSync(join(dir, 'ic_launcher.png'), png);
  writeFileSync(join(dir, 'ic_launcher_round.png'), png);
}

for (const [folder, size] of Object.entries(FOREGROUND)) {
  const dir = join(res, folder);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'ic_launcher_foreground.png'), encodePng(scaleNearest(burger, size), size));
}

writeFileSync(
  join(res, 'values', 'ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#050A1E</color>
</resources>
`
);

console.log('wrote Android mipmap icons from public/AKAsheet_burgerlogo.png');
