// Site-wide constants. Business details come from env so nothing unverified is hardcoded:
// a field that is not configured is simply not shown.
export const SITE = {
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buildx-vgud.vercel.app',
  description:
    'BuildX is a construction materials marketplace. Browse cement, steel, sand, bricks and more from verified suppliers, check delivery to your PIN code, and pay cash on delivery.',
  allowIndexing: process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true',
  sellerPortalUrl: process.env.NEXT_PUBLIC_SELLER_PORTAL_URL,
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
  supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE,
  legalName: process.env.NEXT_PUBLIC_LEGAL_NAME ?? 'BuildX',
  city: 'Tumakuru, Karnataka, India',
  legalUpdated: '28 October 2026',
} as const;
