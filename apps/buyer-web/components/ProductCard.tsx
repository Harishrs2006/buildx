import type { ProductSummary } from '@buildx/web-core';

// productSummarySchema only guarantees _id/name/unit/basePrice (.passthrough()) — the API
// returns more (images, category, supplier), but it's optional here, not validated.
type ProductExtras = {
  images?: { url: string; isPrimary?: boolean }[];
  categoryId?: { name?: string };
  supplierId?: { businessName?: string; avgRating?: number };
};

const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export function ProductCard({ product }: { product: ProductSummary }) {
  const extra = product as ProductSummary & ProductExtras;
  const image = extra.images?.find((i) => i.isPrimary) ?? extra.images?.[0];

  return (
    <div className="group rounded-lg border border-border bg-card overflow-hidden flex flex-col">
      <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="text-muted-foreground text-sm">No image</span>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1 flex-1">
        {extra.categoryId?.name && (
          <span className="text-xs text-muted-foreground">{extra.categoryId.name}</span>
        )}
        <h3 className="font-medium text-sm leading-snug line-clamp-2">{product.name}</h3>
        {extra.supplierId?.businessName && (
          <span className="text-xs text-muted-foreground">{extra.supplierId.businessName}</span>
        )}
        <div className="mt-auto pt-2 flex items-baseline gap-1">
          <span className="font-semibold text-foreground">{rupees.format(product.basePrice)}</span>
          <span className="text-xs text-muted-foreground">/ {product.unit}</span>
        </div>
      </div>
    </div>
  );
}
