import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // @sthiva/web-core ships TypeScript source, not a compiled package — Next must transpile it
  transpilePackages: ['@sthiva/web-core'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },
};

export default nextConfig;
