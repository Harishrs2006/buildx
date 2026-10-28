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

const nextConfig: NextConfig = {
  // @buildx/web-core ships TypeScript source, not a compiled package, so Next must transpile it
  transpilePackages: ['@buildx/web-core'],
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
