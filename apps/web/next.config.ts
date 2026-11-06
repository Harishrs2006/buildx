import path from 'node:path';
import type { NextConfig } from 'next';
import { iconNames } from '../../packages/web-core/icons/icon-names.mjs';

const nextConfig: NextConfig = {
  // Self-hosted builds (deploy/vultr) run as a small Node server; Vercel ignores this unless STANDALONE=1
  ...(process.env.STANDALONE === '1' ? { output: 'standalone' as const, outputFileTracingRoot: path.join(process.cwd(), '../..') } : {}),
  // @sthiva/web-core ships TypeScript source, not a compiled package — Next must transpile it
  transpilePackages: ['@sthiva/web-core'],
  // Only the icons this site uses are downloaded (see packages/web-core/icons/icon-names.mjs)
  env: { ICON_NAMES: iconNames(process.cwd()) },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },
};

export default nextConfig;
