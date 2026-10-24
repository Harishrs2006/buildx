'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/orders', label: 'Orders', icon: 'receipt_long' },
  { href: '/profile', label: 'Profile', icon: 'person' },
] as const;

export function BottomNav() {
  const pathname = usePathname();

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
                ? 'flex flex-col items-center justify-center bg-primary-container text-on-primary-container rounded-lg px-6 py-2 transition-all duration-200'
                : 'flex flex-col items-center justify-center text-on-surface-variant px-6 py-2 hover:text-primary transition-colors'
            }
          >
            <span className="material-symbols-outlined" style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}>
              {tab.icon}
            </span>
            <span className="font-body text-[10px] font-semibold uppercase tracking-widest mt-1">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
