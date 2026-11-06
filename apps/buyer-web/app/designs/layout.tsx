import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Interior designs: kitchens, wardrobes, ceilings, tiles',
  description: 'Modular kitchens, wardrobes, false ceilings and tile looks from verified local suppliers. Pick a design and ask for a quote for your site.',
  alternates: { canonical: '/designs' },
};

export default function DesignsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
