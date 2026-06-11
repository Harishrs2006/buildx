import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'BuildX — Construction Materials Marketplace',
    template: '%s | BuildX',
  },
  description:
    'India\'s leading B2B marketplace for construction materials. Source cement, steel, bricks, and more directly from verified suppliers.',
  keywords: ['construction materials', 'B2B marketplace', 'cement', 'steel', 'building materials'],
  authors: [{ name: 'BuildX' }],
  openGraph: {
    type: 'website',
    siteName: 'BuildX',
    title: 'BuildX — Construction Materials Marketplace',
    description: 'India\'s leading B2B marketplace for construction materials.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#f97316',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="min-h-screen bg-background antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
