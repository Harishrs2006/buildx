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

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

/** Google Fonts stylesheet address for the icons this site uses. */
export function iconStylesheetUrl(axes, names) {
  return `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:${axes}&icon_names=${names}&display=block`;
}

/**
 * Downloads the icon subset once at build time and serves it from the site itself, so the first paint
 * does not wait for a second connection to Google. Writes public/fonts/icons-<hash>.woff2 and returns the
 * stylesheet with the local address, to inline in <head>. Returns '' if anything fails: the layout then
 * falls back to Google's stylesheet link, so a build never breaks over this.
 */
export async function selfHostIcons(appDir, axes, names) {
  try {
    const { createHash } = await import('node:crypto');
    const cssRes = await fetch(iconStylesheetUrl(axes, names), { headers: { 'User-Agent': CHROME_UA } });
    if (!cssRes.ok) throw new Error(`stylesheet ${cssRes.status}`);
    const css = await cssRes.text();
    const urls = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/g)].map((m) => m[1]);
    if (urls.length !== 1) throw new Error(`expected one font file, got ${urls.length}`);
    const fontRes = await fetch(urls[0]);
    if (!fontRes.ok) throw new Error(`font ${fontRes.status}`);
    const font = Buffer.from(await fontRes.arrayBuffer());
    const file = `icons-${createHash('sha256').update(font).digest('hex').slice(0, 12)}.woff2`;
    const dir = path.join(appDir, 'public', 'fonts');
    fs.mkdirSync(dir, { recursive: true });
    for (const old of fs.readdirSync(dir)) if (/^icons-.*\.woff2$/.test(old) && old !== file) fs.rmSync(path.join(dir, old));
    fs.writeFileSync(path.join(dir, file), font);
    return css.replace(urls[0], `/fonts/${file}`).replace(/\s+/g, ' ').trim();
  } catch (err) {
    console.warn(`[icons] self-hosting skipped, using Google Fonts: ${err.message}`);
    return '';
  }
}
