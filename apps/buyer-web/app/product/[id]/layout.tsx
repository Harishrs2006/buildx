import type { Metadata } from 'next';
import { fetchProductMeta } from '@/lib/server-api';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchProductMeta(id);
  if (!product) return { title: 'Product' };
  const category = product.categoryId?.name;
  return {
    title: product.name,
    description: product.description?.slice(0, 160) ?? `${product.name}${category ? `, ${category}` : ''} on Sthiva.`,
    alternates: { canonical: `/product/${id}` },
  };
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return children;
}
