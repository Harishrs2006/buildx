import Link from 'next/link';
import type { ProductSummary } from '@buildx/web-core';

type ProductExtras = {
  images?: { url: string; isPrimary?: boolean }[];
  supplierId?: { businessName?: string };
  deliveryDays?: number;
  avgRating?: number;
  totalReviews?: number;
};

const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

function deliveryLabel(days?: number): string {
  if (days === undefined) return 'Varies';
  if (days <= 1) return 'Within 24h';
  if (days < 7) return `${days} Days`;
  return `${Math.round(days / 7)} Weeks`;
}

export function ProductListCard({ product }: { product: ProductSummary }) {
  const extra = product as ProductSummary & ProductExtras;
  const image = extra.images?.find((i) => i.isPrimary) ?? extra.images?.[0];
  const topRated = (extra.avgRating ?? 0) >= 4.5 && (extra.totalReviews ?? 0) > 0;

  return (
    <div className="bg-surface-container-lowest rounded-xl overflow-hidden flex flex-col group">
      <div className="relative aspect-square overflow-hidden bg-surface-container-low">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-on-surface-variant text-sm font-body">No image</div>
        )}
        {topRated && (
          <span className="absolute top-3 left-3 bg-primary-container text-on-primary-container px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest rounded">
            Top Rated
          </span>
        )}
      </div>
      <div className="p-6 flex-1 flex flex-col">
        <h3 className="text-xl font-bold tracking-tight text-on-surface mb-1 font-headline">{product.name}</h3>
        {extra.supplierId?.businessName && (
          <p className="text-on-surface-variant text-sm mb-4 font-body">Supplier: {extra.supplierId.businessName}</p>
        )}
        <div className="mt-auto space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-outline font-body">Price</p>
              <p className="text-xl font-black text-on-surface font-headline">
                {rupees.format(product.basePrice)}/{product.unit.toLowerCase()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold tracking-widest text-outline font-body">Delivery</p>
              <p className="text-sm font-bold text-on-surface font-body">{deliveryLabel(extra.deliveryDays)}</p>
            </div>
          </div>
          <Link
            href={`/product/${product._id}`}
            className="block text-center w-full px-6 py-3 bg-primary text-on-primary font-black text-sm rounded-lg active:scale-95 transition-all"
          >
            VIEW DETAILS
          </Link>
        </div>
      </div>
    </div>
  );
}
