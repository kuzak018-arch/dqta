// Состояние сборки и все операции над ним. Предметы хранятся по ключу
// из items.json (например, "blink"), герой — по числовому id.

export const SLOT_ZONES = { inventory: 6, backpack: 3, neutral: 1 };

export const DEFAULT_SECTIONS = ['Старт', 'Ранний', 'Кор', 'Ситуативные'];

let uidCounter = 0;
export function uid() {
  uidCounter += 1;
  return `s${Date.now().toString(36)}${uidCounter}`;
}

export function createSection(title, items = []) {
  return { id: uid(), title, items: [...items] };
}

export function createDefaultBuild() {
  return {
    hero: null,
    slots: Object.fromEntries(
      Object.entries(SLOT_ZONES).map(([zone, size]) => [zone, Array(size).fill(null)]),
    ),
    sections: DEFAULT_SECTIONS.map((title) => createSection(title)),
  };
}

// Куда можно положить предмет. Места описываются так:
//   { zone: 'inventory' | 'backpack' | 'neutral', index }  — слот
//   { zone: 'section', sectionId, index }                  — позиция в секции
//   { zone: 'catalog' }                                    — источник-каталог
export function canPlace(item, to) {
  if (!item) return false;
  if (to.zone === 'section') return true;
  if (to.zone === 'neutral') return item.neutral;
  if (to.zone in SLOT_ZONES) return !item.neutral;
  return false;
}

const isSlot = (loc) => loc.zone in SLOT_ZONES;

export function createStore(initial) {
  let build = initial;
  const listeners = new Set();

  function commit() {
    for (const fn of listeners) fn(build);
  }

  return {
    get build() { return build; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    replace(next) { build = next; commit(); },

    setHero(heroId) {
      build.hero = heroId;
      commit();
    },

    addSection(title) {
      const section = createSection(title);
      build.sections.push(section);
      commit();
      return section;
    },

    renameSection(id, title) {
      const section = build.sections.find((s) => s.id === id);
      if (!section || section.title === title) return;
      section.title = title;
      commit();
    },

    removeSection(id) {
      build.sections = build.sections.filter((s) => s.id !== id);
      commit();
    },

    // Из каталога предмет копируется, из слота или секции — переносится.
    // Занятый слот меняется местами с источником.
    drop(key, from, to) {
      const section = (id) => build.sections.find((s) => s.id === id);

      if (to.zone === 'section') {
        const target = section(to.sectionId);
        if (!target) return;
        let index = Math.min(to.index, target.items.length);
        if (from.zone === 'section') {
          const source = section(from.sectionId);
          if (!source || source.items[from.index] !== key) return;
          source.items.splice(from.index, 1);
          if (source === target && from.index < index) index -= 1;
        } else if (isSlot(from)) {
          build.slots[from.zone][from.index] = null;
        }
        target.items.splice(index, 0, key);
      } else if (isSlot(to)) {
        if (from.zone === to.zone && from.index === to.index) return;
        const displaced = build.slots[to.zone][to.index];
        build.slots[to.zone][to.index] = key;
        if (isSlot(from)) {
          build.slots[from.zone][from.index] = displaced;
        } else if (from.zone === 'section') {
          const source = section(from.sectionId);
          if (source) source.items.splice(from.index, 1, ...(displaced ? [displaced] : []));
        }
      } else {
        return;
      }
      commit();
    },

    removeAt(from) {
      if (isSlot(from)) {
        build.slots[from.zone][from.index] = null;
      } else if (from.zone === 'section') {
        const source = build.sections.find((s) => s.id === from.sectionId);
        if (!source) return;
        source.items.splice(from.index, 1);
      } else {
        return;
      }
      commit();
    },
  };
}
