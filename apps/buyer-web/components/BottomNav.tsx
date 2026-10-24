'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '../lib/cart';

const TABS = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/cart', label: 'Cart', icon: 'shopping_cart' },
  { href: '/orders', label: 'Orders', icon: 'receipt_long' },
  { href: '/profile', label: 'Profile', icon: 'person' },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const cart = useCart();
  const cartCount = cart?.items.reduce((n, i) => n + i.quantity, 0) ?? 0;

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_-4px_24px_rgba(0,0,0,0.05)]">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              active
                ? 'relative flex flex-col items-center justify-center bg-primary-container text-on-primary-container rounded-lg px-6 py-2 transition-all duration-200'
                : 'relative flex flex-col items-center justify-center text-on-surface-variant px-6 py-2 hover:text-primary transition-colors'
            }
          >
            <span className="material-symbols-outlined" style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}>
              {tab.icon}
            </span>
            {tab.href === '/cart' && cartCount > 0 && (
              <span className="absolute top-0 right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 font-body text-[9px] font-bold text-on-error">
                {cartCount}
              </span>
            )}
            <span className="font-body text-[10px] font-semibold uppercase tracking-widest mt-1">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
