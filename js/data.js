import { CATEGORIES, categorize } from './shop.js';

export const CDN = 'https://cdn.cloudflare.steamstatic.com';

const ATTRS = [
  { id: 'str', title: 'Сила' },
  { id: 'agi', title: 'Ловкость' },
  { id: 'int', title: 'Интеллект' },
  { id: 'all', title: 'Универсальные' },
];

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

// dagon_2 … dagon_5 в данных называются просто «Dagon» — добавляем уровень.
function displayName(key, raw, rawItems) {
  const m = key.match(/^(.+)_(\d)$/);
  if (m && rawItems[m[1]] && rawItems[m[1]].dname === raw.dname) return `${raw.dname} ${m[2]}`;
  return raw.dname;
}

function normalizeItems(rawItems) {
  const items = new Map();
  for (const [key, raw] of Object.entries(rawItems)) {
    const category = categorize(key, raw);
    if (!category) continue;
    items.set(key, {
      key,
      id: raw.id,
      name: displayName(key, raw, rawItems),
      cost: raw.cost || 0,
      tier: raw.tier || 0,
      neutral: category === 'neutral',
      category,
      img: CDN + raw.img,
    });
  }
  return items;
}

function normalizeHeroes(rawHeroes) {
  return Object.values(rawHeroes)
    .map((h) => ({
      id: h.id,
      key: h.name.replace('npc_dota_hero_', ''),
      name: h.localized_name,
      attr: h.primary_attr,
      img: CDN + h.img,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadData() {
  const [rawItems, rawHeroes] = await Promise.all([
    getJSON('data/items.json'),
    getJSON('data/heroes.json'),
  ]);
  const items = normalizeItems(rawItems);
  const heroes = normalizeHeroes(rawHeroes);

  const categories = CATEGORIES
    .map((cat) => ({
      id: cat.id,
      group: cat.group,
      title: cat.title,
      items: [...items.values()]
        .filter((it) => it.category === cat.id)
        .sort((a, b) => (a.tier - b.tier) || (a.cost - b.cost) || a.name.localeCompare(b.name)),
    }))
    .filter((cat) => cat.items.length > 0);

  return {
    items,
    itemsById: new Map([...items.values()].map((it) => [it.id, it])),
    heroes,
    heroesById: new Map(heroes.map((h) => [h.id, h])),
    attrs: ATTRS,
    categories,
  };
}
