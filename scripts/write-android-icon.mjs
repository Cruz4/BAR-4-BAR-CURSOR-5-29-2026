/**
 * Android home-screen icons only — sourced from public/AKAsheet_burgerlogo.png.
 * Does not touch Logo.png, favicon, apple-icon, or public/app-icon.png.
 * Never add android-icon.png to the web app manifest — Chromium desktop PWAs
 * must use transparent desktop-pwa-icon.png (Logo), not the navy app-icon or burger.
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

/** Interior fill of the AKA sheet — not black, not launcher white. */
const BG = [5, 20, 42, 255];

function isSheetNavy(r, g, b) {
  return Math.abs(r - BG[0]) < 14 && Math.abs(g - BG[1]) < 14 && Math.abs(b - BG[2]) < 18;
}

/** Artwork only (outline, AKA, fold) — navy fill and transparent corners are not the mark. */
function isArtwork(r, g, b, a) {
  if (a < 24) return false;
  if (isSheetNavy(r, g, b)) return false;
  return true;
}

function contentBBox(src) {
  let minX = src.w;
  let minY = src.h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const i = (y * src.w + x) * 4;
      if (!isArtwork(src.px[i], src.px[i + 1], src.px[i + 2], src.px[i + 3])) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX) return { minX: 0, minY: 0, maxX: src.w - 1, maxY: src.h - 1 };
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const pad = Math.round(Math.max(bw, bh) * 0.16);
  return {
    minX: Math.max(0, minX - pad),
    minY: Math.max(0, minY - pad),
    maxX: Math.min(src.w - 1, maxX + pad),
    maxY: Math.min(src.h - 1, maxY + pad),
  };
}

/** Opaque navy square with the sheet scaled up so the launcher mask is full of mark, not padding. */
function composeFilled(src, size, fillRatio) {
  const out = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const di = i * 4;
    out[di] = BG[0];
    out[di + 1] = BG[1];
    out[di + 2] = BG[2];
    out[di + 3] = 255;
  }
  const box = contentBBox(src);
  const bw = box.maxX - box.minX + 1;
  const bh = box.maxY - box.minY + 1;
  const dest = Math.max(1, Math.floor(size * fillRatio));
  const scale = Math.min(dest / bw, dest / bh);
  const dw = Math.max(1, Math.round(bw * scale));
  const dh = Math.max(1, Math.round(bh * scale));
  const ox = Math.floor((size - dw) / 2);
  const oy = Math.floor((size - dh) / 2);
  for (let y = 0; y < dh; y++) {
    const iy = Math.min(box.maxY, box.minY + Math.floor((y + 0.5) * (bh / dh)));
    for (let x = 0; x < dw; x++) {
      const ix = Math.min(box.maxX, box.minX + Math.floor((x + 0.5) * (bw / dw)));
      const si = (iy * src.w + ix) * 4;
      const di = ((oy + y) * size + (ox + x)) * 4;
      const a = src.px[si + 3] / 255;
      if (a < 0.02) continue;
      out[di] = Math.round(src.px[si] * a + BG[0] * (1 - a));
      out[di + 1] = Math.round(src.px[si + 1] * a + BG[1] * (1 - a));
      out[di + 2] = Math.round(src.px[si + 2] * a + BG[2] * (1 - a));
      out[di + 3] = 255;
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
  const png = encodePng(composeFilled(burger, size, 0.9), size);
  writeFileSync(join(dir, 'ic_launcher.png'), png);
  writeFileSync(join(dir, 'ic_launcher_round.png'), png);
}

for (const [folder, size] of Object.entries(FOREGROUND)) {
  const dir = join(res, folder);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'ic_launcher_foreground.png'), encodePng(composeFilled(burger, size, 0.74), size));
}

writeFileSync(
  join(res, 'values', 'ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#05142A</color>
</resources>
`
);

const pub = join(root, 'public');
writeFileSync(join(pub, 'android-icon.png'), encodePng(composeFilled(burger, 512, 0.86), 512));
writeFileSync(join(pub, 'android-icon-192.png'), encodePng(composeFilled(burger, 192, 0.86), 192));

console.log('wrote Android mipmaps + public/android-icon.png from public/AKAsheet_burgerlogo.png');
