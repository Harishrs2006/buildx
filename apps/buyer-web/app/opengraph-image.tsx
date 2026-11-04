import { ImageResponse } from 'next/og';
import { MARK, BRAND_COLORS } from '@sthiva/web-core/src/brand/paths';

// The Sthiva mark as an image (the OG renderer draws SVG masks only inside images)
const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK.viewBox}"><defs><mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="1536" height="1536"><polygon points="${MARK.hex}" fill="#fff" stroke="#fff" stroke-width="${MARK.cornerRound}" stroke-linejoin="round"/><path d="${MARK.curve}" fill="none" stroke="#000" stroke-width="${MARK.gap}"/></mask></defs><g mask="url(#m)"><rect width="1536" height="1536" fill="${BRAND_COLORS.yellow}"/><path d="${MARK.left}" fill="${BRAND_COLORS.white}"/></g></svg>`;
const MARK_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(MARK_SVG)}`;

export const alt = 'Sthiva: construction materials, delivered to your site';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0B0C0A',
          color: '#F2EFE7',
          padding: 72,
          fontFamily: 'sans-serif',
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MARK_DATA_URI} width={64} height={64} alt="" />
          <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: 8 }}>STHIVA</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 104, fontWeight: 800, lineHeight: 0.95, letterSpacing: -5 }}>Build with materials</span>
          <span style={{ fontSize: 104, fontWeight: 800, lineHeight: 0.95, letterSpacing: -5, color: '#F3B806' }}>you can trust.</span>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 26, color: 'rgba(242,239,231,0.7)' }}>
          <span>Verified suppliers</span>
          <span style={{ color: '#F3B806' }}>/</span>
          <span>Delivery checked by PIN</span>
          <span style={{ color: '#F3B806' }}>/</span>
          <span>Cash on delivery</span>
        </div>
      </div>
    ),
    size
  );
}
