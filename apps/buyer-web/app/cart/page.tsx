'use client';

import Link from 'next/link';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { EmptyState, PageHead, SummaryRow } from '@/components/account/AccountUI';
import { useCart, setCartQuantity, removeFromCart } from '@/lib/cart';
import { illustrationFor } from '@/lib/illustrations';
import { rupees } from '@/lib/format';

export default function CartPage() {
  const cart = useCart();
  const items = cart?.items ?? [];
  const estimatedTotal = items.reduce((sum, i) => sum + i.basePrice * i.quantity, 0);

  return (
    <>
      <Header />
      <main id="main" className="container-x min-h-[70vh] pb-32 pt-[calc(var(--header-h)+40px)]">
        <PageHead eyebrow="Cart" title="Your" accent="order">
          {items.length > 0 && (
            <p className="text-[15px] text-stone">
              {items.length} item{items.length > 1 ? 's' : ''} from <span className="font-semibold text-ink">{cart?.supplierName}</span>
            </p>
          )}
        </PageHead>

        {items.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              icon="shopping_cart"
              title="Your cart is empty"
              body="Pick a category, choose a supplier that delivers to your site, and add what you need."
              cta={{ href: '/#categories', label: 'Browse materials' }}
            />
          </div>
        ) : (
          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
            <ul className="flex flex-col gap-3">
              {items.map((item) => {
                const atMin = item.quantity <= item.minOrderQuantity;
                return (
                  <li key={item.productId} className="card flex gap-4 p-3 sm:p-4">
                    <Link
                      href={`/product/${item.productId}`}
                      className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-sand-3 sm:h-28 sm:w-28"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.imageUrl ?? illustrationFor(item.name)}
                        alt={item.imageUrl ? item.name : ''}
                        className="h-full w-full object-cover"
                      />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link href={`/product/${item.productId}`} className="line-clamp-2 text-[16px] font-semibold leading-snug hover:underline">
                            {item.name}
                          </Link>
                          <p className="mt-1 text-[14px] text-stone">
                            {rupees.format(item.basePrice)} / {item.unit.toLowerCase()}
                          </p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="-mr-1 -mt-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-stone transition-colors hover:bg-error-container hover:text-error"
                          aria-label={`Remove ${item.name}`}
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center rounded-full border border-sand-4 bg-sand">
                          <button
                            onClick={() => setCartQuantity(item.productId, Math.max(item.minOrderQuantity, item.quantity - 1))}
                            disabled={atMin}
                            className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-sand-3 disabled:opacity-30"
                            aria-label={`Decrease quantity of ${item.name}`}
                          >
                            <span className="material-symbols-outlined text-[18px]">remove</span>
                          </button>
                          <span className="min-w-[3ch] text-center font-mono text-[15px] font-medium tabular-nums" aria-live="polite">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => setCartQuantity(item.productId, item.quantity + 1)}
                            className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-sand-3"
                            aria-label={`Increase quantity of ${item.name}`}
                          >
                            <span className="material-symbols-outlined text-[18px]">add</span>
                          </button>
                        </div>
                        <span className="font-display text-lg font-bold tabular-nums">{rupees.format(item.basePrice * item.quantity)}</span>
                      </div>
                      {atMin && item.minOrderQuantity > 1 && (
                        <p className="text-[13px] text-stone">Minimum order: {item.minOrderQuantity} {item.unit.toLowerCase()}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            <aside className="lg:sticky lg:top-[calc(var(--header-h)+24px)] lg:self-start">
              <div className="overflow-hidden rounded-3xl bg-ink p-6 text-sand">
                <p className="eyebrow text-stone-light">Summary</p>
                <div className="mt-5">
                  <SummaryRow onDark label="Items (list price)" value={rupees.format(estimatedTotal)} />
                </div>
                <p className="mt-4 border-t border-white/10 pt-4 text-[14px] leading-relaxed text-stone-light">
                  GST, delivery and any bulk prices are calculated at checkout, before you place the order.
                </p>
                <Link href="/checkout" className="btn-lime mt-6 w-full py-4 text-[16px]">
                  Continue to checkout
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">arrow_forward</span>
                </Link>
                <p className="mt-4 flex items-center justify-center gap-1.5 text-[13px] text-stone-light">
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">payments</span>
                  Cash on delivery
                </p>
              </div>
              <Link href="/#categories" className="mt-4 flex items-center justify-center gap-1 text-[14px] font-medium text-stone hover:text-ink">
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>
                Add more materials
              </Link>
            </aside>
          </div>
        )}
      </main>
      <BottomNav />
    </>
  );
}
