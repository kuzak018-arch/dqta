// Сериализация сборки для localStorage и ссылки.
//
// Формат (версия 1) — компактный JSON с числовыми id из data/*.json:
//   { v: 1, h: <id героя | 0>, s: [id × 10 слотов, 0 — пусто], c: [[название, [id, …]], …] }
// Порядок слотов: 6 инвентаря, 3 рюкзака, 1 нейтральный.
// В ссылке этот JSON лежит после "#b=" в base64 (URL-safe алфавит, без "=").

import { SLOT_ZONES, canPlace, createDefaultBuild, createSection } from './state.js';

const VERSION = 1;
const STORAGE_KEY = 'dota2-build-sandbox:v1';
const HASH_PREFIX = '#b=';
const MAX_TITLE = 40;
const MAX_SECTIONS = 50;
const MAX_SECTION_ITEMS = 100;

export function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(encoded) {
  let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
  while (b64.length % 4) b64 += '=';
  const binary = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(binary, (ch) => ch.charCodeAt(0)));
}

export function serialize(build, data) {
  const id = (key) => (key && data.items.get(key)?.id) || 0;
  return {
    v: VERSION,
    h: build.hero || 0,
    s: Object.keys(SLOT_ZONES).flatMap((zone) => build.slots[zone].map(id)),
    c: build.sections.map((section) => [section.title, section.items.map(id).filter(Boolean)]),
  };
}

// Разбирает то, что пришло извне (ссылка, localStorage). Всё непонятное
// отбрасывается, поэтому битая или устаревшая ссылка не ломает страницу.
export function deserialize(raw, data) {
  if (!raw || typeof raw !== 'object' || raw.v !== VERSION) return null;
  const build = createDefaultBuild();

  build.hero = data.heroesById.has(raw.h) ? raw.h : null;

  const ids = Array.isArray(raw.s) ? raw.s : [];
  let offset = 0;
  for (const [zone, size] of Object.entries(SLOT_ZONES)) {
    for (let index = 0; index < size; index += 1) {
      const item = data.itemsById.get(ids[offset + index]);
      if (item && canPlace(item, { zone, index })) build.slots[zone][index] = item.key;
    }
    offset += size;
  }

  if (Array.isArray(raw.c)) {
    build.sections = raw.c.slice(0, MAX_SECTIONS)
      .filter((entry) => Array.isArray(entry))
      .map(([title, items]) => createSection(
        (typeof title === 'string' && title.trim() ? title : 'Без названия').slice(0, MAX_TITLE),
        (Array.isArray(items) ? items : [])
          .slice(0, MAX_SECTION_ITEMS)
          .map((itemId) => data.itemsById.get(itemId)?.key)
          .filter(Boolean),
      ));
  }
  return build;
}

export function encodeBuild(build, data) {
  return toBase64Url(JSON.stringify(serialize(build, data)));
}

export function decodeBuild(encoded, data) {
  try {
    return deserialize(JSON.parse(fromBase64Url(encoded)), data);
  } catch {
    return null;
  }
}

// ---------- location.hash ----------

export function readHash() {
  const { hash } = window.location;
  return hash.startsWith(HASH_PREFIX) ? hash.slice(HASH_PREFIX.length) : null;
}

export function writeHash(encoded) {
  const next = HASH_PREFIX + encoded;
  if (window.location.hash === next) return;
  // replaceState не плодит записи в истории и не вызывает hashchange.
  try {
    history.replaceState(history.state, '', next);
  } catch {
    // Safari может отказать при слишком частых вызовах — следующая запись догонит.
  }
}

// ---------- localStorage ----------
// Хранилище может быть недоступно (приватный режим, запрет cookies),
// поэтому все обращения — в try/catch, а сайт работает и без него.

export function loadFromStorage(data) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? deserialize(JSON.parse(stored), data) : null;
  } catch {
    return null;
  }
}

export function saveToStorage(build, data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize(build, data)));
    return true;
  } catch {
    return false;
  }
}
