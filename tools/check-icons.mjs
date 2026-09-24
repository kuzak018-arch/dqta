// Проверяет, что CDN реально отдаёт картинки для всех героев и предметов,
// которые показывает сайт. Запуск из корня репозитория: node tools/check-icons.mjs
// Нужен Node.js 18+ (встроенный fetch), зависимостей нет.

import { readFile } from 'node:fs/promises';
import { categorize } from '../js/shop.js';
import { CDN } from '../js/data.js';

const root = new URL('../', import.meta.url);
const readJSON = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'));

const items = await readJSON('data/items.json');
const heroes = await readJSON('data/heroes.json');

const targets = [
  ...Object.entries(items)
    .filter(([key, raw]) => categorize(key, raw))
    .map(([key, raw]) => ({ name: `item ${key}`, url: CDN + raw.img })),
  ...Object.values(heroes).map((h) => ({ name: `hero ${h.localized_name}`, url: CDN + h.img })),
];

const SIGNATURES = [
  [0x89, 0x50, 0x4e, 0x47], // PNG
  [0xff, 0xd8, 0xff], // JPEG
  [0x52, 0x49, 0x46, 0x46], // RIFF (WebP)
];

async function check({ name, url }) {
  try {
    const res = await fetch(url);
    const type = res.headers.get('content-type') || '';
    const bytes = new Uint8Array(await res.arrayBuffer());
    const isImage = SIGNATURES.some((sig) => sig.every((b, i) => bytes[i] === b));
    if (res.ok && type.startsWith('image/') && isImage) return null;
    return `${name}: HTTP ${res.status}, ${type || 'no content-type'}, ${bytes.length} bytes — ${url}`;
  } catch (err) {
    return `${name}: ${err.cause?.code || err.message} — ${url}`;
  }
}

const failures = [];
const queue = [...targets];
await Promise.all(Array.from({ length: 12 }, async () => {
  while (queue.length) {
    const problem = await check(queue.shift());
    if (problem) failures.push(problem);
  }
}));

console.log(`Проверено ссылок: ${targets.length}, с ошибкой: ${failures.length}`);
for (const line of failures) console.log('  ' + line);
process.exit(failures.length ? 1 : 0);
