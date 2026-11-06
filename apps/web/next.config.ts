import path from 'node:path';
import type { NextConfig } from 'next';
import { iconNames, iconStylesheetUrl, selfHostIcons } from '../../packages/web-core/icons/icon-names.mjs';

// Icon font: only the icons this site uses, served from the site itself (packages/web-core/icons)
const ICON_AXES = 'wght,FILL@100..700,0..1';
const ICON_NAMES = iconNames(process.cwd());
const ICON_CACHE = { source: '/fonts/:file', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] };

const nextConfig: NextConfig = {
  // Self-hosted builds (deploy/vultr) run as a small Node server; Vercel ignores this unless STANDALONE=1
  ...(process.env.STANDALONE === '1' ? { output: 'standalone' as const, outputFileTracingRoot: path.join(process.cwd(), '../..') } : {}),
  async headers() {
    return [ICON_CACHE];
  },
  // @sthiva/web-core ships TypeScript source, not a compiled package — Next must transpile it
  transpilePackages: ['@sthiva/web-core'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },
};

export default async function config(): Promise<NextConfig> {
  const css = await selfHostIcons(process.cwd(), ICON_AXES, ICON_NAMES);
  return {
    ...nextConfig,
    env: { ICON_CSS: css, ICON_STYLESHEET: iconStylesheetUrl(ICON_AXES, ICON_NAMES), ICON_FONT: css.match(/\/fonts\/icons-[^)]+/)?.[0] ?? '' },
  };
}
