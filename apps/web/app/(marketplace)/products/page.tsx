import { Suspense } from 'react';
import { SearchBar } from '@/components/features/search/SearchBar';
import { ProductFilters } from '@/components/features/products/ProductFilters';
import { ProductCard } from '@/components/features/products/ProductCard';
import { Pagination } from '@/components/shared/Pagination';
import { Package } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{
    search?: string;
    categorySlug?: string;
    page?: string;
    sortBy?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
}

async function fetchProducts(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/products?${qs}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return { products: [], meta: null };
    const json = await res.json();
    return { products: json.data ?? [], meta: json.meta ?? null };
  } catch {
    return { products: [], meta: null };
  }
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { products, meta } = await fetchProducts({
    ...(params.search && { search: params.search }),
    ...(params.categorySlug && { categorySlug: params.categorySlug }),
    ...(params.sortBy && { sortBy: params.sortBy }),
    ...(params.minPrice && { minPrice: params.minPrice }),
    ...(params.maxPrice && { maxPrice: params.maxPrice }),
    page: params.page ?? '1',
    limit: '24',
  });

  const totalPages = meta ? Math.ceil(meta.total / meta.limit) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">All Products</h1>
          {meta && (
            <p className="text-muted-foreground text-sm mt-1">
              {meta.total.toLocaleString('en-IN')} products available
            </p>
          )}
        </div>
        <Suspense>
          <SearchBar />
        </Suspense>
        <Suspense>
          <ProductFilters />
        </Suspense>
      </div>

      {/* Grid */}
      {products.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {products.map((p: any) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          <Suspense>
            <Pagination page={Number(params.page ?? 1)} totalPages={totalPages} />
          </Suspense>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 space-y-3 text-center">
          <Package className="w-12 h-12 text-muted-foreground/40" />
          <p className="font-medium text-foreground">No products found</p>
          <p className="text-sm text-muted-foreground">
            {params.search ? `No results for "${params.search}"` : 'Check back soon — suppliers are adding products.'}
          </p>
        </div>
      )}
    </div>
  );
}
