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
  };
}
