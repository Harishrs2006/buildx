import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Globe, Calendar, Package, Star } from 'lucide-react';
import { StarRating } from '@/components/shared/StarRating';
import { ProductCard } from '@/components/features/products/ProductCard';
import type { Metadata } from 'next';

interface PageProps { params: Promise<{ id: string }> }

async function fetchSupplier(id: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/suppliers/${id}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return (await res.json()).data;
  } catch { return null; }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const s = await fetchSupplier(id);
  if (!s) return { title: 'Supplier not found' };
  return { title: `${s.businessName} | BuildX Suppliers` };
}

export default async function SupplierPage({ params }: PageProps) {
  const { id } = await params;
  const supplier = await fetchSupplier(id);
  if (!supplier) notFound();

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-6 mb-10 p-6 rounded-2xl border border-border bg-card">
        <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center text-3xl font-bold text-muted-foreground shrink-0">
          {supplier.logoUrl ? (
            <Image src={supplier.logoUrl} alt={supplier.businessName} width={80} height={80} className="rounded-2xl object-cover" />
          ) : supplier.businessName[0]}
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{supplier.businessName}</h1>
              <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                Verified
              </span>
            </div>
            <StarRating rating={supplier.avgRating} count={supplier.totalReviews} />
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {supplier.serviceAreas?.length > 0 && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {supplier.serviceAreas.join(', ')}
              </span>
            )}
            {supplier.website && (
              <a href={supplier.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-orange-500 transition-colors">
                <Globe className="w-4 h-4" /> Website
              </a>
            )}
            {supplier.establishedYear && (
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" /> Est. {supplier.establishedYear}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Package className="w-4 h-4" /> {supplier._count?.products ?? 0} products
            </span>
          </div>

          {supplier.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{supplier.description}</p>
          )}
        </div>

        <div className="shrink-0">
          <Link
            href={`/dashboard/quotes/new?supplier=${supplier.id}`}
            className="h-10 px-5 inline-flex items-center rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors"
          >
            Request Quote
          </Link>
        </div>
      </div>

      {/* Products */}
      {supplier.products?.length > 0 && (
        <div className="mb-12 space-y-4">
          <h2 className="text-lg font-semibold">Products by {supplier.businessName}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {supplier.products.map((p: any) => <ProductCard key={p.id} product={{ ...p, supplier: { businessName: supplier.businessName } }} />)}
          </div>
        </div>
      )}

      {/* Reviews */}
      {supplier.reviews?.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Customer Reviews</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {supplier.reviews.map((review: any) => (
              <div key={review.id} className="p-4 rounded-xl border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{review.user.firstName} {review.user.lastName}</p>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-3 h-3 ${s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted'}`} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{review.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
