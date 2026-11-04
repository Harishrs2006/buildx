// Renders the Sthiva app icons from the owner's logo artwork (docs/brand/sthiva-logo-original.png, vectorised in
// packages/web-core/src/brand/SthivaLogo.tsx). Usage, from apps/mobile: node scripts/make-icons.cjs <path-to-sharp>
const sharp = require(process.argv[2] || 'sharp');
const YELLOW = '#F3B806', INK = '#1B1B19', WHITE = '#FBFAF6', DARK = '#0B0C0A';
const TOP = 'M1128 318 H588 A270 270 0 0 0 588 858 H741 V678 H588 A90 90 0 0 1 588 498 H1128 Z';
const BOTTOM = 'M796 678 H948 A270 270 0 0 1 948 1218 H408 V1038 H948 A90 90 0 0 0 948 858 H796 Z';
// The S spans 900 of the 1536 artwork canvas. `s` = share of the icon the S should take.
function icon({ bg, tile, s, top, bottom }) {
  const size = 1024, art = (size * s * 1536) / 900, off = (size - art) / 2;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : ''}
    <svg x="${off}" y="${off}" width="${art}" height="${art}" viewBox="0 0 1536 1536">
      ${tile ? `<rect width="1536" height="1536" rx="340" fill="${tile}"/>` : ''}
      <path d="${TOP}" fill="${top}"/><path d="${BOTTOM}" fill="${bottom}"/></svg></svg>`);
}
const png = (o, f) => sharp(icon(o)).png().toFile(f);
(async () => {
  // Sthiva (buyers): the logo as designed, yellow with ink and white S
  await png({ bg: YELLOW, s: 0.586, top: INK, bottom: WHITE }, 'assets/icon.png');
  await png({ bg: null, s: 0.42, top: INK, bottom: WHITE }, 'assets/android-icon-foreground.png'); // bg colour in app.json
  await png({ bg: null, s: 0.42, top: '#000000', bottom: '#000000' }, 'assets/android-icon-monochrome.png');
  await png({ bg: null, tile: YELLOW, s: 0.3, top: INK, bottom: WHITE }, 'assets/splash-icon.png');
  // Sthiva Partner (suppliers, drivers): same S on ink, top half yellow
  await png({ bg: DARK, s: 0.586, top: YELLOW, bottom: WHITE }, 'assets/partner/icon.png');
  await png({ bg: null, s: 0.42, top: YELLOW, bottom: WHITE }, 'assets/partner/android-icon-foreground.png');
  console.log('icons written');
})();
