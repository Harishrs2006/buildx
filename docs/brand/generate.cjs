// Sthiva brand kit generator. Writes every logo SVG/PNG, the preview sheet and brand-paths.json (the data behind
// packages/web-core/src/brand/paths.ts). Needs sharp and opentype.js:  npm i --no-save sharp opentype.js
// Usage (from the repo root):  node docs/brand/generate.cjs docs/brand
const path=require('path'), fs=require('fs');
const M=process.env.BRAND_NODE_MODULES ? process.env.BRAND_NODE_MODULES.replace(/\/?$/,'/') : '';
const sharp=require(M+'sharp'), opentype=require(M+'opentype.js');
const FONTS=path.join(__dirname,'../../apps/mobile/assets/fonts')+'/';
const OUT=process.argv[2];
const C={ yellow:'#F3B806', ink:'#1B1B19', white:'#FAF8F3', grey:'#8C8A84' };

// ---- Mark: pointy-top hexagon (bolt head) split by an S into two interlocking halves ----
// 1536 canvas, centre 768, circumradius 600. The S is point-symmetric about the centre.
const HEX='768,168 1288,468 1288,1068 768,1368 248,1068 248,468';
const CURVE='M1184 316 L1002 303 C820 290 630 380 636 560 C640 680 720 740 768 768 C816 796 896 856 900 976 C906 1156 716 1246 534 1233 L352 1220';
const LEFT='M1002 303 C820 290 630 380 636 560 C640 680 720 740 768 768 C816 796 896 856 900 976 C906 1156 716 1246 534 1233 L400 1600 L-100 1600 L-100 -100 L1150 -100 L1150 220 Z';
function markInner(id,left,right){ // the mark as SVG children on the 1536 canvas
  return `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="1536" height="1536">
    <polygon points="${HEX}" fill="#fff" stroke="none"/>
    <path d="${CURVE}" fill="none" stroke="#000" stroke-width="48" stroke-linecap="butt"/></mask></defs>
  <g mask="url(#${id})"><rect x="0" y="0" width="1536" height="1536" fill="${right}"/><path d="${LEFT}" fill="${left}"/></g>`;
}
// ---- Wordmark from real font outlines, tracked ----
function textPath(fontFile,text,size,tracking,x,y){
  const buf=fs.readFileSync(FONTS+fontFile); const f=opentype.parse(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength)); let cx=x, d='';
  for(const ch of text){ const g=f.charToGlyph(ch); d+=g.getPath(cx,y,size).toPathData(2); cx+=g.advanceWidth*size/f.unitsPerEm+tracking*size; }
  return { d, width: cx - x - tracking*size, capH: (f.tables.os2.sCapHeight||700)*size/f.unitsPerEm };
}
// Horizontal lockup: mark (height H) + STHIVA (+ PARTNER line). Returns svg string.
function lockup({ partner=false, bg=null, markL, markR, word, sub }){
  const H=200, gap=56;
  const w=textPath('Geist_700Bold.ttf','STHIVA',partner?118:150,0.16,0,0);
  const mark=`<svg x="0" y="0" width="${H}" height="${H}" viewBox="140 140 1256 1256">${markInner('m'+Math.random().toString(36).slice(2,7),markL,markR)}</svg>`;
  let body, W;
  if(!partner){
    const capH=w.capH, y=(H+capH)/2; const t=textPath('Geist_700Bold.ttf','STHIVA',150,0.16,H+gap,y);
    W=H+gap+t.width+8; body=`<path d="${t.d}" fill="${word}"/>`;
  } else {
    const t1=textPath('Geist_700Bold.ttf','STHIVA',118,0.16,0,0);
    // PARTNER sized so that, with 0.3em tracking, it spans the same width as STHIVA
    const ps=60;
    const p0=textPath('Geist_600SemiBold.ttf','PARTNER',ps,0.36,0,0);
    const lineGap=34, top=(H-(t1.capH+lineGap+p0.capH))/2;
    const a=textPath('Geist_700Bold.ttf','STHIVA',118,0.16,H+gap,top+t1.capH);
    const b=textPath('Geist_600SemiBold.ttf','PARTNER',ps,0.36,H+gap,top+t1.capH+lineGap+p0.capH);
    W=H+gap+Math.max(a.width,b.width)+8; body=`<path d="${a.d}" fill="${word}"/><path d="${b.d}" fill="${sub}"/>`;
  }
  const pad=40;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W+pad*2}" height="${H+pad*2}" viewBox="${-pad} ${-pad} ${W+pad*2} ${H+pad*2}">${bg?`<rect x="${-pad}" y="${-pad}" width="${W+pad*2}" height="${H+pad*2}" fill="${bg}"/>`:''}${mark}${body}</svg>`;
}
// App icon: rounded tile (OS masks it anyway) with the mark
function appIcon({ tile, markL, markR, scale=0.74, rounded=true, size=1024 }){
  const inner=size*scale, off=(size-inner)/2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
   ${tile?`<rect width="${size}" height="${size}" ${rounded?`rx="${size*0.22}"`:''} fill="${tile}"/>`:''}
   <svg x="${off}" y="${off}" width="${inner}" height="${inner}" viewBox="140 140 1256 1256">${markInner('i'+Math.random().toString(36).slice(2,7),markL,markR)}</svg></svg>`;
}
const V={
  'sthiva-logo':            lockup({ markL:C.ink,   markR:C.yellow, word:C.ink }),
  'sthiva-logo-on-dark':    lockup({ markL:C.white, markR:C.yellow, word:C.white }),
  'sthiva-partner-logo':    lockup({ partner:true, markL:C.white, markR:C.yellow, word:C.white, sub:C.yellow }),
  'sthiva-partner-logo-on-light': lockup({ partner:true, markL:C.ink, markR:C.yellow, word:C.ink, sub:'#B98A00' }),
  'sthiva-app-icon':        appIcon({ tile:C.yellow, markL:C.ink, markR:C.white }),
  'sthiva-partner-app-icon':appIcon({ tile:C.ink, markL:C.white, markR:C.yellow }),
  'sthiva-mark':            `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="140 140 1256 1256">${markInner('k',C.ink,C.yellow)}</svg>`,
  'sthiva-partner-mark':    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="140 140 1256 1256">${markInner('p',C.white,C.yellow)}</svg>`,
};
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  for(const [k,svg] of Object.entries(V)){ fs.writeFileSync(`${OUT}/${k}.svg`,svg); await sharp(Buffer.from(svg),{density:144}).png().toFile(`${OUT}/${k}.png`); }
  // Preview sheet
  const tile=async(k,w)=>sharp(`${OUT}/${k}.png`).resize({width:w}).toBuffer();
  const sheet=sharp({create:{width:1600,height:1180,channels:4,background:'#FAF8F3'}});
  const dark=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="560"><rect width="1600" height="560" fill="#1B1B19"/></svg>`);
  const lbl=(t,x,y,c)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="700" height="40"><text x="0" y="28" font-family="Segoe UI, Arial" font-size="22" font-weight="700" fill="${c}" letter-spacing="3">${t}</text></svg>`);
  await sheet.composite([
    {input:lbl('BUYER  ·  STHIVA',0,0,'#8C8A84'),left:60,top:30},
    {input:await tile('sthiva-logo',820),left:40,top:80},
    {input:await tile('sthiva-app-icon',220),left:960,top:90},
    {input:await tile('sthiva-app-icon',96),left:1210,top:150},
    {input:await tile('sthiva-app-icon',48),left:1330,top:174},
    {input:dark,left:0,top:620},
    {input:lbl('SELLER  ·  STHIVA PARTNER',0,0,'#8C8A84'),left:60,top:650},
    {input:await tile('sthiva-partner-logo',820),left:40,top:700},
    {input:await tile('sthiva-partner-app-icon',220),left:960,top:710},
    {input:await tile('sthiva-partner-app-icon',96),left:1210,top:770},
    {input:await tile('sthiva-partner-app-icon',48),left:1330,top:794},
    {input:await tile('sthiva-logo-on-dark',600),left:60,top:980},
  ]).png().toFile(`${OUT}/preview.png`);
  console.log('ok');
})();
// Path data for the code (wordmarks at baseline y=0, x=0)
const w1=textPath('Geist_700Bold.ttf','STHIVA',100,0.16,0,0);
const w2=textPath('Geist_600SemiBold.ttf','PARTNER',100,0.36,0,0);
fs.writeFileSync(`${OUT}/brand-paths.json`, JSON.stringify({ hex: HEX, curve: CURVE, left: LEFT,
  sthiva: { d: w1.d, width: +w1.width.toFixed(2), capHeight: +w1.capH.toFixed(2) },
  partner: { d: w2.d, width: +w2.width.toFixed(2), capHeight: +w2.capH.toFixed(2) } }, null, 1));
