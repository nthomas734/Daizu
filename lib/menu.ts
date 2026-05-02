// All menu data lives here so it's the single source of truth for both
// the customer-facing menu and the barista's recipe view.

export const DRINKS = [
  { name: 'ESPRESSO',   jp: 'エスプレッソ',     price: '$4', note: 'double shot' },
  { name: 'LONG BLACK', jp: 'ロングブラック',   price: '$4', note: 'espresso · hot water' },
  { name: 'AMERICANO',  jp: 'アメリカーノ',     price: '$4', note: 'espresso · water' },
  { name: 'CORTADO',    jp: 'コルタード',       price: '$5', note: 'espresso · steamed milk' },
  { name: 'FLAT WHITE', jp: 'フラットホワイト', price: '$5', note: 'espresso · microfoam' },
  { name: 'CAPPUCCINO', jp: 'カプチーノ',       price: '$5', note: 'espresso · foam' },
  { name: 'LATTE',      jp: 'ラテ',             price: '$6', note: 'espresso · steamed milk' },
] as const;

export const SYRUPS = [
  { id: 'vanilla',    label: 'vanilla' },
  { id: 'honey',      label: 'honey' },
  { id: 'strawberry', label: 'strawberry', seasonal: true },
] as const;

export const EXTRAS = [
  { id: 'cinnamon',      label: 'cinnamon' },
  { id: 'vanilla_sugar', label: 'vanilla sugar' },
  { id: 'extra_shot',    label: 'extra shot' },
  { id: 'cocoa',         label: 'cocoa dust' },
] as const;

export const MILKS = [
  { id: 'whole', label: 'whole' },
  { id: 'oat',   label: 'oat' },
] as const;

export const SWEETNESS_LEVELS = [
  { id: 'light',  label: 'light',  pumps: '½ pump'  },
  { id: 'normal', label: 'normal', pumps: '1 pump'  },
  { id: 'extra',  label: 'extra',  pumps: '2 pumps' },
] as const;

export const MILK_DRINKS = ['CORTADO', 'FLAT WHITE', 'CAPPUCCINO', 'LATTE'];

export const NOTE_PLACEHOLDERS = [
  'less ice',
  'extra hot',
  'in the green mug',
  "leave on the counter, i'm on a call",
  'anything else?',
];

// Pump → oz conversion (barista side only — she sees pumps)
export const PUMPS_TO_OZ: Record<string, string> = {
  light:  '¼ oz',
  normal: '½ oz',
  extra:  '1 oz',
};

// Recipe data. Hot and iced flows are different per the user's actual process:
// for iced, syrup goes in first, espresso poured over, seasonings stirred in,
// cold milk added, stirred, then poured over ice. No steaming for iced.
export type Recipe = {
  base: string[];
  hot: string[];
  iced: string[];
  ratio: string;
};

export const RECIPES: Record<string, Recipe> = {
  ESPRESSO: {
    base: ['double shot · 18g coffee in, ~2oz out'],
    hot:  ['Pull double shot into warm cup', 'Serve immediately'],
    iced: ['Pull double shot into glass', 'Pour over ice (espresso loses crema)'],
    ratio: '—',
  },
  'LONG BLACK': {
    base: ['double shot · 18g coffee', '2oz hot water'],
    hot:  ['Pour 2oz hot water into cup first', 'Pull double shot directly over water (preserves crema)'],
    iced: ['Pull double shot into glass', 'Add 2oz cold water', 'Pour over ice'],
    ratio: '1 espresso : 1 water',
  },
  AMERICANO: {
    base: ['double shot · 18g coffee', '2oz water'],
    hot:  ['Pull double shot into cup', 'Top with 2oz hot water'],
    iced: ['Pull double shot into glass', 'Add 2oz cold water', 'Pour over ice'],
    ratio: '1 espresso : 1 water',
  },
  CORTADO: {
    base: ['double shot · 18g coffee', '2oz milk'],
    hot:  ['Pull double shot', 'Steam 2oz milk to 130°F (no foam)', 'Pour 1:1'],
    iced: ['Pull double shot into glass', 'Stir in any seasonings', 'Add 2oz cold milk', 'Stir, then pour over ice'],
    ratio: '1 espresso : 1 milk',
  },
  'FLAT WHITE': {
    base: ['double shot · 18g coffee', '4oz milk'],
    hot:  ['Pull double shot', 'Steam 4oz milk to 140°F with thin microfoam', 'Pour low and slow'],
    iced: ['Pull double shot into glass', 'Stir in any seasonings', 'Add 4oz cold milk', 'Stir, then pour over ice'],
    ratio: '1 espresso : 2 milk',
  },
  CAPPUCCINO: {
    base: ['double shot · 18g coffee', '4oz milk'],
    hot:  ['Pull double shot', 'Steam 4oz milk to 150°F with stiff foam', 'Pour to ⅓ espresso, ⅓ milk, ⅓ foam'],
    iced: ['Pull double shot into glass', 'Stir in any seasonings', 'Add 4oz cold milk', 'Stir, then pour over ice'],
    ratio: '1 espresso : 2 milk',
  },
  LATTE: {
    base: ['double shot · 18g coffee', '5oz milk'],
    hot:  ['Pull double shot', 'Steam 5oz milk to 140°F with light microfoam', 'Pour for latte art'],
    iced: ['Pull double shot into glass', 'Stir in any seasonings', 'Add 5oz cold milk', 'Stir, then pour over ice'],
    ratio: '1 espresso : 2.5 milk',
  },
};

export type Order = {
  id: number;
  customer: string;
  drink: string;
  temp: 'hot' | 'iced';
  milk: string | null;
  syrups: string[];
  sweetness: string;
  extras: string[];
  notes: string;
  status: 'received' | 'brewing' | 'ready' | 'cancelled';
  ready_phrase_jp?: string | null;
  ready_phrase_en?: string | null;
  created_at: string;
  ready_at?: string | null;
};

export type Favorite = {
  id: number;
  label: string;
  drink: string;
  temp: 'hot' | 'iced';
  milk: string | null;
  syrups: string[];
  sweetness: string;
  extras: string[];
  notes: string;
  customer: string;
};

export const COLORS = {
  cafe: {
    bg: '#1B3A2F',
    board: '#0A0A0A',
    surface: '#1A1A1A',
    cream: '#F5EDE0',
    tileText: '#FFF8EC',
    brass: '#C8A97E',
    accent: '#A84438',
  },
  bar: {
    bg: '#1A2A3F',
    board: '#0A0A0A',
    surface: '#1A1A1A',
    cream: '#F5EDE0',
    tileText: '#FFF8EC',
    brass: '#C8A97E',
    accent: '#A84438',
  },
};
