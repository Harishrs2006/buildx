import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Geist, Geist_Mono, Instrument_Serif } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

// Same type system as the storefront (apps/buyer-web): all SIL Open Font License, self-hosted by next/font
const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const sans = Geist({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });
const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--font-serif', display: 'swap' });

export const metadata: Metadata = {
  title: {
    default: 'Sthiva operations',
    template: '%s | Sthiva operations',
  },
  description: 'Internal console for the Sthiva operations team.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#0B0C0A',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable} ${mono.variable} ${serif.variable}`}>
      <head>
        {/* Icon font: the used icons only, self-hosted at build time; Google's stylesheet if that failed */}
        {process.env.ICON_CSS ? (
          <>
            <link rel="preload" href={process.env.ICON_FONT} as="font" type="font/woff2" crossOrigin="" />
            <style dangerouslySetInnerHTML={{ __html: process.env.ICON_CSS }} />
          </>
        ) : (
          <link href={process.env.ICON_STYLESHEET} rel="stylesheet" />
        )}
      </head>
      <body className="min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
