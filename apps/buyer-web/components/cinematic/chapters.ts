// The landing page story: one chapter per full-screen scroll step. Chapter 0 is the hero.
// Category links point at slugs from GET /categories; a chapter only shows a button for a
// slug the live API actually returned (see resolveChapterLinks), so nothing here is invented.
// Photos live in public/cinematic (see ASSETS.md). A chapter without a photo is left out of
// the story until its photo is added.

export type Chapter = {
  id: string;
  eyebrow: string;
  title: string;
  accent?: string; // serif-italic words appended to the title
  body: string;
  categorySlugs: string[];
  photo?: string;
  // which part of the photo to keep in frame when the screen crops it (CSS object-position)
  focus?: string;
};

const ALL_CHAPTERS: Chapter[] = [
  {
    id: 'hero',
    eyebrow: 'Construction materials marketplace',
    title: 'Build better.',
    accent: 'Order materials in minutes.',
    body: 'Cement, steel, bricks, tiles, paint, electrical and plumbing from verified suppliers near you.',
    categorySlugs: [],
    photo: '/cinematic/hero.jpg',
    focus: '55% 60%',
  },
  {
    id: 'trucks',
    eyebrow: 'Delivery',
    title: 'Straight to the',
    accent: 'site gate.',
    body: 'Steel, sand and aggregates from suppliers who have set up delivery to your PIN code.',
    categorySlugs: ['steel-tmt-bars', 'sand-aggregates'],
    photo: '/cinematic/trucks.jpg',
    focus: '60% 50%',
  },
  {
    id: 'concrete',
    eyebrow: 'Concrete',
    title: 'Pour with',
    accent: 'confidence.',
    body: 'Cement and concrete with the unit, minimum order and price shown before you order.',
    categorySlugs: ['cement-concrete'],
    photo: '/cinematic/concrete.jpg',
    focus: '50% 50%',
  },
  {
    id: 'bricks',
    eyebrow: 'Masonry',
    title: 'Wall by',
    accent: 'wall.',
    body: 'Red bricks, fly ash bricks, AAC and concrete blocks for every wall on site.',
    categorySlugs: ['bricks-blocks'],
    photo: '/cinematic/bricks.jpg',
    focus: '50% 40%',
  },
  {
    id: 'interiors',
    eyebrow: 'Interiors',
    title: 'Floors that',
    accent: 'finish it.',
    body: 'Tiles, flooring, plywood and timber for the rooms people will live and work in.',
    categorySlugs: ['tiles-flooring', 'plywood-timber'],
    photo: '/cinematic/interiors.jpg',
    focus: '55% 50%',
  },
  {
    id: 'paint',
    eyebrow: 'Paint',
    title: 'Colour every',
    accent: 'wall.',
    body: 'Paints, primers and finishing chemicals for the final coat.',
    categorySlugs: ['paints-chemicals'],
    photo: '/cinematic/paint.jpg',
    focus: '38% 55%',
  },
  {
    id: 'electrical',
    eyebrow: 'Electrical',
    title: 'Power and',
    accent: 'light.',
    body: 'Wires, switches and fittings to power every room, from the first circuit to the last bulb.',
    categorySlugs: ['electricals'],
    photo: '/cinematic/electrical.jpg',
    focus: '62% 40%',
  },
  {
    id: 'plumbing',
    eyebrow: 'Plumbing',
    title: 'Water, right',
    accent: 'where it belongs.',
    body: 'Pipes, fittings, tanks and pumps, all the way to a hotel-grade bathroom.',
    categorySlugs: ['plumbing'],
    photo: '/cinematic/plumbing.jpg',
    focus: '48% 55%',
  },
  {
    id: 'skyline',
    eyebrow: 'Your project',
    title: 'Your next building',
    accent: 'starts here.',
    body: 'Check which suppliers deliver to your site, then order with cash on delivery.',
    categorySlugs: [],
    photo: '/cinematic/skyline.jpg',
    focus: '35% 50%',
  },
];

export const CHAPTERS: Chapter[] = ALL_CHAPTERS.filter((c) => c.photo);
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

// Optimised, responsive URL for a chapter photo (Next.js image optimiser, WebP/AVIF when supported)
export function photoUrl(src: string, width: 828 | 1200 | 1920 = 1920, quality = 78): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
}
