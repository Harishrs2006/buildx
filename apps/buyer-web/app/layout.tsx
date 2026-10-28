import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Geist, Geist_Mono, Instrument_Serif } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { SITE } from '@/lib/site';

// All four families are SIL Open Font License, self-hosted by next/font at build time.
const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});
const sans = Geist({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });
const serif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: 'BuildX | Construction materials, delivered to your site',
    template: '%s | BuildX',
  },
  description: SITE.description,
  applicationName: 'BuildX',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'BuildX',
    title: 'BuildX | Construction materials, delivered to your site',
    description: SITE.description,
    url: '/',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BuildX | Construction materials, delivered to your site',
    description: SITE.description,
  },
  // Pre-launch: stays out of search results until NEXT_PUBLIC_ALLOW_INDEXING=true is set.
  robots: SITE.allowIndexing ? { index: true, follow: true } : { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#0B0C0A',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en-IN"
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} ${mono.variable} ${serif.variable}`}
    >
      <head>
        {/* Marks the document as JS-enabled before paint so scroll reveals never hide content without JS */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,300..600,0..1,0&display=block"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'BuildX',
              url: SITE.url,
              logo: `${SITE.url}/icon.svg`,
              description: SITE.description,
              areaServed: 'IN',
            }),
          }}
        />
      </head>
      <body className="min-h-screen">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-lime focus:px-4 focus:py-2 focus:text-ink"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
