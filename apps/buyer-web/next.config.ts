import path from 'node:path';
import type { NextConfig } from 'next';

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

const nextConfig: NextConfig = {
  // Self-hosted builds (deploy/vultr) run as a small Node server; Vercel ignores this unless STANDALONE=1
  ...(process.env.STANDALONE === '1' ? { output: 'standalone' as const, outputFileTracingRoot: path.join(process.cwd(), '../..') } : {}),
  devIndicators: false,
  // @sthiva/web-core ships TypeScript source, not a compiled package, so Next must transpile it
  transpilePackages: ['@sthiva/web-core'],
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },
  async headers() {
    return [
      // Everything except Firebase's sign-in pages, which must be framed by this same site
      { source: '/((?!__/).*)', headers: securityHeaders },
      { source: '/__/:path*', headers: securityHeaders.map((h) => (h.key === 'X-Frame-Options' ? { ...h, value: 'SAMEORIGIN' } : h)) },
    ];
  },
  // Google sign-in runs from this site's own address (lib/firebase.ts authDomainFor)
  async rewrites() {
    return [{ source: '/__/:path*', destination: `https://${FIREBASE_HOST}/__/:path*` }];
  },
};

export default nextConfig;
