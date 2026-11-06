import type { Metadata } from 'next';
import { catalogItem } from '@sthiva/web-core';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const item = catalogItem(id);
  if (!item) return { title: 'Material' };
  return {
    title: `${item.name}: sizes, uses and how it is sold`,
    description: materialDescription(item.summary),
    alternates: { canonical: `/materials/${id}` },
  };
}

// Catalog summaries are one short line; search engines show about 160 characters, so add what the page covers
const DESCRIPTION_TAIL = ' Common sizes, uses and how it is sold, from verified suppliers that deliver to your PIN code.';
function materialDescription(summary: string): string {
  return (summary + DESCRIPTION_TAIL).length <= 160 ? summary + DESCRIPTION_TAIL : summary;
}

export default function MaterialLayout({ children }: { children: React.ReactNode }) {
  return children;
}
