import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-space-grotesk',
});
const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'BuildX — Construction Materials Marketplace',
    template: '%s | BuildX',
  },
  description: 'Browse construction materials and check delivery to your site, by PIN code.',
  robots: { index: false, follow: false }, // prototype — keep search engines out for now
};

export const viewport: Viewport = {
  themeColor: '#705d00',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${spaceGrotesk.variable} ${inter.variable}`}>
      <head>
        {/* Icon font: thick-stroke, sharp-cornered — the design system explicitly forbids generic icon sets */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface text-on-surface min-h-screen pb-32 font-body antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
