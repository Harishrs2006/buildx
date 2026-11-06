import path from 'node:path';
import type { NextConfig } from 'next';
import { iconNames, iconStylesheetUrl, selfHostIcons } from '../../packages/web-core/icons/icon-names.mjs';

// Security headers for every response. A strict Content-Security-Policy is deliberately not set
// yet: Firebase phone auth loads reCAPTCHA scripts and frames from several Google domains, and a
// wrong CSP silently breaks sign-in. Add one only with an end-to-end OTP test.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), payment=(), geolocation=(self)' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
];

const FIREBASE_HOST = 'buildx-15494.firebaseapp.com';

// Icon font: only the icons this site uses, served from the site itself (packages/web-core/icons)
const ICON_AXES = 'opsz,wght,FILL,GRAD@20..48,300..600,0..1,0';
const ICON_NAMES = iconNames(process.cwd());
const ICON_CACHE = { source: '/fonts/:file', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] };

const nextConfig: NextConfig = {
  // Self-hosted builds (deploy/vultr) run as a small Node server; Vercel ignores this unless STANDALONE=1
  ...(process.env.STANDALONE === '1' ? { output: 'standalone' as const, outputFileTracingRoot: path.join(process.cwd(), '../..') } : {}),
  devIndicators: false,
  // @sthiva/web-core ships TypeScript source, not a compiled package, so Next must transpile it
  transpilePackages: ['@sthiva/web-core'],
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    // AVIF first (about a third smaller than WebP on photos), WebP for browsers without it
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },
  async headers() {
    return [
      // Everything except Firebase's sign-in pages, which must be framed by this same site
      { source: '/((?!__/).*)', headers: securityHeaders },
      ICON_CACHE,
      { source: '/__/:path*', headers: securityHeaders.map((h) => (h.key === 'X-Frame-Options' ? { ...h, value: 'SAMEORIGIN' } : h)) },
    ];
  },
  // Google sign-in runs from this site's own address (lib/firebase.ts authDomainFor)
  async rewrites() {
    return [{ source: '/__/:path*', destination: `https://${FIREBASE_HOST}/__/:path*` }];
  },
};

export default async function config(): Promise<NextConfig> {
  const css = await selfHostIcons(process.cwd(), ICON_AXES, ICON_NAMES);
  return {
    ...nextConfig,
    env: { ICON_CSS: css, ICON_STYLESHEET: iconStylesheetUrl(ICON_AXES, ICON_NAMES), ICON_FONT: css.match(/\/fonts\/icons-[^)]+/)?.[0] ?? '' },
  };
}
