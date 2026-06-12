import Link from 'next/link';
import Image from 'next/image';
import { Package } from 'lucide-react';
import { StarRating } from '@/components/shared/StarRating';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    shortDescription?: string | null;
    basePrice: number | string;
    unit: string;
    avgRating: number;
    totalReviews: number;
    images: Array<{ url: string; altText?: string | null }>;
    category: { name: string; slug: string };
    supplier: { businessName: string };
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const image = product.images[0];
  const price = Number(product.basePrice);

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col rounded-2xl border border-border bg-card overflow-hidden hover:shadow-md hover:border-orange-200 dark:hover:border-orange-900 transition-all"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {image ? (
          <Image
            src={image.url}
            alt={image.altText ?? product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className="text-xs bg-white/90 dark:bg-black/70 text-foreground px-2 py-0.5 rounded-full font-medium">
            {product.category.name}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <p className="text-xs text-muted-foreground truncate">{product.supplier.businessName}</p>
        <h3 className="font-semibold text-foreground text-sm leading-snug line-clamp-2 group-hover:text-orange-600 transition-colors">
          {product.name}
        </h3>

        <div className="mt-auto pt-2 flex items-end justify-between">
          <div>
            <p className="text-lg font-bold text-foreground">
              ₹{price.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-muted-foreground">per {product.unit.toLowerCase()}</p>
          </div>
          <StarRating rating={product.avgRating} count={product.totalReviews} />
        </div>
      </div>
    </Link>
  );
}
