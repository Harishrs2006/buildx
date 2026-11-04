import { CATALOG, CATALOG_CATEGORIES } from './data';
import type { CatalogItem } from './types';

// Buyer search over the material catalogue. Supplier listings come from the API; this finds the
// material guides that match, fixes small typos and maps common trade words, so a search for
// "cemnt" or "saria" still lands somewhere useful even when no supplier has listed it yet.

// Everyday words for a material that its catalogue text does not use
const SYNONYMS: Record<string, string> = {
  saria: 'tmt',
  sariya: 'tmt',
  rod: 'tmt',
  rods: 'tmt',
  msand: 'm sand',
  psand: 'p sand',
  ply: 'plywood',
  gitti: 'aggregate',
};

const STOP_WORDS = new Set(['and', 'for', 'the', 'per', 'of', 'in', 'with', 'buy', 'price', 'near', 'me']);

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const singular = (w: string) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);

function itemText(item: CatalogItem): string {
  const category = CATALOG_CATEGORIES.find((c) => c.slug === item.categorySlug)?.name ?? '';
  return normalise([item.name, item.search, ...(item.aliases ?? []), item.group, category, ...item.brands].join(' '));
}

const INDEX = CATALOG.map((item) => ({ item, words: itemText(item).split(' ').map(singular) }));
const VOCABULARY = new Set(INDEX.flatMap((e) => e.words).filter((w) => w.length >= 3));

// Levenshtein distance, stopping early once it passes max
function distance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, row[j]);
    }
    if (best > max) return max + 1;
    prev = row;
  }
  return prev[b.length];
}

function correctWord(word: string): string {
  if (SYNONYMS[word]) return SYNONYMS[word];
  const w = singular(word);
  if (w.length < 4 || VOCABULARY.has(w) || /\d/.test(w)) return word;
  const max = w.length >= 7 ? 2 : 1;
  let best: { word: string; d: number } | undefined;
  for (const v of VOCABULARY) {
    const d = distance(w, v, max);
    if (d <= max && (!best || d < best.d)) best = { word: v, d };
  }
  return best?.word ?? word;
}

export type CatalogSearch = {
  /** The query with typos and trade words fixed; equal to the input when nothing changed */
  query: string;
  corrected: boolean;
  items: CatalogItem[];
};

export function searchCatalog(input: string, limit = 6): CatalogSearch {
  const original = normalise(input);
  const words = original.split(' ').filter(Boolean);
  const fixed = words.map(correctWord);
  const query = fixed.join(' ');
  const terms = query.split(' ').map(singular).filter((w) => w.length > 1 && !STOP_WORDS.has(w));
  if (terms.length === 0) return { query, corrected: false, items: [] };

  const scored = INDEX.map(({ item, words: itemWords }) => {
    const hits = terms.filter((t) => itemWords.some((w) => w === t || (t.length >= 3 && w.startsWith(t)))).length;
    // name hits rank above brand or category hits
    const nameBonus = terms.some((t) => normalise(item.name).includes(t)) ? 0.5 : 0;
    return { item, score: hits / terms.length + nameBonus };
  })
    .filter((s) => s.score >= 0.5)
    .sort((a, b) => b.score - a.score);

  return { query, corrected: query !== original, items: scored.slice(0, limit).map((s) => s.item) };
}
