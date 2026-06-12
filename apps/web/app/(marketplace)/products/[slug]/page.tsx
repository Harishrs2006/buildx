import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Star, Package, ShieldCheck, ArrowRight } from 'lucide-react';
import { StarRating } from '@/components/shared/StarRating';
import { ProductCard } from '@/components/features/products/ProductCard';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function fetchProduct(slug: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/products/${slug}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch { return null; }
}

async function fetchRelated(slug: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/products/${slug}/related`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch { return []; }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  if (!product) return { title: 'Product not found' };
  return {
    title: product.name,
    description: product.shortDescription ?? product.description?.slice(0, 160),
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [product, related] = await Promise.all([fetchProduct(slug), fetchRelated(slug)]);
  if (!product) notFound();

  const primaryImage = product.images?.find((i: any) => i.isPrimary) ?? product.images?.[0];
  const price = Number(product.basePrice);
  const inStock = (product.inventory?.quantity ?? 0) - (product.inventory?.reservedQuantity ?? 0) > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link href="/products" className="hover:text-foreground">Products</Link>
        <span>/</span>
        <Link href={`/categories/${product.category.slug}`} className="hover:text-foreground">
          {product.category.name}
        </Link>
        <span>/</span>
        <span className="text-foreground truncate max-w-xs">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16">
        {/* Images */}
        <div className="space-y-3">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
            {primaryImage ? (
              <Image src={primaryImage.url} alt={primaryImage.altText ?? product.name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-16 h-16 text-muted-foreground/30" />
              </div>
            )}
          </div>
          {product.images?.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {product.images.slice(0, 5).map((img: any) => (
                <div key={img.id} className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0 border border-border">
                  <Image src={img.url} alt={img.altText ?? ''} fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div>
            <Link href={`/categories/${product.category.slug}`}
              className="text-sm text-orange-500 hover:text-orange-600 font-medium">
              {product.category.name}
            </Link>
            <h1 className="text-2xl font-bold text-foreground mt-1">{product.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">SKU: {product.sku}</p>
          </div>

          <div className="flex items-center gap-3">
            <StarRating rating={product.avgRating} count={product.totalReviews} />
            <span className="text-sm text-muted-foreground">·</span>
            <span className="text-sm text-muted-foreground">{product.totalSold} sold</span>
          </div>

          <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-1">
            <p className="text-3xl font-bold text-foreground">
              ₹{price.toLocaleString('en-IN')}
            </p>
            <p className="text-sm text-muted-foreground">
              per {product.unit.toLowerCase()} · Min. order: {product.minOrderQuantity}
            </p>
            <p className={`text-sm font-medium mt-2 ${inStock ? 'text-green-600' : 'text-red-500'}`}>
              {inStock ? '✓ In Stock' : '✗ Out of Stock'}
            </p>
          </div>

          {/* Supplier */}
          <div className="flex items-start gap-3 p-4 rounded-xl border border-border">
            <ShieldCheck className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{product.supplier.businessName}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="text-xs text-muted-foreground">
                  {product.supplier.avgRating?.toFixed(1)} · Verified Supplier
                </span>
              </div>
              {product.supplier.serviceAreas?.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {product.supplier.serviceAreas.slice(0, 3).join(', ')}
                </p>
              )}
            </div>
            <Link href={`/suppliers/${product.supplier.id}`}
              className="ml-auto text-xs text-orange-500 hover:text-orange-600 shrink-0">
              View →
            </Link>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Link
              href={`/dashboard/cart?add=${product.id}`}
              className="flex-1 h-11 inline-flex items-center justify-center rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors"
            >
              Add to Cart
            </Link>
            <Link
              href={`/dashboard/quotes/new?product=${product.id}`}
              className="flex-1 h-11 inline-flex items-center justify-center rounded-xl border border-border hover:bg-muted font-medium transition-colors"
            >
              Request Quote
            </Link>
          </div>
        </div>
      </div>

      {/* Description & Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Product Description</h2>
          <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
            {product.description}
          </p>
        </div>
        {product.specifications && Object.keys(product.specifications).length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Specifications</h2>
            <div className="rounded-xl border border-border overflow-hidden">
              {Object.entries(product.specifications).map(([key, val], i) => (
                <div key={key} className={`flex px-4 py-2.5 text-sm ${i % 2 === 0 ? 'bg-muted/40' : ''}`}>
                  <span className="text-muted-foreground w-1/2">{key}</span>
                  <span className="font-medium text-foreground w-1/2">{String(val)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reviews */}
      {product.reviews?.length > 0 && (
        <div className="mb-16 space-y-4">
          <h2 className="text-lg font-semibold">Customer Reviews</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {product.reviews.map((review: any) => (
              <div key={review.id} className="p-4 rounded-xl border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {review.user.firstName} {review.user.lastName}
                  </p>
                  <StarRating rating={review.rating} />
                </div>
                {review.title && <p className="text-sm font-medium text-foreground">{review.title}</p>}
                <p className="text-sm text-muted-foreground">{review.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related products */}
      {related.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Related Products</h2>
            <Link href={`/categories/${product.category.slug}`}
              className="text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1">
              See all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {related.map((p: any) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}
    </div>
  );
}
