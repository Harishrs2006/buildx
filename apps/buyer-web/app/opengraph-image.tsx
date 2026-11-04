import { ImageResponse } from 'next/og';

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
          <svg width="64" height="64" viewBox="0 0 1536 1536">
            <rect width="1536" height="1536" rx="340" fill="#F3B806" />
            <path d="M1128 318 H588 A270 270 0 0 0 588 858 H741 V678 H588 A90 90 0 0 1 588 498 H1128 Z" fill="#1B1B19" />
            <path d="M796 678 H948 A270 270 0 0 1 948 1218 H408 V1038 H948 A90 90 0 0 0 948 858 H796 Z" fill="#FBFAF6" />
          </svg>
          <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: -2 }}>Sthiva</span>
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
