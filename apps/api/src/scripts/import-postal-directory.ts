/**
 * Import a release of the India Post "All India Pincode Directory" into MongoDB.
 *
 * Source: data.gov.in — "All India Pincode Directory till last month" (Department of Posts,
 * Government Open Data License – India; updated monthly). Download the CSV from data.gov.in
 * yourself, then:
 *
 *   npm run import-postal --workspace=apps/api -- --file ./pincode.csv --version 2025-06 --dry-run
 *   npm run import-postal --workspace=apps/api -- --file ./pincode.csv --version 2025-06 --yes
 *
 * The new version only becomes active once every row is in; until then lookups keep using the
 * previous version. Older versions are kept for rollback.
 *
 * Uses MONGODB_URI from the environment — check which database you are pointing at.
 */
import { createReadStream, existsSync } from 'fs';
import { basename } from 'path';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { importPostalDirectory } from '../features/locations/postal-import';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

async function main() {
  const file = arg('file');
  const version = arg('version');
  const dryRun = flag('dry-run');
  if (!file || !version) {
    console.error('Usage: npm run import-postal --workspace=apps/api -- --file <csv> --version <e.g. 2025-06> [--dry-run | --yes]');
    process.exit(1);
  }
  if (!existsSync(file)) throw new Error(`File not found: ${file}`);
  if (!dryRun && !flag('yes')) {
    console.error('Refusing to write without --yes. Run with --dry-run first to check the file.');
    process.exit(1);
  }

  const host = new URL(env.MONGODB_URI.replace(/^mongodb(\+srv)?:/, 'http:')).host;
  console.log(`${dryRun ? '[dry run] ' : ''}Importing ${basename(file)} as version "${version}" into MongoDB at ${host}...`);
  await mongoose.connect(env.MONGODB_URI, { dbName: 'buildx' });

  const result = await importPostalDirectory({
    source: createReadStream(file, { highWaterMark: 1 << 20 }),
    sourceFile: basename(file),
    version,
    dryRun,
  });
  console.log(
    `${result.dryRun ? '[dry run] would import' : '✓ Imported'} ${result.rowsImported} offices ` +
    `(${result.pincodeCount} PIN codes, ${result.rowsSkipped} rows skipped of ${result.rowsRead}; ` +
    `coordinates: ${result.hasCoordinates ? 'yes' : 'no'})${result.activated ? ` — version "${version}" is now active` : ''}`
  );
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch(async (err) => {
    console.error(`import-postal failed: ${err.message}`);
    await mongoose.disconnect();
    process.exit(1);
  });
}
