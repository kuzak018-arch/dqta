import { loadData } from './data.js';
import { createStore, createDefaultBuild, canPlace } from './state.js';
import { setupDragAndDrop } from './dnd.js';
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
};

const view = { heroQuery: '', itemQuery: '', category: 'all' };

function setStatus(text, kind = '') {
  dom.status.textContent = text;
  dom.status.dataset.kind = kind;
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

  const store = createStore(createDefaultBuild());

  const drawHeroes = () => renderHeroes(dom.heroList, data, { query: view.heroQuery, selectedId: store.build.hero });
  const drawCatalog = () => renderCatalog(dom.catalog, data, { query: view.itemQuery, category: view.category });
  const drawBuild = (build) => {
    renderHeroCard(dom.heroCard, data, build.hero);
    renderSlots(dom.slots, data, build.slots);
    renderSections(dom.sections, data, build.sections);
    renderTotals(dom, data, build);
  };

  store.subscribe((build) => {
    drawHeroes();
    drawBuild(build);
  });

  fillCategorySelect(data.categories);
  drawHeroes();
  drawCatalog();
  drawBuild(store.build);
  dom.app.removeAttribute('aria-busy');

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
