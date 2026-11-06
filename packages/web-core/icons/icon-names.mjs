// Build-time helper: which Material Symbols icons a site uses, so it downloads only those glyphs.
// The full icon font is about 2.3 MB and blocks the first paint on phones; a subset is a few KB.
//
// Icons are written as ligature text (<span className="material-symbols-outlined">search</span>) or
// passed around as strings ({ icon: 'storefront' }). So every lowercase word in quotes or alone between
// tags is collected and kept only if it is a real icon name. Extra matches cost nothing; a missed name
// would show as plain text, which is why the scan is broad. Names list: material-symbol-names.json from
// https://fonts.google.com/metadata/icons?key=material_symbols (refresh it when adding a brand-new icon).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ALL = new Set(JSON.parse(fs.readFileSync(path.join(here, 'material-symbol-names.json'), 'utf8')));
const WEB_CORE_SRC = path.join(here, '..', 'src');

const PATTERNS = [/['"`]([a-z][a-z0-9_]*)['"`]/g, />\s*([a-z][a-z0-9_]*)\s*</g, /^\s*([a-z][a-z0-9_]*)\s*$/gm];

function walk(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?|mdx?)$/.test(entry.name)) out.push(full);
  }
}

/** Sorted, comma-separated icon names used by the app in appDir (plus shared web-core code). */
export function iconNames(appDir) {
  const files = [];
  for (const sub of ['app', 'components', 'lib', 'src']) walk(path.join(appDir, sub), files);
  walk(WEB_CORE_SRC, files);
  const used = new Set();
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const re of PATTERNS) for (const m of text.matchAll(re)) if (ALL.has(m[1])) used.add(m[1]);
  }
  return [...used].sort().join(',');
}
