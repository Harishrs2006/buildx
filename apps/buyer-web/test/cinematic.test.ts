import { describe, it, expect } from 'vitest';
import { pickMotionTier, type DeviceSignals } from '../components/cinematic/motionTier';
import { CHAPTERS, LAST_CHAPTER, chapterRamp, chapterWeight, photoUrl, resolveChapterLinks } from '../components/cinematic/chapters';

const desktop: DeviceSignals = {
  reducedMotion: false,
  coarsePointer: false,
  viewportWidth: 1440,
  cores: 8,
  memoryGb: 8,
  saveData: false,
  webgl: true,
};

describe('pickMotionTier', () => {
  it('gives capable desktops the full WebGL story', () => {
    expect(pickMotionTier(desktop)).toBe('full');
  });

  it('respects prefers-reduced-motion above everything else', () => {
    expect(pickMotionTier({ ...desktop, reducedMotion: true })).toBe('static');
    expect(pickMotionTier({ ...desktop, reducedMotion: true, webgl: false, coarsePointer: true })).toBe('static');
  });

  it('falls back to stills on phones and tablets', () => {
    expect(pickMotionTier({ ...desktop, coarsePointer: true })).toBe('lite');
    expect(pickMotionTier({ ...desktop, viewportWidth: 390 })).toBe('lite');
  });

  it('falls back to stills on low-power devices, data saver or no WebGL', () => {
    expect(pickMotionTier({ ...desktop, cores: 2 })).toBe('lite');
    expect(pickMotionTier({ ...desktop, memoryGb: 2 })).toBe('lite');
    expect(pickMotionTier({ ...desktop, saveData: true })).toBe('lite');
    expect(pickMotionTier({ ...desktop, webgl: false })).toBe('lite');
  });

  it('does not penalise browsers that hide cores or memory', () => {
    expect(pickMotionTier({ ...desktop, cores: undefined, memoryGb: undefined })).toBe('full');
  });
});

describe('chapters', () => {
  const api = [
    { slug: 'cement-concrete', name: 'Cement & Concrete' },
    { slug: 'steel-tmt-bars', name: 'Steel & TMT Bars' },
  ];

  it('starts with the hero and ends with the final call to action', () => {
    expect(CHAPTERS[0].id).toBe('hero');
    expect(CHAPTERS[LAST_CHAPTER].id).toBe('skyline');
  });

  it('only puts chapters that have a photo into the story', () => {
    expect(CHAPTERS.length).toBeGreaterThanOrEqual(3);
    for (const c of CHAPTERS) expect(c.photo).toMatch(/^\/cinematic\/[a-z-]+\.(jpg|webp|png)$/);
  });

  it('serves photos through the image optimiser', () => {
    expect(photoUrl('/cinematic/hero.jpg', 1200)).toBe('/_next/image?url=%2Fcinematic%2Fhero.jpg&w=1200&q=78');
  });

  it('links only to categories the API returned, with the API name', () => {
    const trucks = CHAPTERS.find((c) => c.id === 'trucks')!;
    expect(resolveChapterLinks(trucks, api)).toEqual([{ slug: 'steel-tmt-bars', name: 'Steel & TMT Bars' }]);
  });

  it('shows no category buttons when categories failed to load', () => {
    for (const c of CHAPTERS) expect(resolveChapterLinks(c, null)).toEqual([]);
  });

  it('has no ranking or invented claims in its copy', () => {
    const copy = CHAPTERS.map((c) => `${c.eyebrow} ${c.title} ${c.accent ?? ''} ${c.body}`).join(' ');
    expect(copy).not.toMatch(/#1|no\.?\s?1|best|fastest|guarantee|certified|\d+\s?(min|hour|day)s?\b|—/i);
  });

  it('weights and ramps stay within 0..1', () => {
    for (let p = 0; p <= LAST_CHAPTER; p += 0.25) {
      for (let i = 0; i <= LAST_CHAPTER; i++) {
        expect(chapterWeight(p, i)).toBeGreaterThanOrEqual(0);
        expect(chapterWeight(p, i)).toBeLessThanOrEqual(1);
        expect(chapterRamp(p, i)).toBeGreaterThanOrEqual(0);
        expect(chapterRamp(p, i)).toBeLessThanOrEqual(1);
      }
    }
    expect(chapterWeight(3, 3)).toBe(1);
  });
});
