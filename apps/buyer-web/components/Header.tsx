'use client';

import Link from 'next/link';
import { useCart } from '../lib/cart';

export function Header() {
  const cart = useCart();
  const cartCount = cart?.items.reduce((n, i) => n + i.quantity, 0) ?? 0;

  return (
    <header className="fixed top-0 left-0 w-full flex items-center justify-between px-6 py-4 bg-surface-bright/80 backdrop-blur-lg z-50">
      <div className="flex items-center gap-4">
        <span className="text-2xl font-bold tracking-tighter text-on-surface font-headline uppercase">BuildX</span>
      </div>
      <div className="flex-1 max-w-md mx-6 hidden md:block">
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-xl">search</span>
          <input
            className="w-full pl-10 pr-4 py-2 bg-surface-container-high border-none rounded-lg focus:ring-2 focus:ring-primary-container text-sm font-body"
            placeholder="Search materials, tools..."
            type="text"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button
          className="p-2 rounded-full hover:bg-surface-container-high transition-colors active:scale-95 duration-150 md:hidden"
          aria-label="Search"
        >
          <span className="material-symbols-outlined text-on-surface">search</span>
        </button>
        <button className="p-2 rounded-full hover:bg-surface-container-high transition-colors active:scale-95 duration-150" aria-label="Filters">
          <span className="material-symbols-outlined text-on-surface">tune</span>
        </button>
        <Link
          href="/cart"
          className="relative p-2 rounded-full hover:bg-surface-container-high transition-colors active:scale-95 duration-150"
          aria-label="Cart"
        >
          <span className="material-symbols-outlined text-on-surface">shopping_cart</span>
          {cartCount > 0 && (
            <span className="absolute top-0 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 font-body text-[9px] font-bold text-on-error">
              {cartCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
