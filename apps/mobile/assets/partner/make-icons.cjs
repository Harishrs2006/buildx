// BuildX Partner icons: same roof-and-X mark as the buyer app, inverted (sand on ink) with a lime bar
const sharp = require('sharp');
const out = process.argv[2];
const mark = (dark) => `
  <g fill="${dark}"><path d="M140 650 L420 405 L850 370 L570 650 Z"/><path d="M850 370 L860 370 L1328 866 L1314 866 Z"/></g>
  <g fill="#9E9E9E"><path d="M828 418 L856 400 L1294 866 L1256 866 Z"/><path d="M1228 686 H1306 L1086 930 H1008 Z"/><path d="M782 527h46v46h-46zM836 527h46v46h-46zM782 581h46v46h-46zM836 581h46v46h-46z"/></g>`;
function svg({ size, bg, scale }) {
  const inner = size * scale, off = (size - inner) / 2;
  const bar = { w: inner * 0.42, h: size * 0.035 };
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : ''}
    <svg x="${off}" y="${off - size * 0.04}" width="${inner}" height="${inner}" viewBox="134 50 1200 1200">${mark('#F2EFE7')}</svg>
    <rect x="${(size - bar.w) / 2}" y="${off + inner * 0.7}" width="${bar.w}" height="${bar.h}" rx="${bar.h / 2}" fill="#C8FF3D"/>
  </svg>`);
}
(async () => {
  await sharp(svg({ size: 1024, bg: '#0B0C0A', scale: 0.82 })).flatten({ background: '#0B0C0A' }).png().toFile(`${out}/icon.png`);
  await sharp(svg({ size: 1024, bg: null, scale: 0.6 })).png().toFile(`${out}/android-icon-foreground.png`);
  console.log('ok');
})();
