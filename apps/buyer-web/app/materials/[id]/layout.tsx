import type { Metadata } from 'next';
import { catalogItem } from '@buildx/web-core';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const item = catalogItem(id);
  if (!item) return { title: 'Material' };
  return {
    title: `${item.name}: sizes, uses and how it is sold`,
    description: item.summary,
    alternates: { canonical: `/materials/${id}` },
  };
}

export default function MaterialLayout({ children }: { children: React.ReactNode }) {
  return children;
}
