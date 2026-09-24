import { loadData } from './data.js';
import { createStore, createDefaultBuild, canPlace } from './state.js';
import { setupDragAndDrop } from './dnd.js';
import {
  encodeBuild, decodeBuild, readHash, writeHash, loadFromStorage, saveToStorage,
} from './share.js';
import {
  el, renderHeroes, renderHeroCard, renderSlots, renderCatalog, renderSections, renderTotals,
} from './render.js';

const $ = (id) => document.getElementById(id);

const dom = {
  app: $('app'),
  status: $('status'),
  heroSearch: $('hero-search'),
  heroList: $('hero-list'),
  heroCard: $('hero-card'),
  slots: { inventory: $('slots-inventory'), backpack: $('slots-backpack'), neutral: $('slots-neutral') },
  itemSearch: $('item-search'),
  itemCategory: $('item-category'),
  catalog: $('catalog'),
  sections: $('sections'),
  addSection: $('add-section'),
  slotsTotal: $('slots-total'),
  buildTotal: $('build-total'),
  share: $('share-build'),
  reset: $('reset-build'),
  toast: $('toast'),
};

const view = { heroQuery: '', itemQuery: '', category: 'all' };

function setStatus(text, kind = '') {
  dom.status.textContent = text;
  dom.status.dataset.kind = kind;
}

let toastTimer = 0;
function toast(text) {
  dom.toast.textContent = text;
  dom.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { dom.toast.hidden = true; }, 2600);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// Картинки грузятся с CDN Valve. Если он недоступен, плитка показывает
// название, а в шапке — сколько иконок не загрузилось.
function watchBrokenImages() {
  const broken = new Set();
  document.addEventListener('error', (event) => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement)) return;
    img.parentElement?.classList.add('is-broken');
    broken.add(img.src);
    setStatus(`Не загрузилось иконок: ${broken.size} — проверьте доступ к cdn.cloudflare.steamstatic.com`, 'warn');
  }, true);
}

function fillCategorySelect(categories) {
  const groups = new Map();
  for (const cat of categories) {
    if (!groups.has(cat.group)) groups.set(cat.group, []);
    groups.get(cat.group).push(cat);
  }
  dom.itemCategory.replaceChildren(
    el('option', { value: 'all', text: 'Все категории' }),
    ...[...groups].map(([group, cats]) => el('optgroup', { label: group },
      cats.map((cat) => el('option', { value: cat.id, text: `${cat.title} (${cat.items.length})` })))),
  );
}

async function init() {
  watchBrokenImages();

  let data;
  try {
    data = await loadData();
  } catch (err) {
    console.error(err);
    setStatus('Не удалось загрузить data/items.json и data/heroes.json. Откройте сайт через HTTP-сервер (см. README).', 'error');
    return;
  }

  // Ссылка важнее сохранённого: открыли чужую сборку — она и становится текущей.
  const hashed = readHash();
  const fromHash = hashed ? decodeBuild(hashed, data) : null;
  const store = createStore(fromHash || loadFromStorage(data) || createDefaultBuild());
  if (hashed && !fromHash) toast('Ссылка повреждена — открыта сохранённая сборка');
  else if (fromHash) toast('Сборка загружена из ссылки');

  // Запись в hash и localStorage откладываем чуть-чуть: при наборе названия
  // секции изменения идут на каждую клавишу, а Safari ограничивает частоту
  // history.replaceState.
  let lastEncoded = '';
  let persistTimer = 0;
  const persistNow = () => {
    clearTimeout(persistTimer);
    persistTimer = 0;
    lastEncoded = encodeBuild(store.build, data);
    writeHash(lastEncoded);
    saveToStorage(store.build, data);
  };
  const persist = () => {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(persistNow, 150);
  };
  window.addEventListener('pagehide', () => { if (persistTimer) persistNow(); });

  const drawHeroes = () => renderHeroes(dom.heroList, data, { query: view.heroQuery, selectedId: store.build.hero });
  const drawCatalog = () => renderCatalog(dom.catalog, data, { query: view.itemQuery, category: view.category });
  const drawBuild = (build) => {
    renderHeroCard(dom.heroCard, data, build.hero);
    renderSlots(dom.slots, data, build.slots);
    renderSections(dom.sections, data, build.sections);
    renderTotals(dom, data, build);
  };

  let shownHero = store.build.hero;
  store.subscribe((build) => {
    if (build.hero !== shownHero) {
      shownHero = build.hero;
      drawHeroes();
    }
    drawBuild(build);
    persist();
  });

  fillCategorySelect(data.categories);
  drawHeroes();
  drawCatalog();
  drawBuild(store.build);
  persistNow();
  dom.app.removeAttribute('aria-busy');

  // Шаринг и сброс
  window.addEventListener('hashchange', () => {
    const encoded = readHash();
    if (!encoded || encoded === lastEncoded) return;
    const build = decodeBuild(encoded, data);
    if (build) {
      store.replace(build);
      toast('Сборка загружена из ссылки');
    } else {
      writeHash(lastEncoded);
      toast('Ссылка повреждена');
    }
  });
  dom.share.addEventListener('click', async () => {
    persistNow();
    const url = window.location.href;
    if (await copyText(url)) toast('Ссылка скопирована в буфер обмена');
    else window.prompt('Скопируйте ссылку на сборку:', url);
  });
  dom.reset.addEventListener('click', () => {
    if (!window.confirm('Очистить сборку: героя, слоты и секции?')) return;
    store.replace(createDefaultBuild());
    toast('Сборка очищена');
  });

  // Герои
  dom.heroSearch.addEventListener('input', () => {
    view.heroQuery = dom.heroSearch.value;
    drawHeroes();
  });
  dom.heroList.addEventListener('click', (event) => {
    const button = event.target.closest('.hero');
    if (!button) return;
    const id = Number(button.dataset.heroId);
    store.setHero(store.build.hero === id ? null : id);
  });

  // Каталог
  dom.itemSearch.addEventListener('input', () => {
    view.itemQuery = dom.itemSearch.value;
    drawCatalog();
  });
  dom.itemCategory.addEventListener('change', () => {
    view.category = dom.itemCategory.value;
    dom.catalog.scrollTop = 0;
    drawCatalog();
  });

  // Перетаскивание и удаление по клику
  setupDragAndDrop({
    getItem: (key) => data.items.get(key),
    canDrop: (key, to) => canPlace(data.items.get(key), to),
    onDrop: (key, from, to) => {
      if (to.zone === 'trash') store.removeAt(from);
      else store.drop(key, from, to);
    },
  });

  const removeTile = (tile) => {
    const zone = tile.dataset.origin;
    store.removeAt({ zone, index: Number(tile.dataset.index), sectionId: tile.dataset.sectionId });
  };
  for (const container of [dom.sections, ...Object.values(dom.slots)]) {
    container.addEventListener('click', (event) => {
      const tile = event.target.closest('.item--removable');
      if (tile) removeTile(tile);
    });
    container.addEventListener('keydown', (event) => {
      const tile = event.target.closest('.item--removable');
      if (!tile || (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Delete' && event.key !== 'Backspace')) return;
      event.preventDefault();
      removeTile(tile);
    });
  }

  // Секции
  dom.addSection.addEventListener('click', () => {
    const section = store.addSection('Новая секция');
    const input = dom.sections.querySelector(`.section-title[data-section-id="${section.id}"]`);
    input?.focus();
    input?.select();
  });
  dom.sections.addEventListener('input', (event) => {
    const input = event.target.closest('.section-title');
    if (input) store.renameSection(input.dataset.sectionId, input.value);
  });
  dom.sections.addEventListener('focusout', (event) => {
    const input = event.target.closest('.section-title');
    if (input && !input.value.trim()) store.renameSection(input.dataset.sectionId, 'Без названия');
  });
  dom.sections.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.closest('.section-title')) event.target.blur();
  });
  dom.sections.addEventListener('click', (event) => {
    const button = event.target.closest('.section-delete');
    if (!button) return;
    const section = store.build.sections.find((s) => s.id === button.dataset.sectionId);
    if (!section) return;
    if (section.items.length && !window.confirm(`Удалить секцию «${section.title}» вместе с предметами (${section.items.length})?`)) return;
    store.removeSection(section.id);
  });
}

init();
