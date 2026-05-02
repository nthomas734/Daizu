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
  // Bar fields (optional — only set on cocktail orders)
  category?: 'cafe' | 'bar';
  strength?: 'light' | 'standard' | 'strong';
  quantity?: number;
  spirit?: string | null;
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
  category?: 'cafe' | 'bar';
  strength?: 'light' | 'standard' | 'strong';
  quantity?: number;
  spirit?: string | null;
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

// ─────────────────────────────────────────────────────────────────────────────
// BAR — cocktails
// ─────────────────────────────────────────────────────────────────────────────

// Each cocktail has a `display` field — the truncated string used on the
// 16-char split-flap board. The `name` is the canonical key (used in URLs and DB).
// The `glass` field selects the icon shown on the board.
export type GlassType = 'rocks' | 'highball' | 'coupe';

export const COCKTAILS = [
  { name: 'OLD FASHIONED',  display: 'OLD FASHIONED',  jp: 'オールドファッション',  note: 'bourbon · bitters · sugar',          glass: 'rocks'    as GlassType },
  { name: 'GIN & TONIC',    display: 'GIN & TONIC',    jp: 'ジントニック',          note: 'gin · tonic · lime',                 glass: 'highball' as GlassType },
  { name: 'DAIQUIRI',       display: 'DAIQUIRI',       jp: 'ダイキリ',              note: 'rum · lime · demerara',              glass: 'coupe'    as GlassType },
  { name: 'ESPRESSO TINI',  display: 'ESPRESSO TINI',  jp: 'エスプレッソティーニ',  note: 'vodka · espresso · kahlua',          glass: 'coupe'    as GlassType },
  { name: 'GOLD COAST',     display: 'GOLD COAST',     jp: 'ゴールドコースト',      note: 'bourbon · honey · lemon · IPA',      glass: 'coupe'    as GlassType },
  { name: 'GARDEN MULE',    display: 'GARDEN MULE',    jp: 'ガーデンミュール',      note: 'gin · hibiscus · ginger · berries',  glass: 'highball' as GlassType },
  { name: 'NEGRONI',        display: 'NEGRONI',        jp: 'ネグローニ',            note: 'gin · campari · sweet vermouth',     glass: 'rocks'    as GlassType },
  { name: 'HOUSE HIGHBALL', display: 'HOUSE HIGHBALL', jp: 'ハウスハイボール',      note: 'your spirit · soda · citrus',        glass: 'highball' as GlassType },
] as const;

// Strength levels affect the base spirit pour (e.g. 1.5 / 2 / 2.5 oz for an Old Fashioned)
export const STRENGTH_LEVELS = [
  { id: 'light',    label: 'light',    note: 'less booze' },
  { id: 'standard', label: 'standard', note: 'as written' },
  { id: 'strong',   label: 'strong',   note: 'extra pour' },
] as const;

// Spirit options for the House Highball — your home bar inventory
export const HIGHBALL_SPIRITS = [
  { id: 'bourbon', label: 'bourbon', citrus: 'lemon' },
  { id: 'gin',     label: 'gin',     citrus: 'lime'  },
  { id: 'vodka',   label: 'vodka',   citrus: 'lime'  },
  { id: 'rum',     label: 'rum',     citrus: 'lime'  },
] as const;

// Cocktail-specific notes placeholders (rotates through these on the customize screen)
export const COCKTAIL_NOTE_PLACEHOLDERS = [
  'extra dirty',
  'less sweet',
  'big cube please',
  'no garnish',
  'on the rocks',
  'anything else?',
];

// Strength → base pour ounces (used in recipe view to show actual oz to the bartender)
export const STRENGTH_TO_OZ: Record<string, string> = {
  light:    '1.5 oz',
  standard: '2 oz',
  strong:   '2.5 oz',
};

// Cocktail recipes — same shape as coffee RECIPES but with glass + garnish surfaced
export type CocktailRecipe = {
  glass: GlassType;
  glassLabel: string;
  garnish: string;
  ingredients: string[];   // listed at standard strength; bartender adjusts based on order
  steps: string[];
};

export const COCKTAIL_RECIPES: Record<string, CocktailRecipe> = {
  'OLD FASHIONED': {
    glass: 'rocks',
    glassLabel: 'rocks glass, large cube',
    garnish: 'orange peel, expressed',
    ingredients: [
      '2 oz bourbon',
      '¼ oz simple syrup (or 1 sugar cube + splash water)',
      '2 dashes Angostura bitters',
      '1 dash orange bitters',
    ],
    steps: [
      'Add sugar, bitters, splash of water to glass; stir to dissolve',
      'Add bourbon and one large ice cube',
      'Stir 30 seconds to chill and dilute',
      'Express orange peel over surface, drop in',
    ],
  },
  'GIN & TONIC': {
    glass: 'highball',
    glassLabel: 'highball, lots of ice',
    garnish: 'lime wheel',
    ingredients: [
      '2 oz gin',
      '4 oz tonic water',
      '¼ oz fresh lime juice',
    ],
    steps: [
      'Fill highball with ice',
      'Pour gin over ice',
      'Top with tonic',
      'Squeeze lime, drop wheel in',
    ],
  },
  'DAIQUIRI': {
    glass: 'coupe',
    glassLabel: 'chilled coupe',
    garnish: 'lime wheel on rim',
    ingredients: [
      '2 oz Ron Allegro Añejo rum',
      '¾ oz fresh lime juice',
      '½ oz demerara syrup',
    ],
    steps: [
      'Combine all in shaker with ice',
      'Shake hard, 12 seconds',
      'Double-strain into chilled coupe',
      'Lime wheel on rim',
    ],
  },
  'ESPRESSO TINI': {
    glass: 'coupe',
    glassLabel: 'chilled coupe',
    garnish: '3 coffee beans floated on foam',
    ingredients: [
      '2 oz Tito\'s vodka',
      '1 oz fresh espresso (single shot, 9g in / ~1 oz out)',
      '½ oz Kahlua',
      '¼ oz simple syrup',
    ],
    steps: [
      'Pull a fresh espresso, let cool 60 seconds',
      'Combine all in shaker with ice',
      'Shake very hard, 15 seconds (this builds the foam)',
      'Double-strain into chilled coupe',
      'Float 3 coffee beans on foam',
    ],
  },
  'GOLD COAST': {
    glass: 'coupe',
    glassLabel: 'chilled coupe',
    garnish: 'lemon twist (expressed and discarded)',
    ingredients: [
      '2 oz Rittenhouse rye',
      '¾ oz honey syrup (3:1 honey:water)',
      '¾ oz fresh lemon juice',
      '½ oz hazy IPA (float)',
    ],
    steps: [
      'Combine bourbon, honey syrup, lemon in shaker with ice',
      'Shake hard, 12 seconds',
      'Double-strain into chilled coupe',
      'Gently pour IPA over the back of a bar spoon for the float',
      'Express lemon peel, discard',
    ],
  },
  'GARDEN MULE': {
    glass: 'highball',
    glassLabel: 'highball, one large round cube',
    garnish: 'berry skewer + mint sprig',
    ingredients: [
      '2 oz Esme gin',
      '4–5 mixed berries (blackberry, raspberry, strawberry)',
      '¾ oz fresh lime juice',
      '2 oz hibiscus ginger beer',
      '1 oz tonic water',
    ],
    steps: [
      'Muddle berries gently in shaker (don\'t pulverize)',
      'Add gin, lime, ice; shake briefly, 8 seconds',
      'Double-strain into highball over one large round cube',
      'Top with hibiscus ginger beer, then tonic',
      'Slap mint sprig, garnish with berry skewer',
    ],
  },
  'NEGRONI': {
    glass: 'rocks',
    glassLabel: 'rocks glass, large cube',
    garnish: 'orange peel, expressed',
    ingredients: [
      '1 oz gin',
      '1 oz Campari',
      '1 oz sweet vermouth',
    ],
    steps: [
      'Combine all in mixing glass with ice',
      'Stir 25 seconds',
      'Strain over large cube in rocks glass',
      'Express orange peel, drop in',
    ],
  },
  'HOUSE HIGHBALL': {
    glass: 'highball',
    glassLabel: 'highball, lots of ice',
    garnish: 'citrus to match (lemon for bourbon/gin, lime for vodka/rum)',
    ingredients: [
      '2 oz spirit (your choice)',
      '4 oz soda water (or topo chico)',
      '¼ oz citrus to match',
    ],
    steps: [
      'Fill highball with ice',
      'Pour spirit',
      'Top with soda',
      'Squeeze citrus, drop wedge in',
    ],
  },
};
