import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // @sthiva/web-core ships TypeScript source, not a compiled package — Next must transpile it
  transpilePackages: ['@sthiva/web-core'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },
  // Google sign-in runs from this site's own address (lib/firebase.ts authDomainFor)
  async rewrites() {
    return [{ source: '/__/:path*', destination: 'https://buildx-15494.firebaseapp.com/__/:path*' }];
  },
};

export default nextConfig;
