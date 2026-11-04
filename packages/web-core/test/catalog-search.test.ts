import { describe, expect, it } from 'vitest';
import { searchCatalog } from '../src/catalog/search';

const ids = (q: string) => searchCatalog(q).items.map((i) => i.id);

describe('searchCatalog', () => {
  it('finds cement guides for "cement", not only cement blocks', () => {
    expect(ids('cement')).toEqual(expect.arrayContaining(['opc-53-cement', 'ppc-cement']));
  });

  it('fixes a typo and says so', () => {
    const r = searchCatalog('cemnt');
    expect(r.corrected).toBe(true);
    expect(r.query).toBe('cement');
    expect(r.items.length).toBeGreaterThan(0);
  });

  it('finds TMT bars by trade words', () => {
    expect(ids('TMT')).toContain('tmt-bars');
    expect(ids('sariya')).toContain('tmt-bars');
  });

  it('leaves correct words alone', () => {
    const r = searchCatalog('m sand');
    expect(r.corrected).toBe(false);
    expect(ids('m sand')).toContain('m-sand');
  });

  it('matches a brand to its material', () => {
    expect(ids('ultratech')).toContain('opc-53-cement');
  });

  it('returns nothing for empty or unknown input', () => {
    expect(searchCatalog('').items).toEqual([]);
    expect(searchCatalog('zzzzqqq').items).toEqual([]);
  });
});
