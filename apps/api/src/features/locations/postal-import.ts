import { createHash } from 'crypto';
import mongoose from 'mongoose';
import { PostalOffice, IPostalOffice } from '../../infrastructure/database/models/PostalOffice.model';
import { PostalDataset } from '../../infrastructure/database/models/PostalDataset.model';
import { parseCsv } from './csv';
import { PINCODE_RE } from './postal-directory.service';

// Releases of the directory spell headers differently ("district" vs "Districtname",
// "delivery" vs "Deliverystatus", optional latitude/longitude). Match case- and
// punctuation-insensitively against known aliases; fail loudly if a required one is missing.
const HEADER_ALIASES: Record<keyof Omit<IPostalOffice, '_id' | 'datasetVersion' | 'location'> | 'lat' | 'lng', string[]> = {
  pincode: ['pincode', 'pin', 'pincodes'],
  officeName: ['officename', 'office', 'postofficename'],
  officeType: ['officetype'],
  deliveryStatus: ['delivery', 'deliverystatus'],
  division: ['divisionname', 'division'],
  region: ['regionname', 'region'],
  circle: ['circlename', 'circle'],
  taluk: ['taluk', 'talukname', 'block'],
  district: ['district', 'districtname'],
  state: ['statename', 'state'],
  lat: ['latitude', 'lat'],
  lng: ['longitude', 'long', 'lng'],
};
const REQUIRED = ['pincode', 'officeName', 'district', 'state'] as const;

// Rough bounding box of India incl. Andaman & Nicobar and Lakshadweep — only used to reject
// obviously wrong coordinates in the source data, never to decide serviceability.
export const INDIA_BBOX = { minLat: 6.0, maxLat: 37.6, minLng: 68.0, maxLng: 97.6 };
export const inIndiaBbox = (lat: number, lng: number) =>
  lat >= INDIA_BBOX.minLat && lat <= INDIA_BBOX.maxLat && lng >= INDIA_BBOX.minLng && lng <= INDIA_BBOX.maxLng;

const MAX_SKIPPED_RATIO = 0.01; // >1% malformed rows means the file isn't what we think it is
const BATCH = 2000;

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');
const clean = (v: string | undefined) => {
  const t = (v ?? '').trim();
  return t === '' || /^(na|n\/a|null|-)$/i.test(t) ? undefined : t;
};

export function mapHeaders(header: string[]): Record<string, number> {
  const idx: Record<string, number> = {};
  const normalised = header.map(norm);
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    const i = normalised.findIndex((h) => aliases.includes(h));
    if (i >= 0) idx[key] = i;
  }
  const missing = REQUIRED.filter((k) => idx[k] === undefined);
  if (missing.length) {
    throw new Error(`CSV is missing required column(s): ${missing.join(', ')}. Header was: ${header.join(', ')}`);
  }
  return idx;
}

export function toOffice(row: string[], idx: Record<string, number>, datasetVersion: string): Omit<IPostalOffice, '_id'> | null {
  const get = (k: string) => (idx[k] === undefined ? undefined : clean(row[idx[k]]));
  const pincode = get('pincode')?.replace(/\s/g, '');
  const officeName = get('officeName');
  const district = get('district');
  const state = get('state');
  if (!pincode || !PINCODE_RE.test(pincode) || !officeName || !district || !state) return null;

  const office: Omit<IPostalOffice, '_id'> = {
    datasetVersion, pincode, officeName, district, state,
    officeType: get('officeType'),
    deliveryStatus: get('deliveryStatus'),
    division: get('division'),
    region: get('region'),
    circle: get('circle'),
    taluk: get('taluk'),
  };
  const lat = Number(get('lat'));
  const lng = Number(get('lng'));
  if (Number.isFinite(lat) && Number.isFinite(lng) && inIndiaBbox(lat, lng)) office.location = { lat, lng };
  return office;
}

export type ImportResult = {
  version: string;
  rowsRead: number;
  rowsImported: number;
  rowsSkipped: number;
  pincodeCount: number;
  hasCoordinates: boolean;
  activated: boolean;
  dryRun: boolean;
};

/**
 * Imports one release into PostalOffice under `version`, then atomically makes it the active
 * dataset. Until activation, lookups keep using the previous version. Previous versions are
 * kept (for rollback) unless pruned separately.
 */
export async function importPostalDirectory(params: {
  source: AsyncIterable<string | Buffer>;
  sourceFile: string;
  version: string;
  dryRun?: boolean;
}): Promise<ImportResult> {
  const { source, sourceFile, version, dryRun = false } = params;

  const existing = await PostalDataset.findOne({ version }).lean();
  if (existing?.status === 'READY') {
    throw new Error(`Dataset version "${version}" is already imported. Use a new version name.`);
  }

  const hash = createHash('sha256');
  async function* hashing() {
    for await (const chunk of source) {
      hash.update(chunk);
      yield chunk;
    }
  }

  if (!dryRun) {
    // Clean up rows left by an earlier failed attempt at this same version
    await PostalOffice.deleteMany({ datasetVersion: version });
    await PostalDataset.updateOne(
      { version },
      { $set: { version, sourceFile, sha256: 'pending', status: 'IMPORTING', active: false, importedAt: new Date() } },
      { upsert: true }
    );
  }

  let idx: Record<string, number> | null = null;
  let rowsRead = 0;
  let rowsImported = 0;
  let rowsSkipped = 0;
  let hasCoordinates = false;
  const pincodes = new Set<string>();
  let batch: Omit<IPostalOffice, '_id'>[] = [];

  const flush = async () => {
    if (batch.length && !dryRun) await PostalOffice.insertMany(batch, { ordered: false });
    rowsImported += batch.length;
    batch = [];
  };

  try {
    for await (const row of parseCsv(hashing())) {
      if (!idx) {
        idx = mapHeaders(row);
        continue;
      }
      rowsRead++;
      const office = toOffice(row, idx, version);
      if (!office) {
        rowsSkipped++;
        continue;
      }
      pincodes.add(office.pincode);
      if (office.location) hasCoordinates = true;
      batch.push(office);
      if (batch.length >= BATCH) await flush();
    }
    await flush();

    if (!idx || rowsRead === 0) throw new Error('CSV has no data rows');
    if (rowsSkipped / rowsRead > MAX_SKIPPED_RATIO) {
      throw new Error(`${rowsSkipped} of ${rowsRead} rows were invalid (> ${MAX_SKIPPED_RATIO * 100}%). Check the file.`);
    }
  } catch (err) {
    if (!dryRun) {
      await PostalOffice.deleteMany({ datasetVersion: version });
      await PostalDataset.updateOne({ version }, { $set: { status: 'FAILED', failureReason: (err as Error).message } });
    }
    throw err;
  }

  const stats = { rowsRead, rowsImported, rowsSkipped, pincodeCount: pincodes.size, hasCoordinates };
  if (dryRun) return { version, ...stats, activated: false, dryRun };

  // Swap the active pointer in one transaction so lookups never see zero or two active datasets
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await PostalDataset.updateMany({ active: true }, { $set: { active: false } }, { session });
      await PostalDataset.updateOne(
        { version },
        { $set: { ...stats, sha256: hash.digest('hex'), status: 'READY', active: true, activatedAt: new Date() } },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }
  return { version, ...stats, activated: true, dryRun };
}
