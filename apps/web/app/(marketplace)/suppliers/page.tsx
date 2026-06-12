import Link from 'next/link';
import { Star, MapPin, Package } from 'lucide-react';
import { Suspense } from 'react';
import { SearchBar } from '@/components/features/search/SearchBar';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Verified Suppliers | BuildX' };

interface PageProps {
  searchParams: Promise<{ search?: string; page?: string }>;
}

async function fetchSuppliers(params: Record<string, string>) {
  try {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/suppliers?${qs}`, { next: { revalidate: 300 } });
    if (!res.ok) return { suppliers: [], meta: null };
    const json = await res.json();
    return { suppliers: json.data ?? [], meta: json.meta ?? null };
  } catch { return { suppliers: [], meta: null }; }
}

export default async function SuppliersPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const { suppliers, meta } = await fetchSuppliers({ page: sp.page ?? '1', ...(sp.search && { search: sp.search }) });

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-6">
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Verified Suppliers</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {meta?.total ?? 0} verified suppliers across India
          </p>
        </div>
        <Suspense>
          <SearchBar placeholder="Search suppliers by name or location..." />
        </Suspense>
      </div>

      {suppliers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {suppliers.map((s: any) => (
            <Link
              key={s.id}
              href={`/suppliers/${s.id}`}
              className="group p-5 rounded-2xl border border-border bg-card hover:border-orange-300 hover:shadow-sm transition-all space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0 text-xl font-bold text-muted-foreground">
                  {s.businessName[0]}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground group-hover:text-orange-600 transition-colors truncate">
                    {s.businessName}
                  </h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs text-muted-foreground">
                      {s.avgRating?.toFixed(1)} ({s.totalReviews} reviews)
                    </span>
                  </div>
                </div>
              </div>

              {s.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{s.description}</p>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
                <span className="flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  {s._count?.products ?? 0} products
                </span>
                {s.serviceAreas?.length > 0 && (
                  <span className="flex items-center gap-1 truncate max-w-[60%]">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {s.serviceAreas.slice(0, 2).join(', ')}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center text-muted-foreground">No suppliers found.</div>
      )}
    </div>
  );
}
