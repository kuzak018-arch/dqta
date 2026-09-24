// Категории магазина. В items.json из dotaconstants нет поля с разделом
// магазина, поэтому раскладка по колонкам задана вручную (патч 7.41).
// Предмет, который есть в данных, но не попал ни в один список, окажется
// в «Прочее» — так новые предметы не потеряются после обновления data/.

export const CATEGORIES = [
  {
    id: 'consumables', group: 'Базовые', title: 'Расходуемые',
    items: ['tpscroll', 'clarity', 'faerie_fire', 'smoke_of_deceit', 'ward_observer',
      'ward_sentry', 'enchanted_mango', 'flask', 'tango', 'blood_grenade', 'dust', 'bottle'],
  },
  {
    id: 'attributes', group: 'Базовые', title: 'Атрибуты',
    items: ['branches', 'gauntlets', 'slippers', 'mantle', 'circlet', 'belt_of_strength',
      'boots_of_elves', 'robe', 'crown', 'ogre_axe', 'blade_of_alacrity', 'staff_of_wizardry',
      'diadem'],
  },
  {
    id: 'equipment', group: 'Базовые', title: 'Снаряжение',
    items: ['quelling_blade', 'ring_of_protection', 'infused_raindrop', 'orb_of_venom',
      'blight_stone', 'orb_of_frost', 'blades_of_attack', 'gloves', 'chainmail', 'quarterstaff',
      'helm_of_iron_will', 'splintmail', 'javelin', 'broadsword', 'blitz_knuckles', 'claymore',
      'mithril_hammer'],
  },
  {
    id: 'misc', group: 'Базовые', title: 'Разное',
    items: ['ring_of_regen', 'sobi_mask', 'magic_stick', 'wizard_hat', 'wind_lace', 'shawl',
      'boots', 'cloak', 'voodoo_mask', 'ring_of_health', 'void_stone', 'gem', 'lifesteal',
      'shadow_amulet', 'chasm_stone', 'ghost', 'blink'],
  },
  {
    id: 'secret', group: 'Базовые', title: 'Тайная лавка',
    items: ['fluffy_hat', 'energy_booster', 'vitality_booster', 'point_booster',
      'talisman_of_evasion', 'platemail', 'cornucopia', 'hyperstone', 'ring_of_tarrasque',
      'tiara_of_selemene', 'demon_edge', 'ultimate_orb', 'eagle', 'reaver', 'mystic_staff',
      'relic'],
  },
  {
    id: 'accessories', group: 'Улучшения', title: 'Аксессуары',
    items: ['magic_wand', 'bracer', 'wraith_band', 'null_talisman', 'soul_ring',
      'orb_of_corrosion', 'falcon_blade', 'power_treads', 'phase_boots', 'oblivion_staff',
      'pers', 'mask_of_madness', 'hand_of_midas', 'helm_of_the_dominator', 'travel_boots',
      'travel_boots_2', 'moon_shard'],
  },
  {
    id: 'support', group: 'Улучшения', title: 'Поддержка',
    items: ['ring_of_basilius', 'headdress', 'buckler', 'urn_of_shadows', 'tranquil_boots',
      'pavise', 'arcane_boots', 'ancient_janggo', 'mekansm', 'essence_distiller', 'holy_locket',
      'vladmir', 'solar_crest', 'spirit_vessel', 'pipe', 'boots_of_bearing', 'guardian_greaves'],
  },
  {
    id: 'magical', group: 'Улучшения', title: 'Магия',
    items: ['veil_of_discord', 'glimmer_cape', 'force_staff', 'aether_lens', 'witch_blade',
      'phylactery', 'cyclone', 'rod_of_atos', 'dagon', 'dagon_2', 'dagon_3', 'dagon_4',
      'dagon_5', 'orchid', 'aghanims_shard', 'ultimate_scepter', 'gungir', 'crellas_crozier',
      'refresher', 'octarine_core', 'sheepstick', 'ethereal_blade', 'devastator', 'wind_waker'],
  },
  {
    id: 'armor', group: 'Улучшения', title: 'Защита',
    items: ['vanguard', 'blade_mail', 'aeon_disk', 'soul_booster', 'consecrated_wraps',
      'crimson_guard', 'eternal_shroud', 'lotus_orb', 'black_king_bar', 'hurricane_pike',
      'shivas_guard', 'bloodstone', 'manta', 'sphere', 'assault', 'heart'],
  },
  {
    id: 'weapons', group: 'Улучшения', title: 'Оружие',
    items: ['lesser_crit', 'armlet', 'meteor_hammer', 'basher', 'invis_sword', 'bfury',
      'specialists_array', 'monkey_king_bar', 'radiance', 'revenants_brooch', 'greater_crit',
      'butterfly', 'silver_edge', 'rapier', 'bloodthorn', 'abyssal_blade', 'hydras_breath'],
  },
  {
    id: 'artifacts', group: 'Улучшения', title: 'Артефакты',
    items: ['sange', 'yasha', 'kaya', 'dragon_lance', 'diffusal_blade', 'echo_sabre',
      'maelstrom', 'mage_slayer', 'heavens_halberd', 'desolator', 'kaya_and_sange',
      'sange_and_yasha', 'yasha_and_kaya', 'nullifier', 'harpoon', 'satanic', 'angels_demise',
      'mjollnir', 'helm_of_the_overlord', 'skadi', 'disperser', 'overwhelming_blink',
      'swift_blink', 'arcane_blink'],
  },
  // Нейтральные предметы определяются по полю tier, список не нужен.
  { id: 'neutral', group: 'Нейтральные', title: 'Нейтральные', items: [] },
  { id: 'other', group: 'Прочее', title: 'Прочее', items: [] },
];

// Есть в items.json со стоимостью, но в магазине их нет: удалённые из игры,
// дропы с Рошана, курьеры, служебные и ивентовые предметы.
export const HIDDEN = new Set([
  'stout_shield', 'trident', 'diffusal_blade_2', 'necronomicon', 'necronomicon_2',
  'necronomicon_3', 'wraith_pact', 'tome_of_knowledge', 'ring_of_aquila', 'courier',
  'flying_courier', 'cheese', 'refresher_shard', 'royale_with_cheese', 'aghanims_shard_roshan',
  'ultimate_scepter_2', 'ultimate_scepter_roshan', 'pocket_roshan', 'caster_rapier',
  'tango_single', 'ward_dispenser',
]);

const CATEGORY_BY_ITEM = new Map();
for (const cat of CATEGORIES) {
  for (const key of cat.items) CATEGORY_BY_ITEM.set(key, cat.id);
}

// Возвращает id категории или null, если предмет не показывается в каталоге.
export function categorize(key, raw) {
  if (HIDDEN.has(key) || key.startsWith('recipe_') || !raw.dname) return null;
  if (raw.tier) return 'neutral';
  const mapped = CATEGORY_BY_ITEM.get(key);
  if (mapped) return mapped;
  return raw.cost > 0 ? 'other' : null;
}
