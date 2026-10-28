'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '../lib/cart';

const TABS = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/search', label: 'Search', icon: 'search' },
  { href: '/cart', label: 'Cart', icon: 'shopping_bag' },
  { href: '/orders', label: 'Orders', icon: 'receipt_long' },
  { href: '/profile', label: 'Account', icon: 'person' },
] as const;

// Mobile-only tab bar (the same five tabs the mobile app uses). Hidden from md up, where the
// header carries navigation. Renders its own spacer so page content never sits underneath it.
export function BottomNav() {
  const pathname = usePathname();
  const cart = useCart();
  const cartCount = cart?.items.reduce((n, i) => n + i.quantity, 0) ?? 0;

  return (
    <>
      <div className="h-24 md:hidden" aria-hidden="true" />
      <nav
        aria-label="Tabs"
        className="fixed inset-x-3 bottom-3 z-50 flex items-center justify-between rounded-[22px] bg-ink/95 px-2 py-2 shadow-[0_18px_50px_-12px_rgba(11,12,10,0.55)] backdrop-blur-xl md:hidden"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        {TABS.map((tab) => {
          const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl transition-colors duration-300 ${
                active ? 'bg-lime text-ink' : 'text-sand/60 hover:text-sand'
              }`}
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                aria-hidden="true"
              >
                {tab.icon}
              </span>
              <span className="text-[10px] font-semibold tracking-wide">{tab.label}</span>
              {tab.href === '/cart' && cartCount > 0 && (
                <span className="absolute right-[18%] top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-signal-red px-1 font-mono text-[9px] font-semibold text-white">
                  {cartCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
