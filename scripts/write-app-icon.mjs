import { deflateSync, inflateSync } from 'node:zlib';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BG = [5, 20, 42, 255];
/** Opaque apple-touch / legacy padded icon (not used in the web manifest). */
const SAFE_OPAQUE = 0.726;
/** Transparent desktop PWA mark — ~23% larger than 0.726 without a filled square. */
const SAFE_TRANSPARENT = 0.894;

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

function contentBBox(src) {
  let minX = src.w;
  let minY = src.h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      if (src.px[(y * src.w + x) * 4 + 3] < 12) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX) return { minX: 0, minY: 0, maxX: src.w - 1, maxY: src.h - 1 };
  return { minX, minY, maxX, maxY };
}

function compositePadded(src, size, safe, background) {
  const { w, h, px } = src;
  const box = contentBBox({ w, h, px });
  const bw = Math.max(1, box.maxX - box.minX + 1);
  const bh = Math.max(1, box.maxY - box.minY + 1);
  const inner = Math.floor(size * safe);
  const scale = inner / Math.max(bw, bh);
  const dw = Math.max(1, Math.round(bw * scale));
  const dh = Math.max(1, Math.round(bh * scale));
  const ox = Math.floor((size - dw) / 2);
  const oy = Math.floor((size - dh) / 2);
  const out = Buffer.alloc(size * size * 4);
  if (background) {
    for (let i = 0; i < size * size; i++) out.set(background, i * 4);
  }
  for (let y = 0; y < dh; y++) {
    const sy = box.minY + Math.min(bh - 1, Math.floor((y + 0.5) / scale));
    for (let x = 0; x < dw; x++) {
      const sx = box.minX + Math.min(bw - 1, Math.floor((x + 0.5) / scale));
      const si = (sy * w + sx) * 4;
      const a = px[si + 3] / 255;
      if (a < 0.02) continue;
      const di = ((oy + y) * size + (ox + x)) * 4;
      if (background) {
        out[di] = Math.round(px[si] * a + background[0] * (1 - a));
        out[di + 1] = Math.round(px[si + 1] * a + background[1] * (1 - a));
        out[di + 2] = Math.round(px[si + 2] * a + background[2] * (1 - a));
        out[di + 3] = 255;
      } else {
        out[di] = px[si];
        out[di + 1] = px[si + 1];
        out[di + 2] = px[si + 2];
        out[di + 3] = px[si + 3];
      }
    }
  }
  return out;
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const logo = decodePng(readFileSync(join(root, 'public', 'Logo.png')));

writeFileSync(
  join(root, 'public', 'app-icon.png'),
  encodePng(compositePadded(logo, 512, SAFE_OPAQUE, BG), 512)
);
writeFileSync(
  join(root, 'src', 'app', 'apple-icon.png'),
  encodePng(compositePadded(logo, 180, SAFE_OPAQUE, BG), 180)
);
/** Brave/Chrome desktop PWA — transparent Logo (not navy square, not android burger). */
writeFileSync(
  join(root, 'public', 'desktop-pwa-icon.png'),
  encodePng(compositePadded(logo, 512, SAFE_TRANSPARENT, null), 512)
);

console.log('wrote public/app-icon.png, public/desktop-pwa-icon.png, src/app/apple-icon.png');
