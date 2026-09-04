import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SIZE = 32;
const WHITE = [255, 255, 255, 255];
const GREEN = [2, 173, 135, 255];
const NAVY = [5, 20, 42, 255];

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

function encodePng(pixels) {
  const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
  for (let y = 0; y < SIZE; y++) {
    raw[(SIZE * 4 + 1) * y] = 0;
    pixels.copy(raw, (SIZE * 4 + 1) * y + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function set(px, x, y, color) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  px.set(color, (y * SIZE + x) * 4);
}

function fillRect(px, x0, y0, x1, y1, color) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) set(px, x, y, color);
  }
}

const px = Buffer.alloc(SIZE * SIZE * 4);
fillRect(px, 3, 2, 28, 29, NAVY);

for (let x = 22; x <= 28; x++) {
  const depth = x - 22;
  for (let y = 2; y <= 2 + depth && y <= 8; y++) set(px, x, y, GREEN);
}

for (let y = 3; y <= 9; y++) {
  for (let x = 5; x <= 11; x++) {
    const dx = x - 8;
    const dy = y - 6;
    if (dx * dx + dy * dy <= 10) set(px, x, y, WHITE);
  }
}

function fillRoundBar(target, x0, x1, y0, y1, color) {
  fillRect(target, x0, y0, x1, y1, color);
  set(target, x0, y0, NAVY);
  set(target, x1, y0, NAVY);
  set(target, x0, y1, NAVY);
  set(target, x1, y1, NAVY);
}

const midY = 17;
const bars = [6, 10, 16, 10, 6];
const xs = [8, 12, 16, 20, 24];
bars.forEach((h, i) => {
  const top = midY - Math.floor(h / 2);
  fillRoundBar(px, xs[i], xs[i] + 2, top, top + h - 1, WHITE);
});

const png = encodePng(px);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
writeFileSync(join(root, 'public', 'favicon-32.png'), png);
writeFileSync(join(root, 'src', 'app', 'icon.png'), png);
console.log('wrote favicon-32.png and src/app/icon.png');
