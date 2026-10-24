'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSelectedLocation, validatePincode } from '@buildx/web-core';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { ProductGallery } from '@/components/ProductGallery';
import { useProduct } from '@/lib/products';
import { useSupplierReviews } from '@/lib/reviews';
import { addToCart } from '@/lib/cart';

const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const relativeDate = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

function timeAgo(iso: string): string {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days < 30) return relativeDate.format(-days, 'day');
  if (days < 365) return relativeDate.format(-Math.round(days / 30), 'month');
  return relativeDate.format(-Math.round(days / 365), 'year');
}

function bestBulkPrice(base: number, tiers: { minQty: number; price: number }[] | undefined, qty: number) {
  if (!tiers?.length) return base;
  const applicable = tiers.filter((t) => qty >= t.minQty).sort((a, b) => b.minQty - a.minQty)[0];
  return applicable ? applicable.price : base;
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const remembered = useSelectedLocation();
  const [pincodeInput, setPincodeInput] = useState(remembered?.pincode ?? '');
  const [checkedPincode, setCheckedPincode] = useState<string | null>(remembered?.pincode ?? null);
  const [pincodeError, setPincodeError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [cartNotice, setCartNotice] = useState<string | null>(null);

  const product = useProduct(id, checkedPincode);
  const supplierId = product.status === 'success' ? product.data.supplierId?._id : undefined;
  const reviews = useSupplierReviews(supplierId);

  const data = product.status === 'success' ? product.data : undefined;
  const unitPrice = useMemo(
    () => (data ? bestBulkPrice(data.basePrice, data.bulkPricing, quantity) : 0),
    [data, quantity]
  );
  const bestTier = data?.bulkPricing?.slice().sort((a, b) => a.minQty - b.minQty)[0];

  function checkPincode() {
    const v = validatePincode(pincodeInput);
    if (!v.valid) {
      setPincodeError(v.message);
      return;
    }
    setPincodeError(null);
    setCheckedPincode(v.pincode);
  }

  function handleAddToCart() {
    if (!data) return;
    const result = addToCart(data.supplierId?._id ?? 'unknown', data.supplierId?.businessName ?? 'Supplier', {
      productId: data._id,
      name: data.name,
      imageUrl: data.images?.find((img) => img.isPrimary)?.url ?? data.images?.[0]?.url,
      unit: data.unit,
      basePrice: unitPrice,
      quantity,
      minOrderQuantity: data.minOrderQuantity ?? 1,
    });
    setCartNotice(
      result === 'replaced'
        ? `Your cart had items from another supplier, so it was replaced with ${data.name}.`
        : `Added ${quantity} ${data.unit.toLowerCase()} to cart.`
    );
  }

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 md:px-8 pt-24 pb-32">
        {product.status === 'loading' && <p className="text-on-surface-variant font-body py-12 text-center">Loading product…</p>}
        {product.status === 'error' && (
          <p className="text-error font-body py-12 text-center">Couldn't load this product. It may no longer be listed.</p>
        )}

        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-7">
              <ProductGallery
                images={data.images ?? []}
                badges={data.supplierId?.verificationStatus === 'VERIFIED' ? ['Verified Supplier'] : undefined}
              />
            </div>

            <div className="lg:col-span-5 flex flex-col gap-8">
              <div>
                {data.categoryId?.name && (
                  <span className="text-primary font-bold tracking-widest text-sm uppercase font-body">{data.categoryId.name}</span>
                )}
                <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mt-2 leading-tight font-headline">{data.name}</h1>
                <div className="flex items-center gap-4 mt-4">
                  {(data.totalReviews ?? 0) > 0 && (
                    <div className="flex items-center gap-1 bg-surface-container-high px-3 py-1 rounded-full">
                      <span className="material-symbols-outlined text-sm text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                        star
                      </span>
                      <span className="font-bold text-sm font-body">{data.avgRating?.toFixed(1)}</span>
                      <span className="text-outline text-xs ml-1 font-body">({data.totalReviews} reviews)</span>
                    </div>
                  )}
                  {data.supplierId?.verificationStatus === 'VERIFIED' && (
                    <span className="text-tertiary font-medium text-sm flex items-center gap-1 font-body">
                      <span className="material-symbols-outlined text-sm">verified</span> Verified Supplier
                    </span>
                  )}
                </div>
              </div>

              {/* Pricing */}
              <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border-l-4 border-primary">
                <div className="flex justify-between items-baseline">
                  <div>
                    <span className="text-4xl font-bold tracking-tighter font-headline">{rupees.format(data.basePrice)}</span>
                    <span className="text-outline text-lg ml-1 font-body">/{data.unit.toLowerCase()}</span>
                  </div>
                  {bestTier && (
                    <div className="text-right">
                      <span className="block text-xs font-bold uppercase text-primary tracking-widest font-body">Bulk Offer</span>
                      <span className="text-xl font-bold font-headline">
                        {rupees.format(bestTier.price)}
                        <span className="text-sm font-normal">/{data.unit.toLowerCase()}</span>
                      </span>
                      <span className="block text-[10px] text-outline font-body">for orders ≥{bestTier.minQty}{data.unit.toLowerCase()}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-outline-variant/30 flex items-center justify-between text-sm font-body">
                  <div className="flex items-center gap-2 text-tertiary">
                    <span className="material-symbols-outlined text-lg">
                      {(data.stockQuantity ?? 0) > 0 ? 'check_circle' : 'cancel'}
                    </span>
                    <span className="font-medium">
                      {(data.stockQuantity ?? 0) > 0 ? 'In Stock' : 'Out of Stock'}
                      {data.deliveryDays !== undefined ? ` · ${data.deliveryDays <= 1 ? 'Fast Delivery' : `${data.deliveryDays} day delivery`}` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Delivery check */}
              <div className="bg-surface-container-low rounded-xl p-6">
                <h3 className="text-sm font-bold uppercase tracking-widest mb-4 font-body">Delivery Options</h3>
                <div className="flex gap-2">
                  <div className="relative flex-grow">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-sm">location_on</span>
                    <input
                      className="w-full pl-10 pr-4 py-3 rounded-lg border-none bg-surface-container-high focus:ring-2 focus:ring-primary text-sm font-body"
                      placeholder="Enter Pincode"
                      value={pincodeInput}
                      onChange={(e) => setPincodeInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && checkPincode()}
                    />
                  </div>
                  <button onClick={checkPincode} className="bg-on-surface text-on-primary px-6 py-3 rounded-lg font-bold text-sm transition-transform active:scale-95">
                    Check
                  </button>
                </div>
                {pincodeError && <p className="text-error text-xs mt-2 font-body">{pincodeError}</p>}
                {checkedPincode && data.availability && (
                  <div className="mt-6 flex items-center gap-3">
                    <div
                      className={
                        data.availability.deliverable
                          ? 'w-8 h-8 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary'
                          : 'w-8 h-8 rounded-full bg-error/10 flex items-center justify-center text-error'
                      }
                    >
                      <span className="material-symbols-outlined text-[18px]">{data.availability.deliverable ? 'local_shipping' : 'block'}</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-none font-body">
                        {data.availability.deliverable ? `Delivering to ${checkedPincode}` : `Not deliverable to ${checkedPincode}`}
                      </p>
                      {!data.availability.deliverable && data.availability.reason && (
                        <p className="text-[10px] text-outline font-body">{data.availability.reason.replaceAll('_', ' ').toLowerCase()}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Quantity + estimate */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-widest text-xs font-body">Quantity ({data.unit.toLowerCase()})</span>
                  <div className="flex items-center bg-surface-container-high rounded-lg p-1">
                    <button
                      onClick={() => setQuantity((q) => Math.max(data.minOrderQuantity ?? 1, q - 1))}
                      className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-surface-variant transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <span className="material-symbols-outlined">remove</span>
                    </button>
                    <span className="w-16 text-center font-bold font-body">{quantity}</span>
                    <button
                      onClick={() => setQuantity((q) => q + 1)}
                      className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-surface-variant transition-colors"
                      aria-label="Increase quantity"
                    >
                      <span className="material-symbols-outlined">add</span>
                    </button>
                  </div>
                </div>
                {data.minOrderQuantity && data.minOrderQuantity > 1 && (
                  <p className="text-xs text-outline font-body">Minimum order: {data.minOrderQuantity} {data.unit.toLowerCase()}</p>
                )}
                <div className="flex justify-between items-center py-4 border-y border-outline-variant/20">
                  <span className="text-outline text-sm font-body">Estimated Total</span>
                  <span className="text-2xl font-bold tracking-tight font-headline">{rupees.format(unitPrice * quantity)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={(data.stockQuantity ?? 0) <= 0}
                  className="bg-primary text-on-primary py-5 rounded-xl font-bold tracking-tighter flex items-center justify-center gap-2 transition-transform active:scale-95 font-headline disabled:opacity-50"
                >
                  <span className="material-symbols-outlined">add_shopping_cart</span>
                  ADD TO CART
                </button>
                {cartNotice && (
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-high px-4 py-3">
                    <p className="text-sm font-body text-on-surface">{cartNotice}</p>
                    <Link href="/cart" className="shrink-0 font-bold text-primary text-sm font-body">
                      View cart
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {data && (
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 bg-surface-container-lowest p-8 rounded-2xl flex flex-col items-center text-center border-l-4 border-primary">
              <div className="w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center text-3xl font-bold text-on-surface-variant font-headline">
                {data.supplierId?.businessName?.[0] ?? '?'}
              </div>
              <h3 className="text-xl font-bold tracking-tight mt-4 font-headline">{data.supplierId?.businessName ?? 'Unknown supplier'}</h3>
              {(data.totalReviews ?? 0) > 0 && (
                <div className="mt-4 flex gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span
                      key={i}
                      className="material-symbols-outlined text-primary"
                      style={{ fontVariationSettings: i < Math.round(data.avgRating ?? 0) ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      star
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="md:col-span-2 bg-surface-container-low p-8 rounded-2xl flex flex-col justify-between">
              <h3 className="text-2xl font-bold tracking-tight mb-6 font-headline">Customer Reviews</h3>
              {reviews.status === 'loading' && <p className="text-on-surface-variant font-body">Loading reviews…</p>}
              {reviews.status === 'error' && <p className="text-error font-body">Couldn't load reviews.</p>}
              {reviews.status === 'success' && reviews.data.length === 0 && (
                <p className="text-on-surface-variant font-body">No reviews yet.</p>
              )}
              {reviews.status === 'success' && reviews.data.length > 0 && (
                <div className="space-y-8">
                  {reviews.data.map((r) => (
                    <div key={r._id} className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-outline-variant/30 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex justify-between w-full">
                          <h4 className="font-bold text-sm font-body">{r.reviewerId?.name ?? 'Buyer'}</h4>
                          <span className="text-[10px] text-outline uppercase font-bold font-body">{timeAgo(r.createdAt)}</span>
                        </div>
                        <div className="flex gap-0.5 my-1">
                          {Array.from({ length: 5 }, (_, i) => (
                            <span
                              key={i}
                              className="material-symbols-outlined text-xs text-primary"
                              style={{ fontVariationSettings: i < r.rating ? "'FILL' 1" : "'FILL' 0" }}
                            >
                              star
                            </span>
                          ))}
                        </div>
                        {r.comment && <p className="text-sm text-on-surface-variant font-body">{r.comment}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <Link href="/" className="inline-block mt-12 text-primary font-bold font-body">
          ← Back to categories
        </Link>
      </main>
      <BottomNav />
    </>
  );
}
