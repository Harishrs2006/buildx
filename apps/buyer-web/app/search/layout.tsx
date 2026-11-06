import type { Metadata } from 'next';

// Search result pages change with every query: keep them out of search engines (links are still followed)
export const metadata: Metadata = {
  title: 'Search',
  robots: { index: false, follow: true },
  alternates: { canonical: '/search' },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
