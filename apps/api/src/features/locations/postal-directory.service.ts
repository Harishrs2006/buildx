import { PostalOffice } from '../../infrastructure/database/models/PostalOffice.model';
import { PostalDataset } from '../../infrastructure/database/models/PostalDataset.model';

// Indian PIN codes: six digits, first digit 1-9.
export const PINCODE_RE = /^[1-9]\d{5}$/;

// GODL requires attribution of the provider and source wherever the data is published.
export const POSTAL_ATTRIBUTION = 'All India Pincode Directory, Department of Posts, Government of India (data.gov.in, GODL-India)';

export class PostalLookupUnavailable extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'PostalLookupUnavailable';
  }
}

export type PostalLookup = {
  pincode: string;
  district: string;        // most common district across the PIN's offices
  state: string;
  districts: string[];     // a PIN occasionally spans districts
  hasDeliveryOffice: boolean;
  postOffices: {
    name: string;
    officeType?: string;
    deliveryStatus?: string;
    taluk?: string;
    division?: string;
  }[];
  // Average of office coordinates when the release has them — approximate, never used
  // to decide serviceability
  approxLocation: { lat: number; lng: number } | null;
  source: { attribution: string; datasetVersion: string };
};

function mostCommon(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}

/**
 * Postal validity only: tells you whether India Post knows this PIN and what is there.
 * It says nothing about whether BuildX delivers to it — that is a separate check.
 *
 * @returns the lookup, or null when the PIN is not in the directory
 * @throws PostalLookupUnavailable when no directory is loaded or the DB can't be read
 */
export async function lookupPincode(pincode: string): Promise<PostalLookup | null> {
  if (!PINCODE_RE.test(pincode)) throw new RangeError('Invalid PIN code format');

  let dataset;
  let offices;
  try {
    dataset = await PostalDataset.findOne({ active: true }).select('version').lean();
    if (!dataset) throw new PostalLookupUnavailable('No postal directory has been imported');
    offices = await PostalOffice.find({ datasetVersion: dataset.version, pincode }).lean();
  } catch (err) {
    if (err instanceof PostalLookupUnavailable) throw err;
    throw new PostalLookupUnavailable('Postal directory could not be read');
  }
  if (offices.length === 0) return null;

  const located = offices.filter((o) => o.location);
  const approxLocation = located.length
    ? {
        lat: Math.round((located.reduce((s, o) => s + o.location!.lat, 0) / located.length) * 1e5) / 1e5,
        lng: Math.round((located.reduce((s, o) => s + o.location!.lng, 0) / located.length) * 1e5) / 1e5,
      }
    : null;

  return {
    pincode,
    district: mostCommon(offices.map((o) => o.district)),
    state: mostCommon(offices.map((o) => o.state)),
    districts: [...new Set(offices.map((o) => o.district))].sort(),
    hasDeliveryOffice: offices.some((o) => /^delivery$/i.test(o.deliveryStatus ?? '')),
    postOffices: offices
      .map((o) => ({
        name: o.officeName,
        officeType: o.officeType,
        deliveryStatus: o.deliveryStatus,
        taluk: o.taluk,
        division: o.division,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    approxLocation,
    source: { attribution: POSTAL_ATTRIBUTION, datasetVersion: dataset.version },
  };
}

export type PincodeSummary = { pincode: string; district: string; state: string; hasDeliveryOffice: boolean };

/**
 * Batch postal check (one query) for validating supplier coverage lists.
 * Returns a map containing only the PINs found in the active directory.
 * @throws PostalLookupUnavailable when no directory is loaded or the DB can't be read
 */
export async function summarisePincodes(pincodes: string[]): Promise<Map<string, PincodeSummary>> {
  const unique = [...new Set(pincodes)].filter((p) => PINCODE_RE.test(p));
  let rows: { _id: string; districts: string[]; states: string[]; deliveries: (string | null)[] }[];
  try {
    const dataset = await PostalDataset.findOne({ active: true }).select('version').lean();
    if (!dataset) throw new PostalLookupUnavailable('No postal directory has been imported');
    if (unique.length === 0) return new Map();
    rows = await PostalOffice.aggregate([
      { $match: { datasetVersion: dataset.version, pincode: { $in: unique } } },
      { $group: { _id: '$pincode', districts: { $push: '$district' }, states: { $push: '$state' }, deliveries: { $push: '$deliveryStatus' } } },
    ]);
  } catch (err) {
    if (err instanceof PostalLookupUnavailable) throw err;
    throw new PostalLookupUnavailable('Postal directory could not be read');
  }
  return new Map(rows.map((r) => [r._id, {
    pincode: r._id,
    district: mostCommon(r.districts),
    state: mostCommon(r.states),
    hasDeliveryOffice: r.deliveries.some((d) => /^delivery$/i.test(d ?? '')),
  }]));
}
