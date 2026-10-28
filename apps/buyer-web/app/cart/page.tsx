'use client';

import Link from 'next/link';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useCart, setCartQuantity, removeFromCart } from '@/lib/cart';

const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

export default function CartPage() {
  const cart = useCart();
  const estimatedTotal = cart?.items.reduce((sum, i) => sum + i.basePrice * i.quantity, 0) ?? 0;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-32 pt-24 md:px-8">
        <h1 className="font-headline text-3xl font-bold tracking-tighter">Your cart</h1>

        {!cart || cart.items.length === 0 ? (
          <div className="py-24 text-center">
            <p className="font-body text-on-surface-variant">Your cart is empty.</p>
            <Link href="/" className="mt-4 inline-block font-body font-bold text-primary">
              Browse categories
            </Link>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-6">
            <p className="font-body text-sm text-on-surface-variant">From {cart.supplierName}</p>

            <div className="flex flex-col gap-3">
              {cart.items.map((item) => (
                <div key={item.productId} className="flex items-center gap-4 rounded-xl bg-surface-container-low p-4">
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-surface-container-high">
                    {item.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-body text-sm font-semibold text-on-surface">{item.name}</p>
                    <p className="font-body text-xs text-on-surface-variant">
                      {rupees.format(item.basePrice)}/{item.unit.toLowerCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 rounded-lg bg-surface-container-high p-1">
                    <button
                      onClick={() => setCartQuantity(item.productId, Math.max(item.minOrderQuantity, item.quantity - 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-surface-variant"
                      aria-label="Decrease quantity"
                    >
                      <span className="material-symbols-outlined text-lg">remove</span>
                    </button>
                    <span className="w-8 text-center font-body text-sm font-bold">{item.quantity}</span>
                    <button
                      onClick={() => setCartQuantity(item.productId, item.quantity + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-surface-variant"
                      aria-label="Increase quantity"
                    >
                      <span className="material-symbols-outlined text-lg">add</span>
                    </button>
                  </div>
                  <button onClick={() => removeFromCart(item.productId)} className="p-2 text-on-surface-variant hover:text-error" aria-label="Remove">
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-outline-variant/30 pt-4">
              <span className="font-body text-sm text-on-surface-variant">Estimated total (before GST/delivery)</span>
              <span className="font-headline text-xl font-bold">{rupees.format(estimatedTotal)}</span>
            </div>

            <Link
              href="/checkout"
              className="rounded-xl bg-primary py-4 text-center font-headline font-bold uppercase tracking-wide text-on-primary"
            >
              Proceed to checkout
            </Link>
          </div>
        )}
      </main>
      <BottomNav />
    </>
  );
}
