import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ProductCard } from '@/components/features/products/ProductCard';
import { ProductFilters } from '@/components/features/products/ProductFilters';
import { Pagination } from '@/components/shared/Pagination';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sortBy?: string; minPrice?: string; maxPrice?: string }>;
}

async function fetchCategory(slug: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/categories/${slug}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return (await res.json()).data;
  } catch { return null; }
}

async function fetchProducts(slug: string, params: Record<string, string>) {
  try {
    const qs = new URLSearchParams({ categorySlug: slug, ...params }).toString();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/products?${qs}`, { next: { revalidate: 60 } });
    if (!res.ok) return { products: [], meta: null };
    const json = await res.json();
    return { products: json.data ?? [], meta: json.meta ?? null };
  } catch { return { products: [], meta: null }; }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cat = await fetchCategory(slug);
  if (!cat) return { title: 'Category not found' };
  return { title: `${cat.name} | BuildX`, description: cat.description };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const [category, { products, meta }] = await Promise.all([
    fetchCategory(slug),
    fetchProducts(slug, { page: sp.page ?? '1', ...(sp.sortBy && { sortBy: sp.sortBy }), limit: '24' }),
  ]);

  if (!category) notFound();

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{category.name}</h1>
        {category.description && (
          <p className="text-muted-foreground text-sm mt-1">{category.description}</p>
        )}
        {meta && <p className="text-xs text-muted-foreground mt-1">{meta.total} products</p>}
      </div>

      <Suspense><ProductFilters /></Suspense>

      {products.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {products.map((p: any) => <ProductCard key={p.id} product={p} />)}
          </div>
          <Suspense>
            <Pagination page={Number(sp.page ?? 1)} totalPages={Math.ceil((meta?.total ?? 0) / 24)} />
          </Suspense>
        </>
      ) : (
        <div className="py-24 text-center text-muted-foreground">
          No products in this category yet.
        </div>
      )}
    </div>
  );
}
