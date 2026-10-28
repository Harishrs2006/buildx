'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApiClient, useSelectedLocation } from '@buildx/web-core';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { useAuth } from '@/components/auth/AuthProvider';
import { useCart, clearCart } from '@/lib/cart';
import { quoteCart, placeOrder, type Quote } from '@/lib/orders';

const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

function CheckoutForm() {
  const client = useApiClient();
  const { user } = useAuth();
  const cart = useCart();
  const location = useSelectedLocation();
  const router = useRouter();

  const [quote, setQuote] = useState<{ status: 'loading' } | { status: 'success'; data: Quote } | { status: 'error'; message: string }>({ status: 'loading' });
  const [label, setLabel] = useState('Home');
  const [fullAddress, setFullAddress] = useState('');
  const [contactPhone, setContactPhone] = useState(user?.phone.replace(/\D/g, '').slice(-10) ?? '');
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);

  const items = useMemo(() => cart?.items.map((i) => ({ productId: i.productId, quantity: i.quantity })) ?? [], [cart]);

  useEffect(() => {
    if (!cart || cart.items.length === 0) return;
    let cancelled = false;
    setQuote({ status: 'loading' });
    quoteCart(client, items, location?.pincode)
      .then((data) => { if (!cancelled) setQuote({ status: 'success', data }); })
      .catch((err) => {
        if (cancelled) return;
        setQuote({ status: 'error', message: err instanceof Error ? err.message : 'Could not price your cart' });
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, JSON.stringify(items), location?.pincode]);

  if (!cart || cart.items.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="font-body text-on-surface-variant">Your cart is empty.</p>
      </div>
    );
  }

  async function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault();
    if (quote.status !== 'success') return;
    setPlaceError(null);
    setPlacing(true);
    try {
      const result = await placeOrder(
        client,
        {
          items,
          deliveryAddress: { label, fullAddress, pincode: location?.pincode, contactPhone },
          expectedTotal: quote.data.total,
        },
        idempotencyKey
      );
      clearCart();
      router.push(`/orders/${result.orderId}`);
    } catch (err) {
      setPlaceError(err instanceof Error ? err.message : 'Could not place the order. Please try again.');
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="flex flex-col gap-8 md:flex-row">
      <form onSubmit={handlePlaceOrder} className="flex flex-1 flex-col gap-4">
        <h2 className="font-headline text-xl font-bold">Delivery address</h2>
        <label className="flex flex-col gap-1.5">
          <span className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Label</span>
          <input
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Home, Site, Office…"
            className="rounded-lg bg-surface-container-high px-4 py-3 font-body text-sm text-on-surface outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Full address</span>
          <textarea
            required
            rows={3}
            value={fullAddress}
            onChange={(e) => setFullAddress(e.target.value)}
            placeholder="House/plot no., street, area, city"
            className="rounded-lg bg-surface-container-high px-4 py-3 font-body text-sm text-on-surface outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Contact number</span>
          <div className="flex items-center rounded-lg bg-surface-container-high px-4">
            <span className="font-body text-sm text-on-surface-variant">+91</span>
            <input
              required
              type="tel"
              inputMode="numeric"
              pattern="[6-9][0-9]{9}"
              maxLength={10}
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-transparent py-3 pl-2 font-body text-sm text-on-surface outline-none"
            />
          </div>
        </label>
        {location?.pincode && (
          <p className="font-body text-xs text-on-surface-variant">Delivering to PIN {location.pincode} ({location.label}).</p>
        )}

        <div className="rounded-lg bg-surface-container-high px-4 py-3">
          <span className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Payment method</span>
          <p className="mt-1 flex items-center gap-2 font-body text-sm text-on-surface">
            <span className="material-symbols-outlined text-lg">payments</span>
            Cash on delivery: pay when it arrives
          </p>
        </div>

        {placeError && <p className="font-body text-sm text-error">{placeError}</p>}

        <button
          type="submit"
          disabled={placing || quote.status !== 'success' || fullAddress.trim().length < 5 || contactPhone.length !== 10}
          className="mt-2 rounded-xl bg-primary py-4 font-headline font-bold uppercase tracking-wide text-on-primary disabled:opacity-50"
        >
          {placing ? 'Placing order…' : quote.status === 'success' ? `Place order · ${rupees.format(quote.data.total)}` : 'Place order'}
        </button>
      </form>

      <div className="w-full flex-shrink-0 rounded-xl bg-surface-container-low p-6 md:w-80">
        <h2 className="font-headline text-lg font-bold">Order summary</h2>
        {quote.status === 'loading' && <p className="mt-4 font-body text-sm text-on-surface-variant">Pricing your cart…</p>}
        {quote.status === 'error' && <p className="mt-4 font-body text-sm text-error">{quote.message}</p>}
        {quote.status === 'success' && (
          <div className="mt-4 flex flex-col gap-3">
            {quote.data.items.map((item) => (
              <div key={item.productId} className="flex items-center justify-between font-body text-sm">
                <span className="text-on-surface-variant">
                  {item.quantity} {item.unit.toLowerCase()} × {item.name}
                  {!item.inStock && <span className="ml-2 text-error">(only {item.stockQuantity} left)</span>}
                </span>
                <span className="font-semibold text-on-surface">{rupees.format(item.lineTotal)}</span>
              </div>
            ))}
            <div className="mt-2 flex flex-col gap-1 border-t border-outline-variant/30 pt-3 font-body text-sm">
              <div className="flex justify-between"><span className="text-on-surface-variant">Subtotal</span><span>{rupees.format(quote.data.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">GST</span><span>{rupees.format(quote.data.gstAmount)}</span></div>
              <div className="flex justify-between font-headline text-base font-bold"><span>Total</span><span>{rupees.format(quote.data.total)}</span></div>
            </div>
            {quote.data.delivery && !quote.data.delivery.serviceable && (
              <p className="font-body text-sm text-error">This supplier doesn't deliver to your selected PIN code.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 pb-32 pt-24 md:px-8">
        <h1 className="font-headline text-3xl font-bold tracking-tighter">Checkout</h1>
        <div className="mt-6">
          <RequireAuth>
            <CheckoutForm />
          </RequireAuth>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
