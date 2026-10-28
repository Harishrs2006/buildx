import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  if (!SITE.allowIndexing) {
    // Pre-launch: keep crawlers out until NEXT_PUBLIC_ALLOW_INDEXING=true
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/cart', '/checkout', '/orders', '/profile', '/onboard'] },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
