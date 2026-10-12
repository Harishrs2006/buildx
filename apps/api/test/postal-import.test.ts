import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { startDb, stopDb, clearDb } from './helpers';
import { parseCsv } from '../src/features/locations/csv';
import { importPostalDirectory, mapHeaders } from '../src/features/locations/postal-import';
import { lookupPincode } from '../src/features/locations/postal-directory.service';
import { PostalOffice } from '../src/infrastructure/database/models/PostalOffice.model';
import { PostalDataset } from '../src/infrastructure/database/models/PostalDataset.model';
import { HEADER_RECENT, ROWS_RECENT, HEADER_LEGACY, ROWS_LEGACY, csv, chunked } from './fixtures/postal';

async function rows(text: string, size?: number) {
  const out: string[][] = [];
  for await (const r of parseCsv(chunked(text, size))) out.push(r);
  return out;
}

const importText = (text: string, version: string, dryRun = false) =>
  importPostalDirectory({ source: chunked(text, 64), sourceFile: 'test.csv', version, dryRun });

describe('CSV parser', () => {
  it('handles quotes, escaped quotes, embedded commas/newlines, CRLF, BOM and blank lines', async () => {
    const text = '﻿a,b,c\r\n"x, y","say ""hi""","multi\nline"\r\n\r\n1,,3';
    for (const size of [1, 3, 1000]) {
      expect(await rows(text, size)).toEqual([
        ['a', 'b', 'c'],
        ['x, y', 'say "hi"', 'multi\nline'],
        ['1', '', '3'],
      ]);
    }
  });

  it('rejects a file that ends inside a quoted field', async () => {
    await expect(rows('a,"unterminated\n')).rejects.toThrow(/quoted field/);
  });
});

describe('header mapping', () => {
  it('accepts both known header styles regardless of case/order', () => {
    expect(mapHeaders(HEADER_RECENT.split(','))).toMatchObject({ pincode: 4, officeName: 3, district: 7, state: 8, lat: 9, lng: 10 });
    expect(mapHeaders(HEADER_LEGACY.split(','))).toMatchObject({ pincode: 1, officeName: 0, district: 8, state: 9, taluk: 7 });
  });

  it('fails loudly when a required column is missing', () => {
    expect(() => mapHeaders(['officename', 'pincode', 'statename'])).toThrow(/missing required column\(s\): district/);
  });
});

describe('importing a directory release', () => {
  beforeAll(startDb);
  afterAll(stopDb);
  beforeEach(async () => {
    vi.restoreAllMocks();
    await clearDb();
  });

  it('imports, activates and serves the recent header style', async () => {
    const result = await importText(csv(HEADER_RECENT, ROWS_RECENT), '2025-06');
    expect(result).toMatchObject({ rowsRead: 6, rowsImported: 6, rowsSkipped: 0, pincodeCount: 4, hasCoordinates: true, activated: true });
    const ds = await PostalDataset.findOne({ version: '2025-06' }).lean();
    expect(ds).toMatchObject({ status: 'READY', active: true, rowsImported: 6 });
    expect(ds!.sha256).toMatch(/^[0-9a-f]{64}$/);

    const lookup = await lookupPincode('110001');
    expect(lookup).toMatchObject({ district: 'NEW DELHI', state: 'DELHI', hasDeliveryOffice: true });
    expect(lookup!.postOffices.map((o) => o.name)).toEqual(['Connaught Place, Main S.O', 'Parliament House S.O']);
    // "NA" coordinates are ignored, real ones averaged
    expect(lookup!.approxLocation).toEqual({ lat: 28.6315, lng: 77.2167 });
  });

  it('imports the legacy header style without coordinates', async () => {
    const result = await importText(csv(HEADER_LEGACY, ROWS_LEGACY, '\r\n'), 'legacy-1');
    expect(result).toMatchObject({ rowsImported: 2, hasCoordinates: false });
    expect(await lookupPincode('734001')).toMatchObject({ district: 'Darjiling', state: 'West Bengal', approxLocation: null });
  });

  it('a dry run validates without writing anything', async () => {
    const result = await importText(csv(HEADER_RECENT, ROWS_RECENT), 'dry', true);
    expect(result).toMatchObject({ rowsImported: 6, activated: false, dryRun: true });
    expect(await PostalOffice.countDocuments()).toBe(0);
    expect(await PostalDataset.countDocuments()).toBe(0);
  });

  it('skips a few malformed rows but aborts when too many are bad', async () => {
    const good = Array.from({ length: 199 }, (_, i) => `C,R,D,Office ${i},${560100 + i},S.O,Delivery,DIST,STATE,,`);
    const ok = await importText(csv(HEADER_RECENT, [...good, 'C,R,D,Bad,12345,S.O,Delivery,DIST,STATE,,']), 'tolerant');
    expect(ok).toMatchObject({ rowsSkipped: 1, rowsImported: 199 });

    const bad = [...good.slice(0, 10), ...Array.from({ length: 5 }, () => 'C,R,D,Bad,0ABCDE,S.O,Delivery,DIST,STATE,,')];
    await expect(importText(csv(HEADER_RECENT, bad), 'broken')).rejects.toThrow(/invalid/);
    expect(await PostalDataset.findOne({ version: 'broken' }).lean()).toMatchObject({ status: 'FAILED', active: false });
    expect(await PostalOffice.countDocuments({ datasetVersion: 'broken' })).toBe(0);
    // The previously active version keeps serving
    expect((await PostalDataset.findOne({ active: true }).lean())!.version).toBe('tolerant');
  });

  it('switches lookups to a new release only once it is complete, and keeps the old one', async () => {
    await importText(csv(HEADER_RECENT, ROWS_RECENT), 'v1');
    expect(await lookupPincode('734001')).toBeNull();

    // A failing release (wrong file) leaves v1 active
    await expect(importText('foo,bar\n1,2\n', 'v2-bad')).rejects.toThrow(/missing required/);
    expect((await PostalDataset.findOne({ active: true }).lean())!.version).toBe('v1');

    await importText(csv(HEADER_LEGACY, ROWS_LEGACY), 'v2');
    expect(await lookupPincode('734001')).not.toBeNull();
    expect(await lookupPincode('110001')).toBeNull(); // not in v2
    expect(await PostalDataset.countDocuments({ active: true })).toBe(1);
    expect(await PostalOffice.countDocuments({ datasetVersion: 'v1' })).toBe(6); // kept for rollback
  });

  it('refuses to overwrite an imported version, but can retry a failed one', async () => {
    await importText(csv(HEADER_RECENT, ROWS_RECENT), 'once');
    await expect(importText(csv(HEADER_RECENT, ROWS_RECENT), 'once')).rejects.toThrow(/already imported/);

    await expect(importText('foo\n1\n', 'retry')).rejects.toThrow();
    const retried = await importText(csv(HEADER_LEGACY, ROWS_LEGACY), 'retry');
    expect(retried.activated).toBe(true);
    expect(await PostalOffice.countDocuments({ datasetVersion: 'retry' })).toBe(2);
  });
});
