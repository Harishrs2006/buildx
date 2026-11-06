import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { CATALOG, CATALOG_CATEGORIES, catalogItem } from '../src/catalog/data';
import { ROOMS, room, roomSections, roomsFor } from '../src/catalog/rooms';
import { searchCatalog } from '../src/catalog/search';

const PUBLIC = path.join(__dirname, '../../../apps/buyer-web/public');

describe('catalogue data', () => {
  it('has unique ids and category slugs', () => {
    const ids = CATALOG.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    const slugs = CATALOG_CATEGORIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('puts every item in a known category and one of its groups', () => {
    for (const item of CATALOG) {
      const category = CATALOG_CATEGORIES.find((c) => c.slug === item.categorySlug);
      expect(category, item.id).toBeDefined();
      expect(category!.groups, item.id).toContain(item.group);
    }
  });

  it('every category has items and slugs the API would make from its name', () => {
    for (const c of CATALOG_CATEGORIES) {
      expect(CATALOG.some((i) => i.categorySlug === c.slug), c.slug).toBe(true);
      // apps/api slugify: lower case, runs of other characters become one hyphen
      expect(c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), c.name).toBe(c.slug);
    }
  });

  it('every photo and illustration exists', () => {
    for (const c of CATALOG_CATEGORIES) expect(fs.existsSync(path.join(PUBLIC, c.photo)), c.photo).toBe(true);
    for (const i of CATALOG) expect(fs.existsSync(path.join(PUBLIC, i.image)), i.image).toBe(true);
    for (const r of ROOMS) expect(fs.existsSync(path.join(PUBLIC, r.photo)), r.photo).toBe(true);
  });

  it('made-to-order items explain how the date is set', () => {
    for (const i of CATALOG.filter((x) => x.madeToOrder)) expect(i.note, i.id).toMatch(/confirm/i);
  });
});

describe('rooms', () => {
  it('only lists catalogue items that exist', () => {
    for (const r of ROOMS) {
      for (const s of r.sections) for (const id of s.itemIds) expect(catalogItem(id), `${r.slug}: ${id}`).toBeDefined();
    }
  });

  it('resolves sections and reverse links', () => {
    const kitchen = room('kitchen')!;
    expect(roomSections(kitchen)[0].items[0].id).toBe('modular-kitchen');
    expect(roomsFor('gypsum-false-ceiling').map((r) => r.slug)).toEqual(expect.arrayContaining(['bedroom', 'living-dining']));
    expect(room('garage')).toBeUndefined();
  });
});

describe('search finds the new interiors', () => {
  it.each([
    ['wardrobe', 'wardrobes'],
    ['mangalore tiles', 'clay-roof-tiles'],
    ['false ceiling', 'gypsum-false-ceiling'],
    ['hinges', 'cabinet-hinges'],
    ['upvc window', 'upvc-windows'],
    ['mandir', 'pooja-units'],
  ])('%s', (q, id) => {
    expect(searchCatalog(q).items.map((i) => i.id)).toContain(id);
  });
});
