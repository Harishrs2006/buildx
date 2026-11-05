// Renders the Sthiva app icons from the brand mark (docs/brand; shapes in src/constants/brand.ts).
// Usage, from apps/mobile: node scripts/make-icons.cjs <path-to-sharp>
const sharp = require(process.argv[2] || 'sharp');
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/../src/constants/brand.ts', 'utf8');
const pick = (k) => src.match(new RegExp(`${k}: '([^']+)'`))[1];
const HEX = pick('hex'), CURVE = pick('curve'), LEFT = pick('left');
const YELLOW = '#F3B806', INK = '#1B1B19', WHITE = '#FAF8F3', DARK = '#0B0C0A';
let n = 0;
// `s` = share of the icon the mark's 1256-unit box takes
function icon({ bg, s, left, right }) {
  const size = 1024, inner = size * s, off = (size - inner) / 2, id = 'm' + n++;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : ''}
    <svg x="${off}" y="${off}" width="${inner}" height="${inner}" viewBox="140 140 1256 1256">
      <defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="1536" height="1536">
        <polygon points="${HEX}" fill="#fff" stroke="none"/>
        <path d="${CURVE}" fill="none" stroke="#000" stroke-width="48"/></mask></defs>
      <g mask="url(#${id})"><rect width="1536" height="1536" fill="${right}"/><path d="${LEFT}" fill="${left}"/></g></svg></svg>`);
}
const png = (o, f) => sharp(icon(o)).png().toFile(f);
(async () => {
  // Sthiva (buyers): yellow, mark in ink and white
  await png({ bg: YELLOW, s: 0.74, left: INK, right: WHITE }, 'assets/icon.png');
  await png({ bg: null, s: 0.56, left: INK, right: WHITE }, 'assets/android-icon-foreground.png'); // bg colour in app.json
  await png({ bg: null, s: 0.56, left: '#000000', right: '#000000' }, 'assets/android-icon-monochrome.png');
  await png({ bg: null, s: 0.42, left: WHITE, right: YELLOW }, 'assets/splash-icon.png'); // dark splash
  // Sthiva Partner (sellers, drivers): ink, mark in white and yellow
  await png({ bg: DARK, s: 0.74, left: WHITE, right: YELLOW }, 'assets/partner/icon.png');
  await png({ bg: null, s: 0.56, left: WHITE, right: YELLOW }, 'assets/partner/android-icon-foreground.png');
  // Sthiva Driver (delivery partners): light, mark in ink and yellow
  fs.mkdirSync('assets/driver', { recursive: true });
  await png({ bg: WHITE, s: 0.74, left: INK, right: YELLOW }, 'assets/driver/icon.png');
  await png({ bg: null, s: 0.56, left: INK, right: YELLOW }, 'assets/driver/android-icon-foreground.png');
  console.log('icons written');
})();
