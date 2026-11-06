import type { MetadataRoute } from 'next';

// Internal tool for signed-in users only: keep every crawler out (pages also send noindex)
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } };
}
