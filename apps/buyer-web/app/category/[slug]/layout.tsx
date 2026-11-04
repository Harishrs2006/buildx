import type { Metadata } from 'next';
import { catalogCategory } from '@buildx/web-core';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = catalogCategory(slug);
  if (!category) return { title: 'Materials' };
  return {
    title: category.name,
    description: `${category.tagline} Compare listings from verified suppliers and check delivery to your PIN code.`,
    alternates: { canonical: `/category/${slug}` },
  };
}

export default function CategoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
