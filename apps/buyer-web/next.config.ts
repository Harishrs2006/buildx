import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // @buildx/web-core ships TypeScript source, not a compiled package — Next must transpile it
  transpilePackages: ['@buildx/web-core'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },
};

export default nextConfig;
