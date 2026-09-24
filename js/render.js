// Отрисовка панелей. Каждая функция полностью перестраивает свой контейнер:
// элементов немного, так проще и надёжнее точечных обновлений.

const goldFormat = new Intl.NumberFormat('ru-RU');
export const formatGold = (n) => goldFormat.format(n);

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (name === 'class') node.className = value;
    else if (name === 'text') node.textContent = value;
    else node.setAttribute(name, value === true ? '' : value);
  }
  for (const child of [].concat(children)) {
    if (child !== null && child !== undefined) node.append(child);
  }
  return node;
}

function image(src, alt) {
  return el('img', { src, alt, loading: 'lazy', decoding: 'async', draggable: 'false' });
}

export function sumCost(keys, items) {
  return keys.reduce((sum, key) => sum + (items.get(key)?.cost || 0), 0);
}

function goldLabel(amount) {
  return el('span', { class: 'gold' }, [el('span', { class: 'gold-coin', 'aria-hidden': 'true' }), formatGold(amount)]);
}

// Плитка предмета. data-* описывают, откуда её можно утащить.
export function itemTile(item, origin = {}) {
  const badge = item.neutral ? `T${item.tier}` : (item.cost ? formatGold(item.cost) : '');
  const hint = item.neutral ? `${item.name} — нейтральный, уровень ${item.tier}` : `${item.name} — ${formatGold(item.cost)} золота`;
  const tile = el('div', {
    class: `item${item.neutral ? ' item--neutral' : ''}`,
    'data-key': item.key,
    'data-origin': origin.zone || 'catalog',
    'data-index': origin.index,
    'data-section-id': origin.sectionId,
    title: hint,
  }, [
    image(item.img, item.name),
    el('span', { class: 'item-fallback', text: item.name }),
    badge ? el('span', { class: 'item-badge', text: badge }) : null,
  ]);
  return tile;
}

export function renderHeroes(container, data, { query, selectedId }) {
  const q = query.trim().toLowerCase();
  const groups = data.attrs.map((attr) => {
    const heroes = data.heroes.filter((h) => h.attr === attr.id
      && (!q || h.name.toLowerCase().includes(q) || h.key.includes(q)));
    if (!heroes.length) return null;
    return el('div', { class: 'hero-group' }, [
      el('h3', { class: `hero-group-title attr-${attr.id}`, text: attr.title }),
      el('div', { class: 'hero-grid' }, heroes.map((h) => el('button', {
        type: 'button',
        class: `hero${h.id === selectedId ? ' is-selected' : ''}`,
        'data-hero-id': h.id,
        title: h.name,
        'aria-pressed': h.id === selectedId ? 'true' : 'false',
      }, [image(h.img, h.name), el('span', { class: 'hero-fallback', text: h.name })]))),
    ]);
  }).filter(Boolean);

  container.replaceChildren(...(groups.length ? groups : [el('p', { class: 'empty', text: 'Герой не найден' })]));
}

export function renderHeroCard(container, data, heroId) {
  const hero = data.heroesById.get(heroId);
  if (!hero) {
    container.replaceChildren(
      el('div', { class: 'hero-card-portrait is-empty', text: '?' }),
      el('div', { class: 'hero-card-info' }, [
        el('div', { class: 'hero-card-name', text: 'Герой не выбран' }),
        el('div', { class: 'hero-card-attr', text: 'Выберите героя в списке слева' }),
      ]),
    );
    return;
  }
  const attr = data.attrs.find((a) => a.id === hero.attr);
  container.replaceChildren(
    el('div', { class: 'hero-card-portrait' }, [image(hero.img, hero.name), el('span', { class: 'hero-fallback', text: hero.name })]),
    el('div', { class: 'hero-card-info' }, [
      el('div', { class: 'hero-card-name', text: hero.name }),
      el('div', { class: `hero-card-attr attr-${hero.attr}`, text: attr ? attr.title : '' }),
    ]),
  );
}

export function renderSlots(containers, data, slots) {
  for (const [zone, container] of Object.entries(containers)) {
    container.replaceChildren(...slots[zone].map((key, index) => {
      const item = key && data.items.get(key);
      return el('div', {
        class: `slot slot--${zone}${item ? ' is-filled' : ''}`,
        'data-drop': 'slot',
        'data-zone': zone,
        'data-index': index,
      }, item ? itemTile(item, { zone, index }) : null);
    }));
  }
}

export function renderCatalog(container, data, { query, category }) {
  const q = query.trim().toLowerCase();
  const match = (it) => !q || it.name.toLowerCase().includes(q) || it.key.includes(q);
  const cats = data.categories.filter((c) => category === 'all' || c.id === category);

  const blocks = cats.map((cat) => {
    const items = cat.items.filter(match);
    if (!items.length) return null;
    return el('div', { class: 'catalog-group' }, [
      category === 'all' ? el('h3', { class: 'catalog-group-title', text: cat.title }) : null,
      el('div', { class: 'item-grid' }, items.map((it) => itemTile(it))),
    ]);
  }).filter(Boolean);

  container.replaceChildren(...(blocks.length ? blocks : [el('p', { class: 'empty', text: 'Ничего не найдено' })]));
}

export function renderSections(container, data, sections) {
  // Перерисовка не должна сбивать ввод заголовка: запоминаем фокус и курсор.
  const active = document.activeElement;
  const focused = active && active.classList.contains('section-title')
    ? { id: active.dataset.sectionId, start: active.selectionStart, end: active.selectionEnd }
    : null;

  container.replaceChildren(...sections.map((section) => {
    const items = section.items.map((key) => data.items.get(key)).filter(Boolean);
    return el('article', { class: 'section', 'data-section-id': section.id }, [
      el('header', { class: 'section-head' }, [
        el('input', {
          class: 'section-title',
          type: 'text',
          value: section.title,
          maxlength: '40',
          spellcheck: 'false',
          'aria-label': 'Название секции',
          'data-section-id': section.id,
        }),
        el('button', {
          type: 'button',
          class: 'icon-btn section-delete',
          title: 'Удалить секцию',
          'aria-label': `Удалить секцию «${section.title}»`,
          'data-section-id': section.id,
        }, '×'),
      ]),
      el('div', { class: 'section-items', 'data-drop': 'section', 'data-section-id': section.id },
        items.length
          ? section.items.map((key, index) => {
            const item = data.items.get(key);
            return item ? itemTile(item, { zone: 'section', index, sectionId: section.id }) : null;
          })
          : el('p', { class: 'section-empty', text: 'Перетащите сюда предметы' })),
      el('footer', { class: 'section-foot' }, [
        el('span', { class: 'section-count', text: `${items.length} шт.` }),
        goldLabel(sumCost(section.items, data.items)),
      ]),
    ]);
  }));

  if (focused) {
    const input = container.querySelector(`.section-title[data-section-id="${focused.id}"]`);
    if (input) {
      input.focus();
      input.setSelectionRange(focused.start, focused.end);
    }
  }
}

export function renderTotals({ slotsTotal, buildTotal }, data, build) {
  const slotKeys = [...build.slots.inventory, ...build.slots.backpack].filter(Boolean);
  slotsTotal.replaceChildren(goldLabel(sumCost(slotKeys, data.items)));
  const all = build.sections.flatMap((s) => s.items);
  buildTotal.replaceChildren(goldLabel(sumCost(all, data.items)));
}
