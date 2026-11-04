// Renders the Sthiva app icons from the S mark (same shapes as packages/web-core/src/brand/SthivaLogo.tsx).
// Usage: node scripts/make-icons.cjs <path-to-sharp-module>   (run from apps/mobile; needs `npm i sharp` somewhere)
const sharp = require(process.argv[2] || 'sharp');
const INK = '#0B0C0A', SAND = '#F2EFE7', LIME = '#C8FF3D', LIME_LIGHT = '#9BCB1F';
const mark = (ink, beam) => `
  <path d="M14 7 H37 V14 H17 V20.5 H11 V10 Q11 7 14 7 Z" fill="${ink}"/>
  <path d="M31 27.5 H37 V38 Q37 41 34 41 H11 V34 H31 Z" fill="${ink}"/>
  <rect x="11" y="20.5" width="26" height="7" rx="1.5" fill="${beam}"/>`;
// The mark spans 11..37 x 7..41 of the 48 grid; `scale` is the share of the canvas the 48 grid takes
function svg({ size, bg, scale, ink, beam }) {
  const inner = size * scale, off = (size - inner) / 2;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : ''}
    <svg x="${off}" y="${off}" width="${inner}" height="${inner}" viewBox="0 0 48 48">${mark(ink, beam)}</svg></svg>`);
}
const png = (opts, file) => sharp(svg({ size: 1024, ...opts })).png().toFile(file);
(async () => {
  // Buyer app (Sthiva): ink S on sand
  await png({ bg: SAND, scale: 0.86, ink: INK, beam: LIME_LIGHT }, 'assets/icon.png');
  await png({ bg: null, scale: 0.62, ink: INK, beam: LIME_LIGHT }, 'assets/android-icon-foreground.png');
  await png({ bg: null, scale: 0.62, ink: '#000000', beam: '#000000' }, 'assets/android-icon-monochrome.png');
  await png({ bg: null, scale: 0.7, ink: SAND, beam: LIME }, 'assets/splash-icon.png');
  // Partner app (Sthiva Partner): sand S on ink
  await png({ bg: INK, scale: 0.86, ink: SAND, beam: LIME }, 'assets/partner/icon.png');
  await png({ bg: null, scale: 0.62, ink: SAND, beam: LIME }, 'assets/partner/android-icon-foreground.png');
  console.log('icons written');
})();
