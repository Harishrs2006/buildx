import { ImageResponse } from 'next/og';

export const alt = 'BuildX: construction materials, delivered to your site';
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
          <svg width="64" height="64" viewBox="0 0 48 48">
            <rect width="48" height="48" rx="12" fill="#1D1F1A" />
            <path d="M13 11h7.5l15 26H28z" fill="#F2EFE7" />
            <path d="M35 11h-7.5l-15 26H20z" fill="#C8FF3D" />
          </svg>
          <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: -2 }}>BuildX</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 104, fontWeight: 800, lineHeight: 0.95, letterSpacing: -5 }}>Build with materials</span>
          <span style={{ fontSize: 104, fontWeight: 800, lineHeight: 0.95, letterSpacing: -5, color: '#C8FF3D' }}>you can trust.</span>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 26, color: 'rgba(242,239,231,0.7)' }}>
          <span>Verified suppliers</span>
          <span style={{ color: '#C8FF3D' }}>/</span>
          <span>Delivery checked by PIN</span>
          <span style={{ color: '#C8FF3D' }}>/</span>
          <span>Cash on delivery</span>
        </div>
      </div>
    ),
    size
  );
}
