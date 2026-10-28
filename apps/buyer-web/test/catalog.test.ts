import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOG, CATALOG_CATEGORIES, catalogItems, matchCatalogItem } from '../lib/catalog/data';
import {
  bagsForKg, brassToCft, bulkFromBrass, bulkFromTonnes, coilsForMetres, cftToBrass, cftToM3, m3ToCft, tmtBarsForKg, tmtKgPerBar, tmtKgPerMetre,
} from '../lib/catalog/units';

const LIVE_CATEGORY_SLUGS = [
  'cement-concrete', 'bricks-blocks', 'sand-aggregates', 'steel-tmt-bars', 'plumbing',
  'electricals', 'paints-chemicals', 'plywood-timber', 'machines-tools', 'tiles-flooring',
];

describe('trade unit conversions', () => {
  it('1 brass is 100 cft and about 2.83 m³', () => {
    expect(brassToCft(1)).toBe(100);
    expect(cftToBrass(100)).toBe(1);
    expect(cftToM3(100)).toBeCloseTo(2.8317, 3);
    expect(m3ToCft(1)).toBeCloseTo(35.3147, 3);
  });

  it('round-trips sand between tonnes and brass at 1.6 t/m³', () => {
    const fromBrass = bulkFromBrass(1, 1.6);
    expect(fromBrass.tonnes).toBeCloseTo(4.53, 2);
    expect(bulkFromTonnes(fromBrass.tonnes, 1.6).brass).toBeCloseTo(1, 6);
  });

  it('weighs TMT bars with D²/162', () => {
    expect(tmtKgPerMetre(8)).toBeCloseTo(0.395, 3);
    expect(tmtKgPerMetre(12)).toBeCloseTo(0.889, 3);
    expect(tmtKgPerBar(12)).toBeCloseTo(10.67, 2);
    expect(tmtBarsForKg(tmtKgPerBar(16) * 50, 16)).toBeCloseTo(50, 6);
  });

  it('rounds bags and coils up to whole units', () => {
    expect(bagsForKg(1000, 50)).toBe(20);
    expect(bagsForKg(1010, 50)).toBe(21);
    expect(coilsForMetres(90, 90)).toBe(1);
    expect(coilsForMetres(91, 90)).toBe(2);
  });
});

describe('material catalogue', () => {
  it('has unique ids', () => {
    const ids = CATALOG.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers every live category with a photo and at least three material types', () => {
    for (const slug of LIVE_CATEGORY_SLUGS) {
      const meta = CATALOG_CATEGORIES.find((c) => c.slug === slug);
      expect(meta, slug).toBeDefined();
      expect(existsSync(join(__dirname, '..', 'public', meta!.photo)), meta!.photo).toBe(true);
      expect(catalogItems(slug).length, slug).toBeGreaterThanOrEqual(3);
    }
  });

  it('puts every item in a known category and group, with an existing image', () => {
    for (const item of CATALOG) {
      const meta = CATALOG_CATEGORIES.find((c) => c.slug === item.categorySlug);
      expect(meta, item.id).toBeDefined();
      expect(meta!.groups, item.id).toContain(item.group);
      expect(existsSync(join(__dirname, '..', 'public', item.image)), item.image).toBe(true);
      expect(item.soldAs.length, item.id).toBeGreaterThan(0);
    }
  });

  it('never carries prices, stock or delivery promises', () => {
    const text = JSON.stringify(CATALOG) + JSON.stringify(CATALOG_CATEGORIES);
    expect(text).not.toMatch(/₹|\brs\.?\s?\d|\binr\b|in stock|same.day|guarantee|cheapest|best price|—/i);
  });

  it('matches supplier listings to their material type', () => {
    expect(matchCatalogItem('UltraTech OPC 53 Grade Cement 50kg', 'cement-concrete')?.id).toBe('opc-53-cement');
    expect(matchCatalogItem('M Sand for concrete (per tonne)', 'sand-aggregates')?.id).toBe('m-sand');
    expect(matchCatalogItem('TATA Tiscon TMT 12mm Fe550D', 'steel-tmt-bars')?.id).toBe('tmt-bars');
    expect(matchCatalogItem('Something unrelated', 'plumbing')).toBeUndefined();
  });
});

describe('matching real listing names', () => {
  it('tells M-sand, P-sand and jelly apart', () => {
    expect(matchCatalogItem('Manufactured Sand (M-Sand)', 'sand-aggregates')?.id).toBe('m-sand');
    expect(matchCatalogItem('Plastering Sand (P-Sand)', 'sand-aggregates')?.id).toBe('p-sand');
    expect(matchCatalogItem('20mm Crushed Stone (Kapchi)', 'sand-aggregates')?.id).toBe('jelly-aggregate');
    expect(matchCatalogItem('10mm to 12mm Stone Chips', 'sand-aggregates')?.id).toBe('jelly-aggregate');
  });

  it('recognises bricks and blocks by trade names', () => {
    expect(matchCatalogItem('Wire-Cut Red Bricks', 'bricks-blocks')?.id).toBe('red-clay-bricks');
    expect(matchCatalogItem('Table-Molded Clay Bricks', 'bricks-blocks')?.id).toBe('red-clay-bricks');
    expect(matchCatalogItem('Cement Solid Blocks 6"x8"x16"', 'bricks-blocks')?.id).toBe('solid-concrete-blocks');
  });
});
