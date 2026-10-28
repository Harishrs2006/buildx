// The landing page story: one chapter per full-screen scroll step. Chapter 0 is the hero.
// Category links point at slugs from GET /categories; a chapter only shows a button for a
// slug the live API actually returned (see resolveChapterLinks), so nothing here is invented.

export type Vec3 = [number, number, number];

export type Chapter = {
  id: string;
  eyebrow: string;
  title: string;
  accent?: string; // one serif-italic word appended to the title
  body: string;
  categorySlugs: string[];
  camera: { position: Vec3; target: Vec3 };
};

export const CHAPTERS: Chapter[] = [
  {
    id: 'hero',
    eyebrow: 'Construction materials marketplace',
    title: 'Build better.',
    accent: 'Order materials in minutes.',
    body: 'Cement, steel, bricks, tiles, paint, electrical and plumbing from verified suppliers near you.',
    categorySlugs: [],
    camera: { position: [36, 13, 42], target: [0, 7, 0] },
  },
  {
    id: 'trucks',
    eyebrow: 'Delivery',
    title: 'Straight to the',
    accent: 'site gate.',
    body: 'Steel, sand and aggregates from suppliers who have set up delivery to your PIN code.',
    categorySlugs: ['steel-tmt-bars', 'sand-aggregates'],
    camera: { position: [-27, 7, 27], target: [-11, 2, 11] },
  },
  {
    id: 'concrete',
    eyebrow: 'Concrete',
    title: 'Pour with',
    accent: 'confidence.',
    body: 'Cement and concrete with the unit, minimum order and price shown before you order.',
    categorySlugs: ['cement-concrete'],
    camera: { position: [-4, 6.5, 25], target: [2.2, 1.3, 13.6] },
  },
  {
    id: 'bricks',
    eyebrow: 'Masonry',
    title: 'Wall by',
    accent: 'wall.',
    body: 'Red bricks, fly ash bricks, AAC and concrete blocks for every wall on site.',
    categorySlugs: ['bricks-blocks'],
    camera: { position: [27, 6, 15], target: [14, 1.8, 7] },
  },
  {
    id: 'interiors',
    eyebrow: 'Interiors',
    title: 'Floors that',
    accent: 'finish it.',
    body: 'Tiles, flooring, plywood and timber for the rooms people will live and work in.',
    categorySlugs: ['tiles-flooring', 'plywood-timber'],
    camera: { position: [26, 5.5, 1], target: [14.5, 0.8, -6.5] },
  },
  {
    id: 'paint',
    eyebrow: 'Paint',
    title: 'Colour every',
    accent: 'wall.',
    body: 'Paints, primers and finishing chemicals for the final coat.',
    categorySlugs: ['paints-chemicals'],
    camera: { position: [-3, 4.6, -5.6], target: [3.8, 1.8, -14] },
  },
  {
    id: 'electrical',
    eyebrow: 'Electrical',
    title: 'Power and',
    accent: 'light.',
    body: 'Wires, switches and fittings to power every room, from the first circuit to the last bulb.',
    categorySlugs: ['electricals'],
    camera: { position: [-14, 6, -28], target: [-9, 3, -14] },
  },
  {
    id: 'plumbing',
    eyebrow: 'Plumbing',
    title: 'Water, right',
    accent: 'where it belongs.',
    body: 'Pipes, fittings, tanks and pumps, all the way to a hotel-grade bathroom.',
    categorySlugs: ['plumbing'],
    camera: { position: [-27, 5, 3], target: [-16, 1.6, -2] },
  },
  {
    id: 'skyline',
    eyebrow: 'Your project',
    title: 'Your next building',
    accent: 'starts here.',
    body: 'Check which suppliers deliver to your site, then order with cash on delivery.',
    categorySlugs: [],
    camera: { position: [-46, 36, 54], target: [0, 12, 0] },
  },
];

export const LAST_CHAPTER = CHAPTERS.length - 1;

export type ChapterLink = { slug: string; name: string };

// Keep only links to categories the API returned, in the chapter's order
export function resolveChapterLinks(chapter: Chapter, categories: { slug: string; name: string }[] | null): ChapterLink[] {
  if (!categories) return [];
  const bySlug = new Map(categories.map((c) => [c.slug, c.name]));
  return chapter.categorySlugs.flatMap((slug) => {
    const name = bySlug.get(slug);
    return name ? [{ slug, name }] : [];
  });
}

// How "present" chapter i is at story progress p (0 at a distance of one chapter, 1 when centred)
export function chapterWeight(p: number, i: number): number {
  return Math.max(0, 1 - Math.abs(p - i));
}

// 0 -> 1 ramp as the story approaches and settles on chapter i (starts 0.7 before it)
export function chapterRamp(p: number, i: number): number {
  return Math.min(1, Math.max(0, (p - (i - 0.7)) / 0.8));
}
